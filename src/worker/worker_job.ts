import { fen_pos } from 'hopefox'
import { puzzles, type Puzzle } from './fixture'

let pp: Puzzle[]

const init = async () => {
    pp = await puzzles()

    postMessage('ready')
}
init()



type FEN = string

export type RunOnOnePuzzleResult = {
    relations?: RelationView[] 
    error?: string
}

const run_on_one_puzzle = async (fen: FEN, program: string, query: Record<string, string>): Promise<RunOnOnePuzzleResult> => {
    let pos = fen_pos(fen)
    let res, error
    try {
        let res2 = bindings(m, pos, program)
        res = [...res2.values()]
    } catch (e) {
        if (e instanceof Error) {
            error = e.message
        }
    }
    return { relations: res?.map(_ => convert_manager_to_view(fen_pos(fen), _)), error }
}

// @ts-ignore
let skips_0_100_17 = [48, 54, 62, 65, 66, 67, 72, 80, 83, 87, 92, 94]
let skips_1_200_17 = [
  108, 109, 113, 120, 124, 125, 131,
  134, 135, 141, 142, 144, 145, 147,
  149, 151, 152, 156, 157, 159, 165,
  166, 167, 168, 171, 175, 177, 178,
  179, 181, 185, 187, 188, 193, 194,
  198
]
let skips_1_600_17 = [
  600, 601, 602, 603, 604, 605, 606, 607, 608, 609,
  610, 611, 612, 613, 614, 615, 617, 618, 620, 621,
  622, 623, 625, 627, 629, 630, 631, 632, 633, 634,
  635, 636, 638, 640, 641, 642, 643, 644, 645, 646,
  648, 651, 652, 654, 655, 656, 657, 658, 659, 660,
  661, 662, 663, 664, 665, 667, 668, 669, 670, 671,
  673, 674, 675, 676, 678, 679, 680, 681, 682, 683,
  685, 686, 687, 689, 690, 693, 695, 696, 698
]

let skips = [
  27, 66, 83, 86,
  88, 89, 93
]
skips.unshift(0)
skips.unshift(...skips_1_600_17)

export type PuzzleResult = {
    puzzle: Puzzle,
    result: RunOnOnePuzzleResult
}

type Program = string

let active_step_timeout: number

const run_on_skips = (program: Program) => {
    let res: PuzzleResult[] = []

    clearTimeout(active_step_timeout)

    function step(i: number) {
        let startTime = performance.now()
        for (; i < skips.length; i++) {
            let puzzle = pp[i]
            res.push({
                puzzle,
                result: run_on_one_puzzle(puzzle.move_fens[0], program)
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
        let result = run_on_one_puzzle(puzzle.move_fens[e.data.d.cursor], program)
        postMessage({ t: 'run_on_one', 
            d: {
                puzzle,
                result
            }
        })
    }
    if (e.data.t === 'batch') {
        let program = e.data.d.program
        run_on_skips(program)
    }
}


// postMessage({ t: 'progress', d })


function convert_manager_to_view(pos: Position, r: RelationManager): RelationView {

    let rows = r.get_relation_starting_at_world_id(0).rows.map(row => {
        return value_sensibles(pos, row)
    })

    return { name: r.name, rows }
}

export type RowView = Record<Column, string>
export type RelationView = {
    name: Column
    rows: RowView[]
}


type Column = string
function value_sensibles(pos: Position, m: Map<Column, number>) {
  let res: any = {}

  const square_name = (value: number) => square(value)
  const piece_name = (value: number) => piece(piece_c_to_piece(value))
  const color_name = (value: number) => value === WHITE ? 'White' : 'Black'

  let aa = extract_line(m)

  let resaa = extract_sans(pos, aa)
  if (resaa.length > 0) {
    res['line'] = resaa.join(' ')
  }

  for (let [key, value] of m.entries()) {
    switch (key) {
      case 'from':
      case 'to':
      case 'to2':
      case 'square':
      case 'block':
        res[key] = square_name(value)
        break
      case 'piece':
        res[key] = piece_name(value)
        break
      case 'color':
        res[key] = color_name(value)
        break
      default:
        if (key.includes('to') || key.includes('from')) {
          res[key] = square(value)
        } else if (key.includes('piece')) {
          res[key] = piece_name(value)
        } else {
          if (key.includes('world')) {
            continue
          }
          res[key] = value
        }
    }
  }

  return res
}

function extract_sans(pos: Position, aa: MoveC[]) {

  let resaa = []
  let p2 = pos.clone()
  for (let a = 0; a < aa.length; a++) {
    let move = move_c_to_Move(aa[a])
    resaa.push(makeSan(p2, move))
    p2.play(move)
  }
  return resaa
}

type Row = Map<Column, number>
function extract_line(row: Row) {
  let res = []
  for (let i = 1; i < 8; i++) {
    let key = i == 1 ? '' : i
    if (!row.has('from' + key)) {
      break
    }
    res.push(make_move_from_to(row.get('from' + key)!, row.get('to' + key)!))
  }
  return res
}