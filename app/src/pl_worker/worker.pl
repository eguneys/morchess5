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
        call_with_time_limit(2, 
            catch(
                (   call_with_depth_limit(Goal, 1000, _Depth),
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
    (Line == end_of_file 
    -> halt
    ; catch(handle(Line),
            Error, 
            (
                atom_json_dict(Line, Dict, []),
                RequestId = Dict.get(id),
                print_message(error, Error),
                reply(json{id: RequestId, error: 'command handle error'})
            )
        )
    ),
    fail.

print_message(Type, Message) :-
  format(user_error, "[~w]: ~w~n", [Type, Message]).

handle(Line) :-
    atom_json_dict(Line, Dict, []),
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
    findall(X, user_land_entry:green(X), Greens),
    findall(X, user_land_entry:red(X), Reds),
    findall([X, Y, Z], user_land_entry:piece_at(root, X, Y, Z), Pieces),
    user_land_entry:history(XMoves),
    maplist(move_to_pair, XMoves, Moves),
    Result = json{ green: Greens, red: Reds, pieces: Pieces, moves: Moves }.

move_to_pair(move(A,B), [A,B]).