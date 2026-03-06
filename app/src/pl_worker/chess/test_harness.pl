:- module(test_harness, [ run_test/1 ]).

:- use_module(fen).
:- use_module(types).
:- use_module(piece_at).
:- use_module(node_id).

run_test(FEN) :-
  load_fen(FEN),
  writeln("Position loaded."),
  test_check,
  test_moves.

test_check :-
 ( in_check(root, white)
 -> writeln("White is in check.")
 ; true
 ),
 ( in_check(root, black)
 -> writeln("Black is in check.")
 ; true
 ).

test_moves :-
  findall(M, legal_move(root, M), Moves),
  length(Moves, N),
  format("Legal moves: ~w~n", [N]),
  (member(M, Moves),
  writeln(M),
  fail
  ; true ).


%% perft1(+World, -Count)
%% Count all legal moves from World (depth = 1)
perft1(W, Count) :-
  findall(Move, legal_move(W, Move), Moves),
  length(Moves, Count).

run_perft1(FEN) :-
  load_fen(FEN),
  perft1(root, Count),
  format("perft1(1) = ~w~n", [Count]).


run_perft1_verbose(FEN) :-
  load_fen(FEN),
  findall(M, legal_move(root, M), Moves),
  length(Moves, Count),
  format("perft1(1) = ~w~n", [Count]),
  forall(member(M, Moves), writeln(M)).

perft_smoke_tests :-
  run_perft1("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"),
  run_perft1("4k3/8/8/8/8/8/4R3/4K3 b - - 0 1").