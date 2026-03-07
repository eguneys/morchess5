import type { Key } from "@lichess-org/chessground/types"
import { square, SquareSet } from "hopefox"
import type { PuzzleId } from "../components/PuzzleList"
import type { Puzzle } from "./puzzle_fixture"

export const Square_Names: Key[] = []
for (let sq of SquareSet.full()) {
  Square_Names.push(square(sq) as Key)
}

export const is_key = (a: string): a is Key => {
  return Square_Names.indexOf(a as Key) !== -1
}


export type FEN = string
export type Move = any
export type SelectedPuzzleInfo = {
  id: PuzzleId
  fen: FEN
  i_cursor: number
  puzzle: Puzzle
  last_move: Move
  solution: string
}