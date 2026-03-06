import type { Puzzle } from "../worker/fixture"

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
        async prolog_code(code: string) {
            return $post('/prolog_code', { code })
        },
        async puzzle_list() {
            return $('/puzzle_list')
        }
    }
}


export type Agent = {
    puzzle_list(): Promise<Puzzle[]>
    prolog_code: (code: string) => Promise<ApiQueries>
}

export type ApiQueries = ApiSuccess | ApiError


export type ApiSuccess = {
    red: string[]
    green: string[]
    pieces: string[]
    moves: string[]
}

export type ApiError = {
    error: string
}

export function is_api_error(q: ApiQueries): q is ApiError {
    return (q as ApiError).error !== undefined
}