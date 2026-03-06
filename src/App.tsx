import { createAsync } from "@solidjs/router"
import { Chessboard } from "./components/Chessboard"
import Editor from "./components/Editor"
import { TauProvider, useTau } from "./state/prolog"
import { createMemo, For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import type { DrawShape } from "@lichess-org/chessground/draw"
import type { Key } from "@lichess-org/chessground/types"
import { SquareSet } from "../../hopefox/dist/src/distill/squareSet"
import { EMPTY_FEN, fen_pos, makeFen, makeSan, parseSquare, parseUci, square } from "hopefox"
import { makePersisted } from "@solid-primitives/storage"
import type { Piece } from "../../hopefox/dist/src/distill/types"
import { Scripts } from "./worker/prolog_scripts"

function App() {

  return <>
    <TauProvider>
      <Home />
    </TauProvider>
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

function Home() {

  const [save_state, set_save_state] = makePersisted(createStore({
    program: ''
  }), { name: 'morchess5.v1' })

  let [, { query } ] = useTau()

  const Full_program = createMemo(() => `
${Program_Header} 
${Program_Scripts}
${save_state.program}
${Program_Load}
`)

  const queries = createAsync(() => query(Full_program(), { 
    QQ: `load_fen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1').`,
    Z_pieces: 'piece_at(root, X, Y, Z).',
    Ls_moves: 'history(Ls).',
    X_green: 'green(X).',
    X_red: 'red(X).',
  }))


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

  return (<>
    <div class='flex flex-row h-screen bg-slate-500'>
      <div class='flex-2 editor-wrap overflow-hidden'>
        <Editor text={save_state.program} on_save_text={(_) => set_save_state('program', _)}/>
      </div>
      <div class='flex-1 moves-wrap'>
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