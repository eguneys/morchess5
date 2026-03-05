import geom from './assets/prolog_scripts/geometry.pl?raw'
import node_id from './assets/prolog_scripts/node_id.pl?raw'
import piece_at from './assets/prolog_scripts/piece_at.pl?raw'
import types from './assets/prolog_scripts/types.pl?raw'
import fen from './assets/prolog_scripts/fen.pl?raw'
import { fen_pos, square } from 'hopefox'


export const Scripts = `
${geom}
${node_id}
${piece_at}
${types}
${fen}
`


type FEN = string
export const LoadFen = (fen: FEN) => {

    let pos = fen_pos(fen)
    let pieses: [string, string, string][] = []

    for (let sq of pos.board.occupied) {
        let piece = pos.board.get(sq)!

        pieses.push([square(sq), piece.role, piece.color])
    }

    let turn = pos.turn
    return `
    load_fen :-
    assertz(base_side_to_move(root, ${turn})),
    ${pieses.map(([Sq, Piece, Color]) => `assertz(base_piece_at(root, ${Sq}, ${Piece}, ${Color}))`).join(',\n')}.
    `
}