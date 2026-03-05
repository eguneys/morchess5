/*
:- module(types, [
  occupies/2,
  pawn_double_step/4,
  king_square/3,
  attacked_by/3,
  sliding_piece/1,
  attacks/4,
  pawn_attack/3,
  knight_attack/2,
  king_attack/2,
  rook_attack/3,
  bishop_attack/3,
  queen_attack/3,
  has_legal_move/1,
  checkmate/1,
  stalemate/1
]).

:- use_module(geometry).
:- use_module(piece_at).
*/

pawn_start_rank(white, a2).
pawn_start_rank(white, b2).
pawn_start_rank(white, c2).
pawn_start_rank(white, d2).
pawn_start_rank(white, e2).
pawn_start_rank(white, f2).
pawn_start_rank(white, g2).
pawn_start_rank(white, h2).
pawn_start_rank(black, a7).
pawn_start_rank(black, b7).
pawn_start_rank(black, c7).
pawn_start_rank(black, d7).
pawn_start_rank(black, e7).
pawn_start_rank(black, f7).
pawn_start_rank(black, g7).
pawn_start_rank(black, h7).

king_start(white, e1).
king_start(black, e8).

rook_start(white, king_side, h1).
rook_start(white, queen_side, a1).
rook_start(black, king_side, h8).
rook_start(black, queen_side, a8).

king_castle_to(white, king_side, g1).
king_castle_to(white, queen_side, c1).
king_castle_to(black, king_side, g8).
king_castle_to(black, queen_side, c8).

rook_castle_to(white, king_side, f1).
rook_castle_to(white, queen_side, d1).
rook_castle_to(black, king_side, f8).
rook_castle_to(black, queen_side, d8).

king_castle_path(white, king_side, [f1, g1]).
king_castle_path(white, queen_side, [d1, c1]).
king_castle_path(black, king_side, [f8, g8]).
king_castle_path(black, queen_side, [d8, c8]).



pawn_double_step(W, Color, From, To) :-
  pawn_start_rank(Color, From),
  pawn_step(From, To1, Color),
  empty(W, To1),
  pawn_step(To1, To, Color),
  empty(W, To).




occupies(W, S) :-
  piece_at(W, S, _, _).


knight_attack(From, To) :-
  knight_attack_geom(From, To).

king_attack(From, To) :-
  king_attack_geom(From, To).

pawn_attack(W, From, To) :-
  piece_at(W, From, pawn, Color),
  pawn_attack_geom(From, To, Color).


rook_attack(W, From ,To) :-
  rook_line(From, To),
  \+ (
    blocker_for(From, To, Mid),
    occupies(W, Mid)
  ).

bishop_attack(W, From, To) :-
  bishop_line(From, To),
  \+ (
    blocker_for(From, To, Mid),
    occupies(W, Mid)
  ).

queen_attack(W, From, To) :-
  rook_attack(W, From, To);
  bishop_attack(W, From, To).


attacks(W, rook, From, To) :- rook_attack(W, From, To).
attacks(W, bishop, From, To) :- bishop_attack(W, From, To).
attacks(W, queen, From, To) :- queen_attack(W, From, To).
attacks(_W, knight, From, To) :- knight_attack(From, To).
attacks(W, pawn, From, To) :- pawn_attack(W, From, To).
attacks(_W, king, From, To) :- king_attack(From, To).


attacked_by(W, AttackerColor, To) :-
  piece_at(W, From, Piece, AttackerColor),
  attacks(W, Piece, From, To).


king_square(W, Color, Sq) :-
  piece_at(W, Sq, king, Color).


has_legal_move(W) :-
  legal_move(W, _).


checkmate(W) :-
  side_to_move(W, Color),
  in_check(W, Color),
  \+ has_legal_move(W).

stalemate(W) :-
  side_to_move(W, Color),
  \+ in_check(W, Color),
  \+ has_legal_move(W).

sliding_piece(rook).
sliding_piece(bishop).
sliding_piece(queen).


%:- table has_legal_move/1.
%:- table occupies/2.