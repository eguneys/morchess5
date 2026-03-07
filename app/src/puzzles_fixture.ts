import { Chess, parseUci } from 'chessops'
import { makeFen, parseFen } from 'chessops/fen'
import fs from 'fs'

export const puzzleFixture = parse_puzzles(fs.readFileSync('data/test_b_forks_kr.log').toString())

function parse_puzzles(str: string): Puzzle[] {
  return str.trim().split('\n').map(_ => {

    let [id, fen, moves, _a, _b, _c, _d, tags] = _.split(',')

    let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()
    pos.play(parseUci(moves.split(' ')[0])!)
    let fen2 = makeFen(pos.toSetup())



    return {
      id, fen, moves, solution: moves.split(' ')[1], themes: tags, fen2
    }

  })
}

export type Puzzle = {
    id: string
    fen: string
    fen2: string
    moves: string
    solution: string
    themes: string
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
) {
  const start = (page - 1) * pageSize
  const end = start + pageSize

  return {
    page,
    pageSize,
    total: items.length,
    pages: Math.ceil(items.length / pageSize),
    items: items.slice(start, end)
  }
}

export type PuzzleOutput = {
  id: string
  fen: string
  themeCount: number
}


export async function transformPuzzle(p: Puzzle): Promise<PuzzleOutput> {
  return {
    id: p.id,
    fen: p.fen,
    themeCount: p.themes.length
  }
}

export async function transformList(
  puzzles: Puzzle[]
): Promise<PuzzleOutput[]> {

  return Promise.all(puzzles.map(transformPuzzle))
}