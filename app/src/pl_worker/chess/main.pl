:- module(main, [
    main/0
]).

:- use_module(piece_at).
:- use_module(types).
:- use_module(fen).
:- use_module(expand).


main :- load_fen("1k6/R3B2p/P3p1p1/1p6/2b3P1/r7/5PP1/6K1 w - - 1 33").