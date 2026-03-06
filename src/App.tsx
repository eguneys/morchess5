import { createAsync } from "@solidjs/router"
import { Chessboard } from "./components/Chessboard"
import Editor from "./components/Editor"
import { TauProvider, useTau } from "./state/prolog"
import { createEffect, createMemo, For, onCleanup, Show } from "solid-js"
import { createStore } from "solid-js/store"
import type { DrawShape } from "@lichess-org/chessground/draw"
import type { Key } from "@lichess-org/chessground/types"
import { SquareSet } from "../../hopefox/dist/src/distill/squareSet"
import { EMPTY_FEN, fen_pos, makeFen, makeSan, parseSquare, parseUci, square } from "hopefox"
import { makePersisted } from "@solid-primitives/storage"
import type { Piece } from "../../hopefox/dist/src/distill/types"
import { Scripts } from "./worker/prolog_scripts"
import { useWorker, WorkerProvider } from "./worker/Worker2"
import type { Puzzle } from "./worker/fixture"
import type { PuzzleResult } from "./worker/worker_job"

function App() {

  return <>
    <WorkerProvider>
      <TauProvider>
        <Home />
      </TauProvider>
    </WorkerProvider>
  </>
}

const Program_Header = `
% -- Header -- % 
:- dynamic(green/1).
:- dynamic(red/1).
:- dynamic(history/1).
`
const Program_Scripts = `
% -- Scripts -- %
${Scripts}
`

const Program_Load = `
% -- Load -- %
`

type PuzzleId = string

type State = {
  program: string
  selected_puzzle: SelectedPuzzleInfo | undefined
  run_on_one: PuzzleResult | undefined
}

type FEN = string
type Move = any
type SelectedPuzzleInfo = {
  id: PuzzleId
  fen: FEN
  i_cursor: number
  puzzle: Puzzle
  last_move: Move
  solution: string
}

type PersistedState = {
  selected_puzzle: SelectedPuzzleInfo | undefined
}

function Home() {

  const [worker, { one }] = useWorker()


  const [state, set_state] = createStore<State>({
    program: '',
    selected_puzzle: undefined,
    get run_on_one() {
      return worker.run_on_one
    }
  })

  const [persisted_state, set_persisted_state] = makePersisted(createStore<PersistedState>({
    selected_puzzle: undefined
  }), { name: 'morchess5.v1' })

  function load_state() {
    set_state('selected_puzzle', persisted_state.selected_puzzle)
  }
  function save_state() {
    set_persisted_state('selected_puzzle', state.selected_puzzle)
  }

  const run_on_one_puzzle = () => {
    if (state.selected_puzzle === undefined) {
      return
    }
    one(state.selected_puzzle.id, Full_program(), Queries, state.selected_puzzle.i_cursor)
  }

  let [, { query } ] = useTau()

  const Full_program = createMemo(() => `
${Program_Header} 
${Program_Scripts}
${state.program}
${Program_Load}
`)

  const Queries = {
    Z_pieces: 'piece_at(root, X, Y, Z).',
    Ls_moves: 'history(Ls).',
    X_green: 'green(X).',
    X_red: 'red(X).',
  }

  const queries = createAsync(() => query(Full_program(), { QQ: `load_fen('${state.selected_puzzle?.fen??EMPTY_FEN}').`, ...Queries}))


  const history = createMemo(() => {
    let qq = queries()

    if (!qq) {
      return []
    }

    let { moves } = qq

    let res = []

    let pos = fen_pos(fen())

    for (let move of moves) {
      let m = move.match(/move\(([a-h][1-8]),([a-h][1-8])\)/)
      if (!m) {

        return []
      }
      let uci = `${m[1]}${m[2]}`

      let san = makeSan(pos, parseUci(uci)!)
      res.push(san)
    }

    return res
  })


  const fen = createMemo(() => {
    let qq = queries()

    if (!qq) {
      return EMPTY_FEN
    }

    let { pieces } = qq


    let pos = fen_pos(EMPTY_FEN)

    for (let p_str of pieces) {

      let [square, role, color] = p_str.split(' ')

      let piece: Piece = { color, role } as Piece
      pos.board.set(parseSquare(square)!, piece)
    }
    
    return makeFen(pos.toSetup())
  })

  const shapes = createMemo(() => {
    let res: DrawShape[] = []

    let qq = queries()

    if (!qq) {
      return []
    }

    let { green } = qq

    let ss = green
    if (ss) {
      for (let s of ss) {
        if (is_key(s)) {
          res.push({ orig: s, brush: 'green'})
        }
      }
    }

    let { red } = qq

    if (red) {
      for (let s of red) {
        if (is_key(s)) {
          res.push({ orig: s, brush: 'red'})
        }
      }
    }

    return res
  })


  const selected_puzzle = createMemo(() => {
    if (worker.list !== undefined) {
      load_state()
      if (state.selected_puzzle === undefined || !worker.list.find(_ => _.id === state.selected_puzzle!.id)) {
        let puzzle = worker.list[0]
        set_state('selected_puzzle', {
          id: puzzle.id,
          puzzle: puzzle,
          i_cursor: 0,
          fen: puzzle.move_fens[0],
          last_move: parseUci(puzzle.moves.split(' ')[0]),
          solution: puzzle.sans.join(' ')
        })
        save_state()
      }
      run_on_one_puzzle()
    }
    return worker.list?.find(_ => _.id === state.selected_puzzle?.id)
  })


  const on_puzzle_selected = (puzzle: Puzzle) => {
    set_state('selected_puzzle', {
      id: puzzle.id,
      puzzle: puzzle,
      i_cursor: 0,
      fen: puzzle.move_fens[0],
      last_move: parseUci(puzzle.moves.split(' ')[0]),
      solution: puzzle.sans.join(' ')
    })
    save_state()
    run_on_one_puzzle()
  }


  const on_program_changed = (text: string) => {
    set_state('program', text)
    run_on_one_puzzle()
  }



  const on_keydown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        go_next()
        break
      case 'ArrowLeft':
        go_prev()
        break
      case 'ArrowDown':
        next_puzzle()
        break
      case 'ArrowUp':
        prev_puzzle()
        break
      default:
        return
    }
    e.preventDefault()
  }

  document.addEventListener('keydown', on_keydown)
  onCleanup(() => {
    document.removeEventListener('keydown', on_keydown)
  })

  const next_puzzle = () => {
    if (worker.list === undefined) {
      return
    }
    let i = worker.list.findIndex(_ => _.id === selected_puzzle()?.id)
    if (i > -1) {
      on_puzzle_selected(worker.list[(i + 1 + worker.list.length) % worker.list.length])
    }
  }

  const prev_puzzle = () => {
    if (worker.list === undefined) {
      return
    }
    let i = worker.list.findIndex(_ => _.id === selected_puzzle()?.id)
    if (i > -1) {
      on_puzzle_selected(worker.list[(i - 1 + worker.list.length) % worker.list.length])
    }
  }



  return (<>
    <div class='flex flex-row h-screen bg-slate-500'>
      <div class='flex-2 editor-wrap overflow-hidden'>
        <Editor text={state.program} on_save_text={on_program_changed}/>
      </div>
      <div class='flex-1 moves-wrap'>
        <Show when={selected_puzzle()?.id}>{id =>
          <PuzzleList selected={id()} on_select_puzzle={on_puzzle_selected} />
        }</Show>
      </div>
      <div class='flex flex-col flex-1'>
        <div class='flex-1 moves-wrap'>
          <Moves history={history()}/>
        </div>
        <div class='pb-6 board-wrap'>
          <Chessboard fen={fen()} shapes={shapes()} />
        </div>
      </div>
    </div>
  </>)
}


export default App

const Square_Names: Key[] = []
for (let sq of SquareSet.full()) {
  Square_Names.push(square(sq) as Key)
}

const is_key = (a: string): a is Key => {
  return Square_Names.indexOf(a as Key) !== -1
}


function Moves(props: { history: string[] }) {
  return (<>
    <div class='flex flex-col h-full'>
      <h3 class='text-4xl font-bold text-center text-lime-200'>Moves</h3>
      <div class='moves text-2xl bg-gray-700 p-2 flex-1'>
        <For each={props.history}>{(item, i) =>
          <>
            <div class='py-0.5 px-2 m-0.5 bg-gray-600 rounded-sm text-lime-50 inline-block'>
              <Show when={i() % 2 === 0}><span class='px-1'>{i() / 2 + 1}.</span></Show>
              {item}
            </div>

          </>
        }
        </For>
      </div>
    </div>
  </>)
}

function PuzzleList(props: { selected: PuzzleId, on_select_puzzle: (p: Puzzle) => void }) {

  let [state] = useWorker()

  return (<>
  <div class='flex flex-col overflow-y-scroll max-h-50'>
    <For each={state.list}>{ (p, i) => 
        <PuzzleItem n={i() + 1} selected={props.selected === p.id} puzzle={p} on_click={() => props.on_select_puzzle(p)} />
    }</For>
  </div>
  </>)
}

function PuzzleItem(props: { n: number, selected: boolean, puzzle: Puzzle, on_click: () => void }) {

  createEffect(() => {
    if (props.selected) {
      $el.scrollIntoView({block: 'nearest'})
    }
  })

  let $el!: HTMLDivElement

  return (<>
    <div ref={$el} onClick={props.on_click} class={`flex items-center px-1 py-1 ${props.selected ? 'bg-amber-200' : 'bg-slate-400'} hover:bg-gray-200 cursor-pointer`}>
      <div class='text-sm font-bold ml-0.5 mr-2'>{props.n}.</div>
      <div><a class='text-blue-800' href={props.puzzle.link} target="_blank">{props.puzzle.id}</a></div>
      <div class='flex-2'></div>
      <div class='text-xs flex-1'>{props.puzzle.tags}</div>
    </div>
  </>)
}