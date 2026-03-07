import type { PuzzleId } from "../components/PuzzleList"
import type { ApiCodePuzzleStats, ApiPuzzle } from "./puzzle_fixture"

export type Pagination<T> = {
    page: number,
    pageSize: number,
    total: number
    pages: number
    items: T[]
}
export const API_ENDPOINT = import.meta.env.DEV ? 'http://localhost:3300' : `https://api5.morchess.com`
const $ = async (path: string, opts?: RequestInit) => {

    const controller = new AbortController()

    setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(API_ENDPOINT + path, { 
        ...opts,

        credentials: 'include',
        signal: controller.signal
    })
    
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`API ${res.status}: ${text}`)
        return { error: text }
    }

    return res.json()
}

async function $post(path: string, body: any = {}) {
    const res = await $(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    return res
}

export function create_agent(): Agent {
    return {
        async puzzle_stats(code: string) {
            return $post('/prolog_code', { code, list: true })
        },
        async prolog_code(code: string, puzzle_id: PuzzleId) {
            return $post('/prolog_code', { code, puzzle_id })
        },
        async puzzle_list() {
            return $('/puzzle_list')
        }
    }
}


export type Agent = {
    puzzle_stats(code: string): Promise<ApiCodePuzzleStats>
    puzzle_list(): Promise<Pagination<ApiPuzzle>>
    prolog_code: (code: string, puzzle_id: PuzzleId) => Promise<ApiQueries>
}

export type ApiQueries = ApiSuccess | ApiError


export type ApiSuccess = {
    red: string[]
    green: string[]
    pieces: string[][]
    moves: string[][]
}

export type ApiError = {
    error: string
}

export function is_api_error(q: ApiQueries): q is ApiError {
    return (q as ApiError).error !== undefined
}