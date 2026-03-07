:- use_module(library(pairs)).
:- use_module(library(json)).
:- initialization(loop).

:- use_module(library(sandbox)).
:- use_module(user_land_entry).


:- set_prolog_flag(stack_limit, 512_000_000).
% call_with_depth_limit(Goal, 1000, Result).

safe_query(Goal) :-
    sandbox:safe_goal(Goal),
    call(Goal).


safe_query(user_land_entry:green(_)).


run_with_limit(Goal, Result) :-
    catch(
        call_with_time_limit(8, 
            catch(
                (   call_with_depth_limit(Goal, 100000, _Depth),
                    % If we get here, Goal succeeded with its own Result binding
                    % Result is already bound by Goal at this point
                    true
                ),
                depth_limit_exceeded,
                Result = depth_limit_exceeded
            )
        ),
        time_limit_exceeded,
        Result = timeout
    ).

loop :-
    repeat,
    read_line_to_string(user_input, Line),
    (   Line == end_of_file
    ->  halt
    ;   process_line(Line),
        fail
    ).

process_line(Line) :-
    catch(
        atom_json_dict(Line, Dict, []),
        Error,
        (
            print_message(error, Error),
            reply(json{id:null, error:'invalid json'}),
            fail
        )
    ),
    RequestId = Dict.get(id),

    (   catch(handle(Dict), Error,
            (
                print_message(error, Error),
                reply(json{id:RequestId, error:'command handle error'}),
                fail
            ))
    ->  true
    ;   reply(json{id:RequestId, error:'command failed'})
    ).


print_message(Type, Message) :-
  format(user_error, "[~w]: ~w~n", [Type, Message]).

handle(Dict) :-
    run_query(Dict, Result),
    reply(json{ id: Dict.get(id), result: Result}).

reply(Result) :-
    json_write_dict(current_output, Result, [width(0)]),
    nl,
    flush_output.



load_user_code(Code) :-
    setup_call_cleanup(
        open_string(Code, Stream),
        load_files(user_land_entry,
            [ stream(Stream),
              module(user_land_entry)
            ]),
        close(Stream)
    ).


run_query(Dict, Result) :-
    Code = Dict.get(code),
    Fen = Dict.get(fen),

    load_user_code(Code),
    user_land_entry:load_fen(Fen),
    safe_run(Result).




safe_run(Result) :-
  run_with_limit(
    run_analysis(Result),
    Result
  ).

run_analysis(Result) :-
    safe_findall(X, user_land_entry:green(X), Greens),
    safe_findall(X, user_land_entry:red(X), Reds),
    safe_findall([X, Y, Z], user_land_entry:piece_at(root, X, Y, Z), Pieces),
    user_land_entry:history(XMoves),
    maplist(move_to_pair, XMoves, Moves),
    Result = json{ green: Greens, red: Reds, pieces: Pieces, moves: Moves }.



move_to_pair(move(A,B), [A,B]) :-
  ground(A),
  ground(B).

safe_findall(Template, Goal, List) :-
  findall(Template,
      ( Goal,
        ground(Template)
      ),
      List).


history_group_by_category(JSON) :-
    safe_findall(Category-Items, (
        user_land_entry:history(Category, XItems), 
        maplist(move_to_pair, XItems, Items)
    ) ,Pairs),
    sort(Pairs, SortedPairs),
    group_pairs_by_key(SortedPairs, Grouped),
    convert_to_json(Grouped, JSON).

% Main predicate to convert the list to a dict
convert_to_json(List, Dict) :-
    maplist(prepare_pair, List, Pairs),
    dict_create(Dict, json, Pairs).

% Helper to ensure keys are atoms (required for dict keys)
prepare_pair(Category-Items, CatAtom-Items) :-
    atom_string(CatAtom, Category).