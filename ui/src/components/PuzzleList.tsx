import { createEffect, For } from "solid-js"
import type { Puzzle } from "../worker/fixture"

export type PuzzleId = string

export function PuzzleList(props: { list?: Puzzle[], selected?: PuzzleId, on_select_puzzle: (p: Puzzle) => void }) {
  console.log(props.list, props.selected)
  return (<>
  <div class='flex flex-col overflow-y-scroll max-h-50'>
          <For each={props.list}>{(p, i) =>
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