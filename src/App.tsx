import { createAsync } from "@solidjs/router"
import { Chessboard } from "./components/Chessboard"
import Editor from "./components/Editor"
import { TauProvider, useTau } from "./state/prolog"
import { createEffect, createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import type { DrawShape } from "@lichess-org/chessground/draw"
import type { Key } from "@lichess-org/chessground/types"
import { SquareSet } from "../../hopefox/dist/src/distill/squareSet"
import { square } from "hopefox"
import { makePersisted } from "@solid-primitives/storage"

function App() {

  return <>
    <TauProvider>
      <Home />
    </TauProvider>
  </>
}

const Program_Header = `
  :- dynamic(square/1).
`

function Home() {

  const [save_state, set_save_state] = makePersisted(createStore({
    program: ''
  }), { name: 'morchess5.v1' })

  let [, { query } ] = useTau()

  const Full_program = createMemo(() => `
${Program_Header} 
${save_state.program}
`)

createEffect(() => {
  console.log(save_state.program)
})

  const squares = createAsync(() => query(Full_program(), 'square(X).'))

  const shapes = createMemo(() => {
    let res: DrawShape[] = []

    let ss = squares()

    if (ss) {
      for (let s of ss) {
        if (is_key(s)) {
          res.push({ orig: s, brush: 'green'})
        }
      }
    }

    return res
  })

  return (<>
    <div class='flex flex-row h-screen bg-slate-500'>
      <div class='flex-1 editor-wrap'>
        <Editor text={save_state.program} on_save_text={(_) => set_save_state('program', _)}/>
      </div>
      <div class='flex-1 self-center board-wrap'>
        <Chessboard fen="" shapes={shapes()} />
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