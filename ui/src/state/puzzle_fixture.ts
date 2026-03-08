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

    let cache: any

    const calculate_stuff = () => {
        if (cache) {
            return cache
        }
        let initial = true
        let sans: string[] = []
        let move_fens: string[] = []

        let pos = fen_pos(fen)
        moves.split(' ').forEach((uci, i) => {
            let move = parseUci(uci)!
            if (i > 0) sans.push(makeSan(pos, move))
            pos.play(move)

            move_fens.push(makeFen(pos.toSetup()))
        })

        initial = false
        cache = [move_fens, sans]

        return cache
    }



    let link = `https://lichess.org/training/${id}`


    return {
        id, link, fen, moves, tags: themes,
        get move_fens() {
            return calculate_stuff()[0]
        }, get sans() {
            return calculate_stuff()[1]
        }
    }
}