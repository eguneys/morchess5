a(X) :- b(X).

b(X) :- a(X).


analysis(Result):- 
    findall(X, a(X), Greens),
    findall(X, b(X), Reds),
    Result = json{ green: Greens, red: Reds}.

run_with_limit(Goal, Result) :-
    catch(
        call_with_time_limit(2, Goal),
        time_limit_exceeded,
        Result = timeout
    ).




safe_run(Result) :-
  run_with_limit(
    analysis(Result),
    Result
  ).

reply(Result) :-
    json_write_dict(current_output, Result),
    nl,
    flush_output.


stuff :-
  safe_run(Result),
  reply(Result).