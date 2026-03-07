import { Chessboard } from "./components/Chessboard"
import Editor from "./components/Editor"
import { createEffect, createMemo, ErrorBoundary, For, Show, Suspense } from "solid-js"
import { createStore } from "solid-js/store"
import type { DrawShape } from "@lichess-org/chessground/draw"
import type { Key } from "@lichess-org/chessground/types"
import { EMPTY_FEN, fen_pos, makeFen, makeSan, parseSquare, parseUci, square } from "hopefox"
import { makePersisted } from "@solid-primitives/storage"
import { ApiProvider, useApi } from "./state/api"
import { type Piece, SquareSet } from "hopefox"
import { PuzzleList, type PuzzleId } from "./components/PuzzleList"
import { is_api_error, type ApiError, type ApiSuccess } from "./state/api_agent"
import type { Puzzle } from "./state/puzzle_fixture"

function App() {
  return <>
      <ApiProvider>
        <Home />
      </ApiProvider>
  </>
}


type State = {
  program: string
  selected_puzzle: SelectedPuzzleInfo | undefined
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

  let [api, { set_program, set_selected_puzzle_id, run_on_puzzle_set }] = useApi()

  const [state, set_state] = createStore<State>({
    program: '',
    selected_puzzle: undefined,
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
    set_selected_puzzle_id(state.selected_puzzle.id)
  }

  const api_Queries = createMemo<ApiSuccess | undefined>(() => {
    let res = api.queries

    if (res !== undefined && is_api_error(res)) {
      return undefined
    }
    return res
  })
  createEffect(() => {
    console.log(api_Queries())
  })

  const api_Error = createMemo<ApiError | undefined>(() => {
    let res = api.queries

    console.log(api.queries)
    if (res !== undefined && is_api_error(res)) {
      return res
    }
  })



  const history = createMemo(() => {
    let qq = api_Queries()

    if (!qq) {
      return []
    }

    let { moves } = qq

    let res = []

    let pos = fen_pos(fen())

    for (let move of moves) {
      let uci = move.join('')

      let san = makeSan(pos, parseUci(uci)!)
      res.push(san)
    }

    return res
  })


  const fen = createMemo(() => {
    let qq = api_Queries()

    if (!qq) {
      return EMPTY_FEN
    }

    let { pieces } = qq


    let pos = fen_pos(EMPTY_FEN)

    for (let p_str of pieces) {

      let [square, role, color] = p_str

      let piece: Piece = { color, role } as Piece
      pos.board.set(parseSquare(square)!, piece)
    }
    
    return makeFen(pos.toSetup())
  })

  const shapes = createMemo(() => {
    let res: DrawShape[] = []

    let qq = api_Queries()

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
    if (api.list !== undefined) {
      load_state()
      if (state.selected_puzzle === undefined || !api.list.find(_ => _.id === state.selected_puzzle!.id)) {
        if (api.list.length === 0) {
          return undefined
        }
        let puzzle = api.list[0]
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
    return api.list?.find(_ => _.id === state.selected_puzzle?.id)
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
    set_program(text)
    run_on_one_puzzle()
  }
  const on_execute_command = (command: string) => {
    if (command === 'l') {
      run_on_puzzle_set()
    }
  }



  return (<>
    <div class='flex flex-row h-screen bg-slate-500'>
      <div class='relative flex-2 editor-wrap overflow-hidden'>
        <Editor text={state.program} on_save_text={on_program_changed} on_execute_command={on_execute_command}/>
        <Show when={api_Error()}>{error => 
          <div class='fade-in absolute rounded-sm p-2 bottom-0 right-0 text-amber-50 bg-red-500'>{error().error}</div>
          }</Show>
      </div>
      <div class='flex-1 moves-wrap'>

        <ErrorBoundary fallback={(error) => <>
          {error.message}
        </>}>
          <Suspense fallback={<>
            <div class='py-5 text-center text-lime-500'>Loading Puzzle list...</div>
          </>}>
            <PuzzleList list={api.list} selected={selected_puzzle()?.id} on_puzzle_selected={on_puzzle_selected} />
          </Suspense>
        </ErrorBoundary>
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
