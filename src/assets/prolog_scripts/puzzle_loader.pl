:- module(puzzle_loader, [
  single/0,
  bishop_forks/0
]).

:- use_module(library(csv)).
:- use_module(fen).
:- use_module(lines).
:- use_module(expand).


run_puzzle_csv(File) :-
  csv_read_file(File, Rows, []),
  run_rows(Rows, stats(0, 0, 0, 0, 0)).


run_rows([], stats(Total, Tp, Fp, Mismatch, Promotion)) :-
  format("Total: ~w Tp/Fp: ~w/~w Mismatch: ~w Promotion: ~w~n", [Total, Tp, Fp, Mismatch, Promotion]),
  TpFp is Tp + Fp,
  Error is (Fp / (TpFp + 0.0001)) * 100,
  Coverage is (TpFp / Total) * 100,
  format("Error: %~1f Coverage: %~1f~n", [Error, Coverage]).



run_rows([Row|Rs], stats(T0, Tp, Fp, Mismatch, Promotion)) :-
  T1 is T0 + 1,
  puzzle_category(Row, Cat),
  update_stats(Cat, stats(T1, Tp, Fp, Mismatch, Promotion), Stats1),

  (
    (Cat = notok,
    Fp < 8)
   ->
    Row =.. [_|[Id|_]],
    write(T1),
    write(' '),
    write(Cat),
    write(' '),
    format('https://lichess.org/training/~w', [Id]),
    nl
    ; true
  ),
  run_rows(Rs, Stats1).



puzzle_row_ok(Row, Cat) :-
  Row =.. [_|Fields],
  [_Id, Fen,Moves|_] = Fields,
  !,
  run_puzzle_fen(Fen,Moves, Cat).


puzzle_category(Row, Cat) :-
   puzzle_row_ok(Row, Cat), !.

puzzle_category(_, mismatch).

update_stats(ok, stats(T,Tp,Fp,M,P), stats(T,Tp1,Fp,M,P)) :-
    Tp1 is Tp + 1.

update_stats(notok, stats(T,Tp,Fp,M,P), stats(T,Tp,Fp1,M,P)) :-
    Fp1 is Fp + 1.

update_stats(mismatch, stats(T,Tp,Fp,M,P), stats(T,Tp,Fp,M1,P)) :-
    M1 is M + 1.

update_stats(promotion, stats(T,Tp,Fp,M,P), stats(T,Tp,Fp,M,P1)) :-
    P1 is P + 1.

run_puzzle_fen(FEN,Moves, Cat) :-
  load_fen(FEN),
  (play_single_moves(Moves, W1, Uci2) ->
   sanity_position(W1, Uci2, Cat)
  ; Cat = promotion).

play_single_moves(Moves, W1, Uci2) :-
  split_string(Moves, " ", "", [FirstUci,SecondUci|_Rest]),
  parse_uci(FirstUci, Uci1),
  parse_uci(SecondUci, Uci2),
  generate_child(root, Uci1, W1).

  sanity_position(W1, Move, ok) :-
    bishop_fork_world(W1, Move).

  sanity_position(W1, Move, notok) :-
    bishop_fork_world(W1, Move2),
    Move \= Move2.


  bishop_forks :-
    run_puzzle_csv('data/test_b_forks_kr.log').

  single :-
    run_puzzle_csv('data/test_single_out.csv').