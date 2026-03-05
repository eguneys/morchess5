import { createContext, useContext, type JSX } from 'solid-js'
import { createStore } from 'solid-js/store'

export const useTau = () => useContext(TauContext)!

const TauContext = createContext<TauStore>()

type TauState = {
}

type TauActions = {
    query(program: string, query: Record<string, string>): Promise<Record<string, string[]> | undefined>
}

type TauStore = [TauState, TauActions]

export const TauProvider = (props: { children: JSX.Element }) => {

    const [state, _set_state] = createStore<TauState>({
    })

    const actions = {
        async query(program: string, query: Record<string, string>) {

            try {
                let session = pl.create()
                await session.promiseConsult(program)

                let res2: Record<string, string[]> = {}
                for (let key of Object.keys(query)) {

                    await session.promiseQuery(query[key])

                        let res: string[] = []

                        for await (let answer of session.promiseAnswers()) {
                            if (key[0] === 'Z') {
                                let a = session.format_answer(answer)
                                if (!a) {
                                    continue
                                }
                                res.push(format_Z_a1(a))
                            }
                            if (key[0] === 'X') {
                                let a = session.format_answer(answer)
                                if (!a) {
                                    continue
                                }
                                res.push(format_X_a1(a))
                            }
                        }
                        res2[key.split('_')[1]] = res
                }

                return res2
            } catch (e) {

                console.error(e)
                return undefined
            }
        }
    }

    const store: TauStore = [state, actions]

    return <TauContext.Provider value={store}>
        {props.children}
    </TauContext.Provider>
}

const format_Z_a1 = (text: string) => {
    let m = text.match(/X = (\w*), Y = (\w*), Z = (\w*)/)!
    return [m[1], m[2], m[3]].join(' ')
}

const format_X_a1 = (text: string) => {
    let m = text.match(/X = (\w*)/)!
    return m[1]
}