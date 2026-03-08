import { makePersisted } from "@solid-primitives/storage"
import { createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import { is_api_error, type ApiError, type ApiQueries } from "./api_agent"
import { EMPTY_FEN, fen_pos, makeFen, makeSan, parseSquare, parseUci, type Piece } from "hopefox"
import type { DrawShape } from "@lichess-org/chessground/draw"
import { is_key, type SelectedPuzzleInfo } from "./chess"
import type { Puzzle, PuzzleCategory } from "./puzzle_fixture"
import type { MorStore } from "."

export type State = {
    Queries: HomeQueries
    HomeStead: HomeStead
}

export type Actions = {
    on_puzzle_selected: (puzzle: Puzzle) => void
    run_on_one_puzzle: () => void
    set_category_filter: (filter: ListCategoryFilter) => void
    set_category: (category: PuzzleCategory) => void
}

export type Home = [State, Actions]

export function create_home(store: MorStore): Home {

    let Queries = createQueries(store)
    let [HomeStead, actions] = createHomeStead(store)

    let state = {
        Queries,
        HomeStead
    }

    return [state, actions]
}

type HomeStead = {
    program: string
    selected_puzzle: Puzzle | undefined
    list: Puzzle[] | undefined
    categories: PuzzleCategory[]
    filter: ListCategoryFilter | undefined
}

type PersistedHomeStead = {
    selected_puzzle: SelectedPuzzleInfo | undefined
    list_filter: ListFilter | undefined
}

type ListFilter = {
    category: PuzzleCategory
    filter: ListCategoryFilter
}

export enum ListCategoryFilter {
    Tp,
    Fp,
    N
} 

export function createHomeStead(mor_store: MorStore): [HomeStead, Actions] {


    const get_api = createMemo(() => mor_store[0].api)
    const api_actions = createMemo(() => mor_store[1].api_actions)

    const [state, _set_state] = createStore({
        program: '',
    })

    const [pstate, set_pstate] = makePersisted(createStore<PersistedHomeStead>({
        selected_puzzle: undefined,
        list_filter: undefined
    }), { name: 'morchess5.v1' })


    const run_on_one_puzzle = () => {
        if (pstate.selected_puzzle === undefined) {
            return
        }
        api_actions().set_selected_puzzle_id(pstate.selected_puzzle.id)
    }

    const selected_puzzle = createMemo(() => {
        let api = get_api()
        if (api.list !== undefined) {
            if (pstate.selected_puzzle === undefined || !api.list.find(_ => _.id === pstate.selected_puzzle!.id)) {
                if (api.list.length === 0) {
                    return undefined
                }
                let puzzle = api.list[0]
                set_pstate('selected_puzzle', {
                    id: puzzle.id,
                    puzzle: puzzle,
                    i_cursor: 0,
                    fen: puzzle.move_fens[0],
                    last_move: parseUci(puzzle.moves.split(' ')[0]),
                    solution: puzzle.sans.join(' ')
                })
            }
            run_on_one_puzzle()
        }
        return api.list?.find(_ => _.id === pstate.selected_puzzle?.id)
    })


    const on_puzzle_selected = (puzzle: Puzzle) => {
        set_pstate('selected_puzzle', {
            id: puzzle.id,
            puzzle: puzzle,
            i_cursor: 0,
            fen: puzzle.move_fens[0],
            last_move: parseUci(puzzle.moves.split(' ')[0]),
            solution: puzzle.sans.join(' ')
        })
        run_on_one_puzzle()
    }


    const list_filter = createMemo(() => {

        let api = get_api()
        if (pstate.list_filter === undefined) {
            return undefined
        }

        if (api.puzzle_stats === undefined || is_api_error(api.puzzle_stats)) {
            return undefined
        }

        let aa = api.puzzle_stats.categories[pstate.list_filter.category]

        if (pstate.list_filter.filter === ListCategoryFilter.Tp) {
            return aa.tp
        }
        if (pstate.list_filter.filter === ListCategoryFilter.Fp) {
            return aa.fp
        }
        return api.list?.map(_ => _.id).filter(_ => !aa.tp.includes(_) && !aa.fp.includes(_))
    })

    const list = createMemo(() => get_api().list?.filter(_ => list_filter()?.includes(_.id) ?? true))

    let stead: HomeStead = {
        get categories() {
            let stats = get_api().puzzle_stats

            if (!stats || is_api_error(stats)) {
                return []
            }


            return Object.keys(stats.categories)
        },
        get list() {
            return list()
        },
        get program() {
            return state.program
        },
        get selected_puzzle() {
            return selected_puzzle()
        },
        get filter() {
            return pstate.list_filter?.filter
        }
    }

    let actions: Actions = {
        on_puzzle_selected,
        run_on_one_puzzle,
        set_category_filter(filter: ListCategoryFilter) {
            if (pstate.list_filter === undefined) {
                return
            }
            set_pstate('list_filter', 'filter', filter)
        },
        set_category(category: PuzzleCategory) {
            if (pstate.list_filter === undefined) {
                set_pstate('list_filter', { category, filter: ListCategoryFilter.Fp })
            } else {
                set_pstate('list_filter', 'category', category)
            }
        }
    }

    return [stead, actions]
}


export type HomeQueries = {
    error?: ApiError
    history: string[]
    fen: string
    shapes: DrawShape[]
}

export function createQueries(store: MorStore): HomeQueries {

    const get_api = createMemo(() => store[0].api)

    const api_Queries = createMemo<ApiQueries | undefined>(() => {
        let res = get_api().queries

        if (res !== undefined && is_api_error(res)) {
            return undefined
        }
        return res
    })

    const api_Error = createMemo<ApiError | undefined>(() => {
        let res = get_api().queries
        if (res !== undefined && is_api_error(res)) {
            return res
        }
    })



    const history = createMemo(() => {
        let qq = api_Queries()

        if (!qq) {
            return []
        }

        let { moves } = qq

        let res = []

        let pos = fen_pos(fen())

        for (let move of moves) {
            let uci = move.join('')

            let san = makeSan(pos, parseUci(uci)!)
            res.push(san)
        }

        return res
    })


    const fen = createMemo(() => {
        let qq = api_Queries()

        if (!qq) {
            return EMPTY_FEN
        }

        let { pieces } = qq


        let pos = fen_pos(EMPTY_FEN)

        for (let p_str of pieces) {

            let [square, role, color] = p_str

            let piece: Piece = { color, role } as Piece
            pos.board.set(parseSquare(square)!, piece)
        }

        return makeFen(pos.toSetup())
    })

    const shapes = createMemo(() => {
        let res: DrawShape[] = []

        let qq = api_Queries()

        if (!qq) {
            return []
        }

        let { green } = qq

        let ss = green
        if (ss) {
            for (let s of ss) {
                if (is_key(s)) {
                    res.push({ orig: s, brush: 'green' })
                }
            }
        }

        let { red } = qq

        if (red) {
            for (let s of red) {
                if (is_key(s)) {
                    res.push({ orig: s, brush: 'red' })
                }
            }
        }

        return res
    })


    return {
        get error() { return api_Error() },
        get history() { return history() },
        get fen() { return fen() },
        get shapes() { return shapes() },
    }
}