import { fen_pos, makeFen, makeSan, parseUci } from "hopefox"
import type { PuzzleId } from "../components/PuzzleList"

export type PuzzleCategory = string

export type ApiCodePuzzleStats = {
    categories: Record<PuzzleCategory, CategoryStat>
    payload: ApiPuzzle[]
}

export type CategoryStat = {
    tp: PuzzleId[],
    fp: PuzzleId[],
    n: number
}

export type ApiPuzzle = {
    id: string
    fen: string
    moves: string
    themes: string
}


export type Puzzle = {
    id: string,
    link: string,
    fen: string,
    moves: string,
    sans: string[],
    move_fens: string[],
    tags: string
}


export function convert_api_puzzle(p: ApiPuzzle) {

    let {id, fen, moves, themes} = p

    let sans: string[] = []


    let link = `https://lichess.org/training/${id}`

    let initial = true

    return {
        id, link, fen, moves, tags: themes,
        get move_fens() {
            let move_fens: string[] = []

            let pos = fen_pos(fen)
            moves.split(' ').forEach((uci, i) => {
                let move = parseUci(uci)!
                if (initial)
                    if (i > 0) sans.push(makeSan(pos, move))
                pos.play(move)

                move_fens.push(makeFen(pos.toSetup()))
            })

            initial = false
            return move_fens

        }, sans
    }
}