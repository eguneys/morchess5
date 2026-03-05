import { createContext, useContext, type JSX } from 'solid-js'
import { createStore } from 'solid-js/store'

export const useTau = () => useContext(TauContext)!

const TauContext = createContext<TauStore>()

type TauState = {
}

type TauActions = {
    query(program: string, query: string): Promise<string[]>
}

type TauStore = [TauState, TauActions]

export const TauProvider = (props: { children: JSX.Element }) => {

    const [state, _set_state] = createStore<TauState>({
    })

    const actions = {
        async query(program: string, query: string) {

            try {
                let session = pl.create()
                await session.promiseConsult(program)
                await session.promiseQuery(query)

                let res: string[] = []

                for await (let answer of session.promiseAnswers()) {
                    let a = session.format_answer(answer)
                    if (!a) {
                        continue
                    }
                    res.push(format_X_a1(a))
                }
                return res
            } catch (e) {

                console.error(e)
                return []
            }
        }
    }

    const store: TauStore = [state, actions]

    return <TauContext.Provider value={store}>
        {props.children}
    </TauContext.Provider>
}

const format_X_a1 = (text: string) => {
    let m = text.match(/X = (\w*)/)!
    return m[1]
}