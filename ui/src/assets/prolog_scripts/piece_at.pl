/*
:- module(piece_at, [ 
  piece_at/4,
  base_piece_at/4,
  base_side_to_move/2,
  legal_move/2,
  reset_worlds/0,
  in_check/2,
  empty/2,
  side_to_move/2,
  opponent_color/2,
  gives_check/2,
  hyp_world/3,
  opposite_color/2,
  create_child_world/3
  ]).

:- use_module(types).
:- use_module(node_id).
:- use_module(geometry).
*/


:- dynamic(base_piece_at/4).
:- dynamic(base_side_to_move/2).
:- dynamic(base_castle_right/3).

:- dynamic(base_half_move/2).
:- dynamic(base_full_move/2).

:- dynamic(committed_delta_del/4).
:- dynamic(committed_delta_add/4).

:- dynamic(delta_no_castle/3).

:- dynamic(delta_ep_add/2).
:- dynamic(delta_ep_clear/2).

:- dynamic(delta_halfmove_reset/1).
:- dynamic(delta_halfmove_inc/1).

reset_worlds :-
  reset_boards,
  reset_nodes.

reset_boards :-
  retractall(base_piece_at(_, _, _, _)),
  retractall(base_side_to_move(_, _)),
  retractall(base_castle_right(_, _, _)),
  retractall(base_half_move(_, _)),
  retractall(committed_delta_add(_, _, _, _)),
  retractall(committed_delta_del(_, _, _, _)),
  retractall(delta_no_castle(_, _, _)),
  retractall(delta_ep_add(_)),
  retractall(delta_ep_clear(_)),
  retractall(delta_halfmove_reset(_)),
  retractall(delta_halfmove_inc(_)).


piece_at(W, Sq, P, C) :-
  delta_add(W, Sq, P, C).

piece_at(W, Sq, P, C) :-
   parent_of(W, Parent),
   piece_at(Parent, Sq, P, C),
   \+ delta_del(W, Sq, P, C).

piece_at(root, Sq, P, C) :-
  base_piece_at(root, Sq, P, C).

opponent_color(W, Color) :-
  opposite_color(Other, Color),
  side_to_move(W, Other).

side_to_move(root, Color) :-
  base_side_to_move(root, Color).

side_to_move(W, Color) :-
 parent_of(W, P),
 side_to_move(P, Other),
 opposite_color(Other, Color).


opposite_color(white, black).
opposite_color(black, white).

castle_right(root, Color, Side) :-
  base_castle_right(root, Color, Side).

castle_right(W, Color, Side) :-
  parent_of(W, P),
  castle_right(P, Color, Side),
  \+ delta_no_castle(W, Color, Side).


ep_square(W, Sq) :-
  delta_ep_add(W, Sq).

ep_square(W, Sq) :-
  parent_of(W, P),
  ep_square(P, Sq),
  \+ delta_ep_clear(W).


halfmove(root, N) :-
  base_half_move(root, N).

halfmove(W, 0) :-
  delta_halfmove_reset(W).

halfmove(W, N1) :-
  parent_of(W, P),
  halfmove(P, N),
  delta_halfmove_inc(W),
  N1 is N + 1.


fullmove(root, N) :-
  base_full_move(root, N).

fullmove(W, N) :-
  parent_of(W, P),
  fullmove(P, N).

fullmove(W, N1) :-
  parent_of(W, P),
  fullmove(P, N),
  side_to_move(P, black),
  side_to_move(W, white),
  N1 is N + 1.


legal_move(W, Move) :-
  side_to_move(W, Color),
  pseudo_legal_move(W, Move),
  \+ leaves_king_in_check(W, Move).


empty(W, Sq) :-
  \+ occupies(W, Sq).

enemy_at(W, Sq, Color) :-
  piece_at(W, Sq, _, Other),
  opposite_color(Other, Color).


pseudo_legal_move(W, move(From, To)) :-
  piece_at(W, From, Piece, _Color),
  sliding_piece(Piece),
  attacks(W, Piece, From, To),
  empty(W, To).


pseudo_legal_move(W, move(From, To)) :-
  piece_at(W, From, Piece, Color),
  sliding_piece(Piece),
  attacks(W, Piece, From, To),
  enemy_at(W, To, Color).

pseudo_legal_move(W, move(From, To)) :-
  piece_at(W, From, knight, Color),
  knight_attack(From, To),
  (
    empty(W, To)
    ; enemy_at(W, To, Color)
  ).


pseudo_legal_move(W, move(From, To)) :-
  piece_at(W, From, king, Color),
  king_attack(From, To),
  (
    empty(W, To)
    ; enemy_at(W, To, Color)
  ).


pseudo_legal_move(W, move(From, To)) :-
  piece_at(W, From, pawn, Color),
  pawn_attack(W, From, To),
  enemy_at(W, To, Color).

pseudo_legal_move(W, move(From, To)) :-
  piece_at(W, From, pawn, Color),
  pawn_step(From, To, Color),
  empty(W, To).

pseudo_legal_move(W, move(From, To2)) :-
  piece_at(W, From, pawn, Color),
  pawn_double_step(W, Color, From, To2).

pseudo_legal_move(W, move(From, To)) :-
  piece_at(W, From, pawn, _Color),
  pawn_attack(W, From, To),
  ep_square(W, To).


pseudo_legal_move(W, castle(Color, Side)) :-
  side_to_move(W, Color),
  castle_right(W, Color, Side),
  king_start(Color, KFrom),
  piece_at(W, KFrom, king, Color),
  rook_start(Color, Side, RFrom),
  piece_at(W, RFrom, rook, Color),
  castle_path_clear(W, Color, Side).

castle_path_clear(W, Color, Side) :-
  king_castle_path(Color, Side, Squares),
  forall(member(Sq, Squares), \+ occupies(W, Sq)).


leaves_king_in_check(W, castle(Color, _)) :-
  in_check(W, Color).

leaves_king_in_check(W, castle(Color, Side)) :-
   king_castle_path(Color, Side, [Mid|_]),
   king_start(Color, KFrom),
   hyp_king_step(W, KFrom, Mid, MidWorld),
   in_check(MidWorld, Color).

leaves_king_in_check(W, Move) :-
  side_to_move(W, Color),
  hyp_world(W, Move, W2),
  in_check(W2, Color).

hyp_king_step(W, From, To, MidWorld) :-
  hyp_world(W, move(From, To), MidWorld).


hyp_world(W, Move, hyp(W, Move)).

in_check(W, Color) :-
  king_square(W, Color, KingSq),
  opposite_color(Color, Opp),
  attacked_by(W, Opp, KingSq).


gives_check(W, Move) :-
  side_to_move(W, Color),
  opposite_color(Color, Opp),
  hyp_world(W, Move, W2),
  in_check(W2, Opp).


create_child_world(W, Move, W2) :-
  new_world_id(W2),
  record_parent(W2, W),
  assert_committed_deltas(W2, W, Move),
  record_edge(W, Move, W2).

/*

delta_for_move(hyp(W, Move), W, Move).

delta_for_move(W2, promote(From, To, NewPiece)) :-
  parent(W2, W),
  piece_at(W, From, pawn, Color),
  piece_at(W, To, Captured, Opp),
  opposite_color(Color, Opp),

  assert(delta_del(W2, From, pawn, Color)),
  assert(delta_del(W2, To, Captured, Opp)),

  assert(delta_add(W2, To, NewPiece, Color)),

  assert(delta_ep_clear(W2)),
  assert(delta_halfmove_reset(W2)).




delta_for_move(W2, promote(From, To, NewPiece)) :-
  parent(W2, W),
  piece_at(W, From, pawn, Color),

  assert(delta_del(W2, From, pawn, Color)),
  assert(delta_add(W2, To, NewPiece, Color)),

  assert(delta_ep_clear(W2)),
  assert(delta_halfmove_reset(W2)).



delta_for_move(W2, castle(Color, Side)) :-
  parent(W2, _W),

  king_start(Color, KFrom),
  king_castle_to(Color, Side, KTo),
  rook_start(Color, Side, RFrom),
  rook_castle_to(Color, Side, RTo),

  % move king
  assert(delta_del(W2, KFrom, king, Color)),
  assert(delta_add(W2, KTo, king, Color)),

  % move rook
  assert(delta_del(W2, RFrom, rook, Color)),
  assert(delta_add(W2, RTo, rook, Color)),

  % lose castling rights
  assert(delta_no_castle(W2, Color, king_side)),
  assert(delta_no_castle(W2, Color, queen_side)),

  assert(delta_ep_clear(W2)),
  assert(delta_halfmove_inc(W2)).


delta_for_move(W, move(From, To)) :-
  parent_of(W2, W),
  piece_at(W, From, pawn, Color),
  ep_square(W, To),

  % capture pawn behind To
  ep_captured_square(Color, To, CapSq),
  piece_at(W, CapSq, pawn, Opp),
  opposite_color(Color, Opp),

  assert(delta_del(W2, From, pawn, Color)),
  assert(delta_del(W2, CapSq, pawn, Opp)),
  assert(delta_add(W2, To, pawn, Color)),

  assert(delta_ep_clear(W2)),
  assert(delta_halfmove_reset(W2)).


delta_for_move(W, move(From, To)) :-
  parent_of(W2, W),
  piece_at(W, From, pawn, Color),
  pawn_double_step(W, Color, From, To),

  % pawn moves
  assert(delta_del(W2, From, pawn, Color)),
  assert(delta_add(W2, To, pawn, Color)),

  % en-passant square
  ep_target_square(Color, From, EpSq),
  assert(delta_ep_add(W2, EpSq)),

  assert(delta_halfmove_reset(W2)).


delta_for_move(W, move(From, To)) :-
  parent_of(W2, W),
  piece_at(W, From, Piece, Color),
  piece_at(W, To, Captured, Opp),
  opposite_color(Color, Opp),

  % remove both
  assert(delta_del(W2, From, Piece, Color)),
  assert(delta_del(W2, To, Captured, Opp)),

  % add moving piece
  assert(delta_add(W2, To, Piece, Color)),

  % en-passant always cleared
  assert(delta_ep_clear(W2)),

  assert(delta_halfmove_reset(W2)),

  % castling rights possibly affected
  castle_capture_deltas(W2, To, Captured, Opp).


delta_for_move(W, move(From, To)) :-
  parent_of(W2, W),
  piece_at(W, From, Piece, Color),

  % piece moves
  assert(delta_del(W2, From, Piece, Color)),
  assert(delta_add(W2, To, Piece, Color)),

  % en-passant always cleared
  assert(delta_ep_clear(W2)),

  % halfmove clock
  ( Piece = pawn
    -> assert(delta_halfmove_reset(W2))
    ; assert(delta_halfmove_inc(W2))
    ),

  % castling rights possibly affected
  castle_deltas(W2, From, Piece, Color).

*/


castle_deltas(W2, From, king, Color) :-
  king_start(Color, From),
  assert(delta_no_castle(W2, Color, king_side)),
  assert(delta_no_castle(W2, Color, queen_side)).
  

castle_deltas(W2, From, rook, Color) :-
  rook_start(Color, Side, From),
  assert(delta_no_castle(W2, Color, Side)).
  
castle_deltas(_, _, _, _). % default

castle_capture_deltas(W2, From, rook, Color) :-
  rook_start(Color, Side, From),
  assert(delta_no_castle(W2, Color, Side)).

castle_capture_deltas(_, _, _, _). % default


delta_add(hyp(W, Move), Sq, P, C) :-
  delta_add_move(W, Move, Sq, P, C).

delta_add(W, Sq, P, C) :-
  committed_delta_add(W, Sq, P, C).
delta_del(hyp(W, Move), Sq, P, C) :-
  delta_del_move(W, Move, Sq, P, C).

delta_del(W, Sq, P, C) :-
  committed_delta_del(W, Sq, P, C).

delta_del_move(W, move(From, _To), From, P, C) :-
  piece_at(W, From, P, C).

delta_add_move(W, move(From, To), To, P, C) :-
  piece_at(W, From, P, C).

assert_committed_deltas(W2, W, Move) :-
    forall(delta_add_move(W, Move, Sq, P, C),
           assert(committed_delta_add(W2, Sq, P, C))),
    forall(delta_del_move(W, Move, Sq, P, C),
           assert(committed_delta_del(W2, Sq, P, C))).



% :- table piece_at/4.
%:- table in_check/2.
% :- table legal_move/2.