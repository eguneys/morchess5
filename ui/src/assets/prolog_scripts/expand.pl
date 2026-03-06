:- module(expand, [ generate_child/3 ]).

:- use_module(node_id).
:- use_module(piece_at).
:- use_module(types).

generate_child(W, Move, W2) :-
 expand(W),
 %legal_move(W, Move),
 create_child_world(W, Move, W2).


high_priority(W) :-
 in_check(W, _).

high_priority(W) :-
 forcing_move(W, _).


expand(W) :-
 side_to_move(W, Color),
 in_check(W, Color).


expand(W) :-
  high_priority(W),
  depth(W, D),
  D < 10.

expand(W) :-
  depth(W, D),
  D < 6,
  \+ terminal(W),
  interesting(W).


terminal(W) :-
  checkmate(W).
terminal(W) :-
  stalemate(W).


forcing_move(W, Move) :-
  gives_check(W, Move).

/*
forcing_move(W, Move) :-
  wins_material(W, Move).

forcing_move(W, Move) :-
  creates_threat(W, Move).
*/

/*

check_explanation(W, Move, direct) :-
    hyp_world(W, Move, W2),
    moved_piece_attacks_king(W2).

check_explanation(W, Move, discovered) :-
    removes_blocker(W, Move, _),
    gives_check(W, Move).


*/

interesting(W) :-
  in_check(W, _).

interesting(W) :-
  legal_move(W, Move),
  forcing_move(W, Move).


/*
interesting(W) :-
  pin(W, _, _).

interesting(W) :-
  fork_threat(W, _, _).

interesting(W) :-
  skewer_threat(W, _, _).

interesting(W) :-
  king_exposed(W, _).
*/