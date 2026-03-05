:- module(lines, [bishop_fork_root/1, bishop_fork_world/2]).

:- use_module(types).
:- use_module(piece_at).


bishop_fork_root(Move) :-
  bishop_fork_world(root, Move).

bishop_fork_world(W, Move) :-
  bishop_fork(step(W, Move, W1), BishopSq, _, _, To),
  \+ king_takes_rook(step(W1, _, _), _, _),
  \+ takes_queen(step(W1, _, _)),
  \+ takes_bishop(step(W1, _, _), To).


takes_bishop(step(W, Move, W1), BishopSq) :-
  side_to_move(W, Color),
  opposite_color(Color, Opp),
  piece_at(W, BishopSq, bishop, Opp),
  piece_at(W, AttackSq, Piece, Color),
  attacks(W, Piece, AttackSq, BishopSq).



takes_queen(step(W, Move, W1)) :-
  side_to_move(W, Color),
  opposite_color(Color, Opp),
  piece_at(W, QueenSq, queen, Opp),
  piece_at(W, AttackSq, Piece, Color),
  attacks(W, Piece, AttackSq, QueenSq).

king_takes_rook(step(W, Move, W1), KingSq, RookSq) :-
  side_to_move(W, Color),
  opposite_color(Color, Opp),
  piece_at(W, KingSq, king, Color),
  piece_at(W, RookSq, rook, Opp),
  attacks(W, king, KingSq, RookSq).


bishop_fork(step(W, Move, W1), BishopSq, RookSq, KingSq, To) :-
  bishop_fork_candidate(W, BishopSq, To, KingSq, RookSq),
  Move = move(BishopSq, To),
  hyp_world(W, Move, W1),
  attacks(W1, bishop, To, KingSq),
  attacks(W1, bishop, To, RookSq),
  side_to_move(W1, Opp).


bishop_fork_candidate(W, From, To, KingSq, RookSq) :-
  side_to_move(W, Color),
  piece_at(W, From, bishop, Color),
  opposite_color(Color, Opp),
  piece_at(W, KingSq, king, Opp),
  piece_at(W, RookSq, rook, Opp),
  bishop_attack(W, From, To),
  empty(W, To).
