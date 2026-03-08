import { createEffect, For, onCleanup } from "solid-js"
import type { Puzzle } from "../state/puzzle_fixture"

export type PuzzleId = string

export function PuzzleList(props: { list?: Puzzle[], selected?: PuzzleId, on_puzzle_selected: (p: Puzzle) => void }) {

  const on_keydown = (e: KeyboardEvent) => {
    switch (e.key) {
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
    if (props.list === undefined) {
      return
    }
    let i = props.list.findIndex(_ => _.id === props.selected)
    if (i > -1) {
      props.on_puzzle_selected(props.list[(i + 1 + props.list.length) % props.list.length])
    }
  }

  const prev_puzzle = () => {
    if (props.list === undefined) {
      return
    }
    let i = props.list.findIndex(_ => _.id === props.selected)
    if (i > -1) {
      props.on_puzzle_selected(props.list[(i - 1 + props.list.length) % props.list.length])
    }
  }





  return (<>
    <div class='flex flex-col overflow-y-scroll h-50'>
      <For each={props.list} fallback={<>
        <div class='self-center p-5'>No puzzles :)</div>
      </>}>{(p, i) =>
        <PuzzleItem n={i() + 1} selected={props.selected === p.id} puzzle={p} on_click={() => props.on_puzzle_selected(p)} />
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