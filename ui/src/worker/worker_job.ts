import './core'
import { _prolog_query } from '../state/_prolog'
import type { Puzzle } from '../state/puzzle_fixture'
import { puzzles } from './fixture'

let pp: Puzzle[]
let skips: number[]

const init = async () => {
    pp = await puzzles()
    skips = [...Array(pp.length).keys()]

    postMessage('ready')
}
init()



type FEN = string

export type RunOnOnePuzzleResult = {
    relations?: Record<string, string[]>
    error?: string
}

const run_on_one_puzzle = async (fen: FEN, program: string, query: Record<string, string>): Promise<RunOnOnePuzzleResult> => {
    let res, error
    try {
        query = { QQ: `load_fen('${fen}').`, ...query } 
        res = await _prolog_query(program, query)
    } catch (e) {
        if (e instanceof Error) {
            error = e.message
        }
    }
    return { relations: res, error }
}

export type PuzzleResult = {
    puzzle: Puzzle,
    result: RunOnOnePuzzleResult
}

type Program = string

let active_step_timeout: number

const run_on_skips = (program: Program, query: Record<string, string>) => {
    let res: PuzzleResult[] = []

    clearTimeout(active_step_timeout)

    async function step(i: number) {
        let startTime = performance.now()
        for (; i < skips.length; i++) {
            let puzzle = pp[i]
            res.push({
                puzzle,
                result: await run_on_one_puzzle(puzzle.move_fens[0], program, query)
            })

            postMessage({ t: 'progress', d: `${i + 1} ${skips.length}` })

            if (performance.now() - startTime > 16) {
                active_step_timeout = setTimeout(() => step(i + 1))
                return
            }
        }

        postMessage({ t: 'run_on_skips', d: res })
    }

    step(0)
}

onmessage = async (e: MessageEvent) => {
    if (e.data.t === 'list') {
        postMessage({ t: 'list', d: skips.map(_ => pp[_]) })
    }
    if (e.data.t === 'one') {
        let puzzle = pp.find(_ => _.id === e.data.d.id)!
        let program = e.data.d.program
        let query = e.data.d.query
        let result = await run_on_one_puzzle(puzzle.move_fens[e.data.d.cursor], program, query)
        postMessage({ t: 'run_on_one', 
            d: {
                puzzle,
                result
            }
        })
    }
    if (e.data.t === 'batch') {
        let program = e.data.d.program
        let query = e.data.d.query
        await run_on_skips(program, query)
    }
}

// postMessage({ t: 'progress', d })