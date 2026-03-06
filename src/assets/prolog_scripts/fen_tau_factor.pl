:- use_module(library(js)).

parse_int(Int, X) :- apply(parseInt, [Int], X).
is_integer(Int) :- apply(parseInt, [Int], X), integer(X).
int_to_atom(Int, Atom) :- number_chars(Int, [Atom]).

split_string(FEN, Delimeter, _, Ls) :-
  apply(FEN, split, [Delimeter], Ls).

string_chars(FEN, Ls) :- split_string(FEN, '', _, Ls).

starting_position("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1").

%% load_fen(+FenString)
%% Clears state and creates root world from FEN
load_fen(FEN) :-
  reset_worlds,
  split_string(FEN, " ", "", [Board, Turn, Castle, Ep | _]),
  load_board(Board).
  load_turn(Turn),
  load_castling(Castle),
  load_ep(Ep).

load_board(BoardStr) :-
  split_string(BoardStr, "/", "", Ranks),
  load_ranks(Ranks, 8).

load_ranks([], _).
load_ranks([RStr|Rs], Rank) :-
  string_chars(RStr, R),
  load_rank(R, Rank, a),
  Rank1 is Rank - 1,
  load_ranks(Rs, Rank1).

load_rank([], _, _).
load_rank([C|Cs], Rank, File) :-
  ( is_integer(C) ->
       parse_int(C, N),
       file_advance(File, N, File1),
       load_rank(Cs, Rank, File1)
    ;
       piece_char(C, Piece, Color),
       int_to_atom(Rank, RankAtom),
       square(File, RankAtom, Sq),
       assertz(base_piece_at(root, Sq, Piece, Color)),
       file_advance(File, 1, File1),
       load_rank(Cs, Rank, File1)
    ).


piece_char('P', pawn, white).
piece_char('N', knight, white).
piece_char('B', bishop, white).
piece_char('R', rook, white).
piece_char('Q', queen, white).
piece_char('K', king, white).

piece_char('p', pawn, black).
piece_char('n', knight, black).
piece_char('b', bishop, black).
piece_char('r', rook, black).
piece_char('q', queen, black).
piece_char('k', king, black).


file_advance(File, N, File2) :-
  char_code(File, C),
  C2 is C + N,
  char_code(File2, C2).

square(File, Rank, Sq) :-
  atom_concat(File, Rank, Sq).



load_turn("w") :-
  assertz(base_side_to_move(root, white)).

load_turn("b") :-
  assertz(base_side_to_move(root, black)).


load_castling("-") :- !.
load_castling(Str) :-
  string_chars(Str, Cs),
  forall(member(C, Cs), load_castle_char(C)).

load_castle_char('K') :- assertz(base_castle_right(rootk, white, king_side)).
load_castle_char('Q') :- assertz(base_castle_right(rootk, white, queen_side)).
load_castle_char('k') :- assertz(base_castle_right(rootk, black, king_side)).
load_castle_char('q') :- assertz(base_castle_right(rootk, black, queen_side)).

load_ep('-') :- !.
  load_ep(Sq) :-
  atom_string(A, Sq),
  assertz(base_ep_square(root, A)).

file(a).  file(b).  file(c).  file(d).  file(e).  file(f).  file(g).  file(h).
rank('8').  rank('7').  rank('6').  rank('5').  rank('4').  rank('3').  rank('2').  rank('1').

piece_symbol(pawn,white,'P').
piece_symbol(knight,white,'N').
piece_symbol(bishop,white,'B').
piece_symbol(rook,white,'R').
piece_symbol(queen,white,'Q').
piece_symbol(king,white,'K').

piece_symbol(pawn,black,'p').
piece_symbol(knight,black,'n').
piece_symbol(bishop,black,'b').
piece_symbol(rook,black,'r').
piece_symbol(queen,black,'q').
piece_symbol(king,black,'k').

show_board(W) :-
    forall(rank(R),
        ( forall(file(F),
            ( square(F,R,Sq),
              ( piece_at(W,Sq,P,C)
                -> piece_symbol(P,C,S)
                ;  S='.'
              ),
              write(S), write(' ')
            )),
          nl
        )),
    nl.


show_line([]).
show_line([step(M,W)|Rest]) :-
    write(M), nl,
    show_board(W),
    show_line(Rest).

show_pieces(W) :-
  forall(piece_at(W,Sq,P,C),
    (write(C-P), write(@), write(Sq), nl)).


parse_uci(UciStr, Move) :-
  string_length(UciStr, 4),
  sub_string(UciStr, 0, 2, 2, SourceStr),
  sub_string(UciStr, 2, 2, 0, DestStr),
  atom_string(SourceAtom, SourceStr),
  atom_string(DestAtom, DestStr),

  Move = move(SourceAtom, DestAtom).