import { Chessboard } from "./components/Chessboard"
import Editor from "./components/Editor"
import { createEffect, For, Show } from "solid-js"
import { PuzzleList } from "./components/PuzzleList"
import { MorProvider, useMor } from "./state"
import { ListCategoryFilter } from "./state/Home"

function App() {
  return <>
    <MorProvider>
      <Home />
    </MorProvider>
  </>
}


function Home() {

  let [, { api_actions: { set_program, run_on_puzzle_set }, home_actions: { run_on_one_puzzle }}] = useMor()


  const on_program_changed = (text: string) => {
    set_program(text)
    run_on_one_puzzle()
  }
  const on_execute_command = (command: string) => {
    if (command === 'l') {
      run_on_puzzle_set()
    }
  }


  const [{home}] = useMor()

  return (<>
    <div class='flex flex-row h-screen bg-slate-500'>
      <div class='relative flex-2 editor-wrap overflow-hidden'>
        <Editor text={home.HomeStead.program} on_save_text={on_program_changed} on_execute_command={on_execute_command}/>
        <Show when={home.Queries.error}>{error => 
          <div class='absolute rounded-sm p-2 bottom-0 right-0 text-amber-50 bg-red-500'>{error().error}</div>
          }</Show>
      </div>
      <div class='flex-1 moves-wrap'>
        <ComplicatedCategorySelectorView/>
      </div>
      <div class='flex flex-col flex-1'>
        <div class='flex-1 moves-wrap'>
          <Moves history={home.Queries.history}/>
        </div>
        <div class='pb-6 board-wrap'>
          <Chessboard fen={home.Queries.fen} shapes={home.Queries.shapes} />
        </div>
      </div>
    </div>
  </>)
}


export default App


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



function ComplicatedCategorySelectorView() {

  const [{ home }, { api_actions: { run_on_puzzle_set }, home_actions: { on_puzzle_selected, set_category_filter, set_category }}] = useMor()

  const on_category_change = (e: InputEvent) => {
    let value = (e.target as HTMLInputElement).value

    set_category(value)
  }

  const on_filter_change = (e: InputEvent) => {
    let value = (e.target as HTMLInputElement).value

    switch (value) {
      case "fp": {
        set_category_filter(ListCategoryFilter.Fp)
      } break
      case "tp": {
        set_category_filter(ListCategoryFilter.Tp)
      } break
      default: {
        set_category_filter(ListCategoryFilter.N)
      }
    }

  }

  createEffect(() => {
    console.log(home.HomeStead.filter)
  })
  return (<>
    <div class='flex flex-col'>
      <button onClick={run_on_puzzle_set} class="my-2 px-4 py-1 font-semibold text-white bg-cyan-600 rounded-sm shadow-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 cursor-pointer">
        Run a Sweep
      </button>

      <select onInput={on_category_change} title='category' class='text-sm p-2 flex bg-emerald-100'>
        <For each={home.HomeStead.categories} fallback={
          <option>Run a Sweep to show categories.</option>
        }>{category =>
          <option value={category}>{category}</option>
          }</For>
      </select>
      <PuzzleList list={home.HomeStead.list} selected={home.HomeStead.selected_puzzle?.id} on_puzzle_selected={on_puzzle_selected} />

      <select onInput={on_filter_change} title='filter' class='text-md p-1 flex bg-amber-400'>
        <option selected={home.HomeStead.filter === ListCategoryFilter.Tp} value="tp">True Positive</option>
        <option selected={home.HomeStead.filter === ListCategoryFilter.Fp} value="fp">False Positive</option>
        <option selected={home.HomeStead.filter === ListCategoryFilter.N}value="negative">Negative</option>
      </select>
    </div>
  </>)
}