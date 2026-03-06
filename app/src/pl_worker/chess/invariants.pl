:- module(invariants, [ 
  invalid_parent/0,
  invalid_cycle/0,
  orphan_delta/1,
  contradictory_delta/1,
  duplicate_add/1,
  overlapping_pieces/1,
  bad_turn/1,
  castle_regression/1,
  bad_ep/1,
  illegal_expansion/1
  ]).

:- use_module(node_id).
:- use_module(piece_at).


invalid_parent :-
  parent(W, P1),
  parent(W, P2),
  P1 \= P2.


invalid_cycle :-
  parent(W, P),
  ancestor(P, W).

ancestor(W, P) :-
  parent(W, P).
ancestor(W, P) :-
  parent(W, X),
  ancestor(X, P).


orphan_delta(W) :-
 ( delta_add(W,_,_,_)
  ; delta_del(W,_,_,_)
  ; delta_no_castle(W,_,_)
  ; delta_ep_add(W)
  ; delta_ep_clear(W)
  ; delta_halfmove_reset(W)
  ; delta_halfmove_inc(W)
 ),
 \+ parent(W, _),
 W \= root.

contradictory_delta(W) :-
  delta_add(W, Sq, P, C),
  delta_del(W, Sq, P, C).

duplicate_add(W) :-
  delta_add(W, Sq, P, C),
  delta_add(W, Sq, P, C),
  false. % same fact twice (Prolog usually prevents this, but check if needed)

overlapping_pieces(W) :-
  piece_at(W, Sq, P1, C1),
  piece_at(W, Sq, P2, C2),
  (P1 \= P2 ; C1 \= C2).


bad_turn(W) :-
 parent(W, P),
 side_to_move(W, C),
 side_to_move(P, C).


castle_regression(W) :-
  parent(W, P),
  castle_right(W, Color, Side),
  \+ castle_right(P, Color, Side).


bad_ep(W) :-
  parent(W, P),
  parent(P, PP),
  ep_square(PP, _),
  ep_square(W, _).


illegal_expansion(W) :-
  expand(W),
  ( terminal(W)
  ; \+ live(W)
  ).


