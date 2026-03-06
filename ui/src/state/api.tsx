import { createContext, useContext, type JSX } from 'solid-js'
import { createStore } from 'solid-js/store'
import { create_agent, type ApiQueries } from './api_agent'
import { createAsync } from '@solidjs/router'
import type { Puzzle } from '../worker/fixture'

export const useApi = () => useContext(ApiContext)!

const ApiContext = createContext<ApiStore>()

type ApiState = {
    program: string
    queries?: ApiQueries
    list?: Puzzle[]
}

type ApiActions = {
    set_program(program: string): Promise<void>
}

type ApiStore = [ApiState, ApiActions]

export const ApiProvider = (props: { children: JSX.Element }) => {

    let $api_agent = create_agent()

    const [state, set_state] = createStore<ApiState>({
        program: '',
        
    })

    
    const get_PuzzleList = createAsync<Puzzle[]>(async () => {
        return $api_agent.puzzle_list()
    }, { initialValue: [] })



    const get_Queries = createAsync<ApiQueries>(async () => {
        return $api_agent.prolog_code(state.program)
    })

    const actions = {
        async set_program(program: string) {
            set_state('program', program)
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
            return get_PuzzleList.latest
        }

    }
    
    
    const store: ApiStore = [state2, actions]

    return <ApiContext.Provider value={store}>
        {props.children}
    </ApiContext.Provider>
}