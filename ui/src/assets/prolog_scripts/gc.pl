

live(root).

live(W) :-
  expand(W).

live(W) :-
 explanation_target(W).

live(P) :-
 live(W) :-
 parent(W, P).

