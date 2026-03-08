:- module(user_land_categorizer, [ run_categorization_stats/2, tactic_detector/2 ]).

:- use_module(library(assoc)).
:- use_module(chess/fen).


:- use_module(chess/piece_at).
:- use_module(chess/types).

:- use_module(user_land_entry).

:- dynamic(tactic_detector/2).


puzzle_category(Cat, Move) :-
    tactic_detector(Cat, Pred),
    Goal =.. [Pred, Moves],
    call(Goal),
    member(Move, Moves).


run_categorization_stats(Rows, Stats) :-
  init_stats(Stats0),
  foldl(puzzle_row_ok, Rows, Stats0, Stats1),
  finalize_stats(Stats1, Stats).


puzzle_row_ok(Row, Stats0, Stats) :-
    [Id, Fen, UciStr] = Row,
    parse_uci(UciStr, Move)
    -> (
    load_fen(Fen),
    sanity_position(Id, Move, Stats0, Stats)
    ) 
    ; Stats = Stats0.



stats_report(Stats, Report) :-
    dict_pairs(Stats, _, Pairs),
    maplist(cat_report, Pairs, Reports),
    dict_pairs(Report, report, Reports).

cat_report(Cat-CatStats, Cat-Report) :-
    metrics(CatStats, M),
    Report = CatStats.put(metrics, M).




init_category(Cat, Stats0, Stats) :-
    Stats = Stats0.put(Cat, cat{
        tp:TP-TP,
        fp:FP-FP,
        n:N-N
    }).

init_stats(stats{}).

init_stats(Cats, Stats) :-
    foldl(init_category, Cats, stats{}, Stats).


detect_tactics(Predictions) :-
    findall(Cat-Move, puzzle_category(Cat, Move), Predictions).


all_categories(Cats) :-
    findall(C, tactic_detector(C,_), Cats).

sanity_position(Id, SolutionMove, Stats0, Stats) :-
    findall(Cat-Move, puzzle_category(Cat, Move), Pairs),
    group_predictions(Pairs, PredDict),
    all_categories(Cats),
    foldl(eval(Id, SolutionMove, PredDict), Cats, Stats0, Stats).

eval(Id, Move, Preds, Cat, S0, S1) :-
    evaluate_category(Id, Move, Cat, Preds, S0, S1).


evaluate_category(Id, Solution, Cat, PredDict, Stats0, Stats) :-
    ( get_dict(Cat, PredDict, Moves) ->
        ( member(Solution, Moves) ->
            update_stats(tp, Cat, Id, Stats0, Stats)
        ;
            update_stats(fp, Cat, Id, Stats0, Stats)
        )
    ;
        update_stats(n, Cat, Id, Stats0, Stats)
    ).


group_predictions(Pairs, Dict) :-
    empty_assoc(A0),
    foldl(add_pred, Pairs, A0, A),
    assoc_to_dict(A, Dict).

add_pred(Cat-Move, A0, A) :-
    ( get_assoc(Cat, A0, Moves)
    -> put_assoc(Cat, A0, [Move|Moves], A)
    ;  put_assoc(Cat, A0, [Move], A)
    ).


assoc_to_dict(Assoc, Dict) :-
    assoc_to_list(Assoc, Pairs), % From library(assoc)
    dict_pairs(Dict, _, Pairs).


empty_cat(cat{tp: TP-TP, fp: FP-FP, n: 0}).

finalize_cat(cat{tp:TP0,fp:FP0,n:N}, cat{tp:TP,fp:FP,n:N}) :-
    close_dl(TP0, TP),
    close_dl(FP0, FP).



finalize_stats(Stats0, Stats) :-
    dict_pairs(Stats0, Tag, Pairs0),
    maplist(finalize_pair, Pairs0, Pairs),
    dict_pairs(Stats, Tag, Pairs).

finalize_pair(Cat-C0, Cat-C) :-
    finalize_cat(C0, C).



close_dl(List-Tail, Closed) :-
    Tail = [],
    Closed = List.

push(Key, Id, Cat0, Cat) :-
    DL0 = Cat0.get(Key),
    DL0 = List-Tail,
    Tail = [Id|NewTail],
    DL = List-NewTail,
    Cat = Cat0.put(Key, DL).




push_dl(List-Tail, Id, List-NewTail) :-
    Tail = [Id|NewTail].


  
update_cat(tp, Id, Cat0, Cat) :-
    Cat0.tp = DL0,
    push_dl(DL0, Id, DL),
    Cat = Cat0.put(tp, DL).

update_cat(fp, Id, Cat0, Cat) :-
    Cat0.fp = DL0,
    push_dl(DL0, Id, DL),
    Cat = Cat0.put(fp, DL).

update_cat(n, _, Cat0, Cat) :-
    N1 is Cat0.n + 1,
    Cat = Cat0.put(n, N1).


update_stats(Type, Cat, Id, Stats0, Stats) :-
    ( get_dict(Cat, Stats0, CatStats0)
    -> true
    ; empty_cat(CatStats0)
    ),
    update_cat(Type, Id, CatStats0, CatStats),
    Stats = Stats0.put(Cat, CatStats).

%candidate_bishop_forks(Move) :- Move = [move(e2, e4)].
%candidate_e2e5(Move) :- Move = [move(e2, e5)].
%tactic_detector(bishop_forks, candidate_Hello).

%candidate_Hello([Move]) :- bishop_fork(step(root, Move, _), _, _, _, _).

/*
bishop_fork(step(W, Move, W1), BishopSq, RookSq, KingSq, To) :- 
  bishop_fork_candidate(W, BishopSq, To, KingSq, RookSq), 
  Move = move(BishopSq, To), 
  hyp_world(W, Move, W1), 
  attacks(W1, bishop, To, KingSq), 
  attacks(W1, bishop, To, RookSq). 
 
 
bishop_fork_candidate(W, From, To, KingSq, RookSq) :- 
  side_to_move(W, Color), 
  piece_at(W, From, bishop, Color), 
  opposite_color(Color, Opp), 
  piece_at(W, KingSq, king, Opp), 
  piece_at(W, RookSq, rook, Opp), 
  bishop_attack(W, From, To), 
  empty(W, To). 
 
 */