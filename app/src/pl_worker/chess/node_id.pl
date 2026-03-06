:- module(node_id, [ 
  parent_of/2, 
  world_counter/1, 
  new_world_id/1, 
  record_edge/3, 
  record_parent/2, 
  record_depth/2, 
  reset_nodes/0,
  depth/2
  ]).

:- dynamic world_counter/1.
:- dynamic edge/3.

:- dynamic parent/2.
:- dynamic depth/2.

world_counter(0).

parent_of(hyp(W,_Move), W).
parent_of(W, P) :-
  parent(W, P).

reset_nodes :-
  retractall(world_counter(_)),
  assert(world_counter(0)),
  retractall(parent(_, _)),
  retractall(edge(_, _, _)),
  retractall(depth(_, _)),
  assert(depth(root, 0)).


new_world_id(W) :-
  retract(world_counter(N)),
  N1 is N + 1,
  assert(world_counter(N1)),
  atom_concat(w, N1, W).


record_edge(W, Move, W2) :-
  assertz(edge(W, Move, W2)).

record_parent(W, W2) :-
  assertz(parent(W, W2)).

record_depth(W, D) :-
  assertz(depth(W, D)).