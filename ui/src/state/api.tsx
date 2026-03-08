import { createSignal, untrack } from 'solid-js'
import { createStore } from 'solid-js/store'
import { create_agent, type ApiQueries, type Pagination } from './api_agent'
import { createAsync } from '@solidjs/router'
import { convert_api_puzzle, type ApiCodePuzzleStats, type ApiPuzzle, type Puzzle } from './puzzle_fixture'
import type { PuzzleId } from '../components/PuzzleList'
import type { MorStore } from '.'
import { createWritableMemo } from '@solid-primitives/memo'

export type ApiState = {
    queries?: ApiQueries
    list?: Puzzle[]
    puzzle_stats?: ApiCodePuzzleStats
}

export type ApiActions = {
    set_program(program: string): Promise<void>
    set_selected_puzzle_id(puzzle_id: PuzzleId): Promise<void>
    run_on_puzzle_set(): Promise<void>
}

type ApiStoreState = {
    program: string
    selected_puzzle_id: string
}

export type ApiStore = [ApiState, ApiActions]


export function create_api(mor_store: MorStore) {

    let $api_agent = create_agent()

    const [state, set_state] = createStore<ApiStoreState>({
        program: '',
        selected_puzzle_id: ''
    })

    const [fetch_puzzle_set_stats, set_fetch_puzzle_set_stats] = createSignal<boolean>(false, { equals: false })


    
    const get_PuzzleStats = createAsync<ApiCodePuzzleStats | undefined>(async () => {
        if (!fetch_puzzle_set_stats()) {
            return undefined
        }
        let res = await $api_agent.puzzle_stats(untrack(() => state.program))

        mor_store[1].home_actions.set_category(Object.keys(res.categories)[0])

        let puzzles_payload = res.payload.map(convert_api_puzzle)
        let add = puzzles_payload.filter(_ => !puzzle_List()?.some(l => l.id === _.id))
        set_puzzle_List(_ => [...(_ ?? []), ...add])

        return res
    })

    
    const get_PuzzleList = createAsync<Pagination<ApiPuzzle>>(async () => {
        return $api_agent.puzzle_list()
    })

    const [puzzle_List, set_puzzle_List] = createWritableMemo(() => {
        return get_PuzzleList()?.items.map(convert_api_puzzle)
    })





    const get_Queries = createAsync<ApiQueries>(async () => {
        let program = state.program
        let id = state.selected_puzzle_id
        if (!program || !id) {
            return { error: 'not initialized' }
        }
        return $api_agent.prolog_code(state.program, state.selected_puzzle_id)
    })

    const actions = {
        async set_program(program: string) {
            set_state('program', program)
        },
        async set_selected_puzzle_id(puzzle_id: string) {
            set_state('selected_puzzle_id', puzzle_id)
        },
        async run_on_puzzle_set() {
            set_fetch_puzzle_set_stats(true)
        }
    }

    const state2 = {
        get program() {
            return state.program
        },
        get queries(): ApiQueries | undefined {
            return get_Queries()
        },
        get list() {
            return puzzle_List()
        },
        get puzzle_stats(): ApiCodePuzzleStats | undefined {
            return get_PuzzleStats()
        }

    }
    
    
    const store: ApiStore = [state2, actions]

    return store
}