import { createContext, useContext, type JSX } from 'solid-js'
import { createStore } from 'solid-js/store'
import { create_agent, type ApiQueries, type Pagination } from './api_agent'
import { createAsync } from '@solidjs/router'
import { convert_api_puzzle, type ApiPuzzle, type Puzzle } from './puzzle_fixture'
import type { PuzzleId } from '../components/PuzzleList'

export const useApi = () => useContext(ApiContext)!

const ApiContext = createContext<ApiStore>()

type ApiState = {
    queries?: ApiQueries
    list?: Puzzle[]
}

type ApiActions = {
    set_program(program: string): Promise<void>
    set_selected_puzzle_id(puzzle_id: PuzzleId): Promise<void>
}

type ApiStoreState = {
    program: string
    selected_puzzle_id: string
}

type ApiStore = [ApiState, ApiActions]



export const ApiProvider = (props: { children: JSX.Element }) => {

    let $api_agent = create_agent()

    const [state, set_state] = createStore<ApiStoreState>({
        program: '',
        selected_puzzle_id: ''
    })

    
    const get_PuzzleList = createAsync<Pagination<ApiPuzzle>>(async () => {
        return $api_agent.puzzle_list()
    })



    const get_Queries = createAsync<ApiQueries>(async () => {
        if (state.program === '' || state.selected_puzzle_id === '') {
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
        }
    }

    const state2 = {
        get program() {
            return state.program
        },
        get queries(): ApiQueries | undefined {
            return get_Queries()
        },
        get list(): Puzzle[] | undefined {
            return get_PuzzleList()?.items.map(convert_api_puzzle)
        }

    }
    
    
    const store: ApiStore = [state2, actions]

    return <ApiContext.Provider value={store}>
        {props.children}
    </ApiContext.Provider>
}