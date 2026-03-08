:- module(user_land_entry, [ green/1, red/1, history/2 ]).

:- use_module(chess/fen).
:- use_module(chess/piece_at).
:- use_module(chess/types).

:- dynamic green/1.
:- dynamic red/1.
:- dynamic history/2.