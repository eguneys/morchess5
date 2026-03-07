import { createContext, type JSX, useContext } from "solid-js"
import { create_home, type State as HomeState, type Actions as HomeActions, type Home } from "./Home"
import { createStore } from "solid-js/store"
import { create_api, type ApiActions, type ApiState, type ApiStore } from "./api"

export const useMor = () => useContext(MorContext)!

const MorContext = createContext<MorStore>()

type MorState = {
    home: HomeState
    api: ApiState
}

type MorActions = {
    home_actions: HomeActions
    api_actions: ApiActions
}

export type MorStore = [MorState, MorActions]



export const MorProvider = (props: { children: JSX.Element }) => {


    let api: ApiStore
    let home: Home

    const [state] = createStore<MorState>({
        get home() {
            return home[0]
        },
        get api() {
            return api[0]
        }
    })

    const actions = {
        get home_actions() {
            return home[1]
        },
        get api_actions() {
            return api[1]
        }
    }

   


    let store: MorStore = [state, actions]

    api = create_api(store)
    home = create_home(store)

    return <MorContext.Provider value={store}>
        {props.children}
    </MorContext.Provider>
}