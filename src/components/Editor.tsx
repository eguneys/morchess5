import { batch, createMemo, For, onCleanup, onMount, Show } from "solid-js"
import { createStore } from "solid-js/store"

type EditorMode = 'normal' | 'edit' | 'command' 

type EditorState = {
    mode: EditorMode,
    lines: string[]
    cursor_line: number
    cursor_char: number
    input_command: string
}

type EditorActions = {
    set_mode(mode: EditorMode): void
    in_command_execute_command(): void
    in_command_insert_char(char: string): void
    exit_command_mode(): void
    in_edit_delete_char(): void
    in_edit_insert_char(char: string): void
    in_edit_end_mode_backup_cursor(): void
    in_edit_break_line(): void
    normal_mode_delete_char(): void
    normal_mode_change_end_of_line(): void
    normal_mode_motion_left(): void
    normal_mode_motion_right(): void
    normal_mode_motion_up(): void
    normal_mode_motion_down(): void
    normal_mode_motion_back_word(): void
    normal_mode_motion_forward_word(): void
    normal_mode_o_newline_set_in_edit_mode(): void
    normal_mode_o_newline_above_set_in_edit_mode(): void
    normal_mode_set_cursor_append_char(): void
    normal_mode_set_cursor_append_end_of_line(): void
    normal_mode_join_lines(): void
    normal_mode_goto_beginning_of_line(): void
}

export default function Editor(props: { text: string, on_save_text: (_: string) => void }) {

    const [state, set_state] = createStore<EditorState>({
        mode: 'normal',
        lines: props.text.split('\n'),
        cursor_line: 0,
        cursor_char: 0,
        input_command: ''
    })

    const Full_Text = createMemo(() => state.lines.join('\n'))

    const execute_command = (command: string) => {
        if (command === 'w') {
            props.on_save_text(Full_Text())
            set_state('input_command', '')
        }
    }

    let actions: EditorActions = {
        set_mode(mode: EditorMode) {
            set_state('mode', mode)
        },
        in_command_execute_command() {
            execute_command(state.input_command)
        },
        in_command_insert_char(key: string) {
            set_state('input_command', state.input_command + key)
        },
        exit_command_mode() {
            set_state('input_command', '')
            set_state('mode', 'normal')
        },
        in_edit_break_line() {
            batch(() => {
                let line_a = state.lines[state.cursor_line].slice(0, state.cursor_char)
                let line_b = state.lines[state.cursor_line].slice(state.cursor_char)
                set_state('lines', _ => state.lines.toSpliced(state.cursor_line, 1, line_a, line_b))
                set_state('cursor_line', state.cursor_line + 1)
                set_state('cursor_char', 0)
            })
        },
       in_edit_end_mode_backup_cursor() {
            if (state.cursor_char === 0) {
                return
            }
            set_state('cursor_char', state.cursor_char - 1)
        },
        in_edit_delete_char() {
            let line = state.lines[state.cursor_line]
            let new_line = line.slice(0, state.cursor_char - 1) + line.slice(state.cursor_char)
            batch(() => {
                set_state('lines', state.cursor_line, new_line)
                set_state('cursor_char', state.cursor_char - 1)
            })
        },
        in_edit_insert_char(char: string) {
            let line = state.lines[state.cursor_line]
            let new_line = line.slice(0, state.cursor_char) + char + line.slice(state.cursor_char)
            batch(() => {
                set_state('lines', state.cursor_line, new_line)
                set_state('cursor_char', state.cursor_char + 1)
            })
        },

        normal_mode_delete_char() {
            let line = state.lines[state.cursor_line]
            let new_line = line.slice(0, state.cursor_char) + line.slice(state.cursor_char + 1)
            batch(() => {
                set_state('lines', state.cursor_line, new_line)
                //set_state('cursor_char', state.cursor_char + 1)
            })
        },
        normal_mode_set_cursor_append_char() {
            set_state('cursor_char', state.cursor_char + 1)
        },
        normal_mode_set_cursor_append_end_of_line() {
            set_state('cursor_char', state.lines[state.cursor_line].length)
        },
        normal_mode_o_newline_set_in_edit_mode() {
            batch(() => {
                set_state('lines', _ => state.lines.toSpliced(state.cursor_line + 1, 0, ''))
                set_state('cursor_line', state.cursor_line + 1)
                set_state('cursor_char', 0)
            })
        }, 
        normal_mode_o_newline_above_set_in_edit_mode() {
            batch(() => {
                set_state('lines', _ => state.lines.toSpliced(state.cursor_line, 0, ''))
                set_state('cursor_line', state.cursor_line)
                set_state('cursor_char', 0)
            })
        }, 
        normal_mode_change_end_of_line() {
            batch(() => {
                let line_a = state.lines[state.cursor_line].slice(0, state.cursor_char)
                set_state('lines', _ => state.lines.toSpliced(state.cursor_line, 1, line_a))
                set_state('cursor_char', state.lines[state.cursor_line].length)
                set_state('mode', 'edit')
            })
        },
        normal_mode_motion_up() {
            batch(() => {
                if (state.cursor_line === 0) {
                    return
                }
                set_state('cursor_line', state.cursor_line - 1)
                let line = state.lines[state.cursor_line]
                if (state.cursor_char > line.length) {
                    set_state('cursor_char', line.length)
                }
            })
        },
        normal_mode_motion_down() {
            batch(() => {
                if (state.cursor_line >= state.lines.length - 1) {
                    return
                }
                set_state('cursor_line', state.cursor_line + 1)
                let line = state.lines[state.cursor_line]
                if (state.cursor_char > line.length) {
                    set_state('cursor_char', line.length)
                }
            })
        },
        normal_mode_motion_left() {
            batch(() => {
                if (state.cursor_char === 0) {
                    return
                }
                set_state('cursor_char', state.cursor_char - 1)
            })
        },
        normal_mode_motion_right() {
            batch(() => {
                if (state.cursor_char === state.lines[state.cursor_line].length - 1) {
                    return
                }
                set_state('cursor_char', state.cursor_char + 1)
            })
        },
        normal_mode_motion_back_word() {

            let line = state.lines[state.cursor_line]
            let i = state.cursor_char
            while (i > 0) {
                if (line[--i] === ' ') {
                    break
                }
            }
            set_state('cursor_char', i)
        },
        normal_mode_motion_forward_word() {

            let line = state.lines[state.cursor_line]
            let i = state.cursor_char
            while (i < line.length) {
                if (line[++i] === ' ') {
                    break
                }
            }
            set_state('cursor_char', i)
        },
        normal_mode_join_lines() {
            batch(() => {
                let line_ab = state.lines[state.cursor_line] + state.lines[state.cursor_line + 1]
                set_state('lines', _ => state.lines.toSpliced(state.cursor_line, 2, line_ab))
                //set_state('cursor_line', state.cursor_line)
                //set_state('cursor_char', 0)
            })
        },
        normal_mode_goto_beginning_of_line() {
            let i = 0
            while (i < state.lines[state.cursor_line].length) {
                if (state.lines[state.cursor_line][i] !== ' ') {
                    break
                }
                i++
            }
            set_state('cursor_char', i)
        }
    }

    const mode_text = createMemo(() => Mode_Text[state.mode])

    onMount(() => {
        let on_key_down = KeyBindings(state, actions)

        document.addEventListener('keydown', on_key_down)

        onCleanup(() => {
            document.removeEventListener('keydown', on_key_down)
        })
    })

    return (<>
    <div class='editor h-full w-full flex flex-col space-mono-regular text-2xl font-bold bg-zinc-700 text-amber-50'>
        <div class='area whitespace-pre flex-1'>
            <For each={state.lines}>{ (line , index) => 
            <Show when={index() === state.cursor_line} fallback={
               <div class='line'>{line} </div>
            }>
                        <div class='line'>
                            <span>{line.slice(0, state.cursor_char)}</span>
                            <span class='relative'>
                                <Cursor state={state} char={line[state.cursor_char]} />
                            </span>
                            <Show when={state.cursor_char < state.lines[state.cursor_line].length}>
                                <span>{line.slice(state.cursor_char + 1)} </span>
                            </Show>

                       </div>
            </Show>
            }</For>
        </div>
        <div class={`status px-2 py-1 ${state.mode === 'normal' ? 'bg-zinc-800' : 'text-gray-900 bg-amber-600'}`}>
            {mode_text()}
            <Show when={state.mode==='command'}>
                <span>{state.input_command}</span>
            </Show>
        </div>
    </div>
    </>)
}

function Cursor(props: { state: EditorState, char: string }) {
    return (<>
        <span class={`cursor absolute left-0 ${props.state.mode==='edit' ? 'w-0.5' : 'w-full'} bg-amber-400 h-full`}></span>
        <span class={`relative ${props.state.mode === 'edit' ? '' : 'text-zinc-700'}`}>{props.char ?? ' '}</span>
    </>)
}

const Mode_Text: Record<EditorMode, string> = {
    'normal': 'Normal',
    'edit': 'Edit',
    'command': ':'
}


function KeyBindings(state: EditorState, actions: EditorActions) {

    const handle_in_edit_mode = (e: KeyboardEvent) => {

        let handled = true
        switch (e.key) {
            case 'Escape':
                actions.in_edit_end_mode_backup_cursor()
                actions.set_mode('normal')
                break
            case 'Backspace':
                actions.in_edit_delete_char()
                break
            default: 
                if (e.ctrlKey) {
                    if (e.key === 'j') {
                        actions.in_edit_break_line()
                    }
                } else if (e.key.length === 1) {
                    actions.in_edit_insert_char(e.key)
                } else {
                    handled = false
                }
                break
        }


        if (handled) {
            e.preventDefault()
        }
    }

    const handle_in_normal_mode = (e: KeyboardEvent) => {

        let handled = true
        switch (e.key) {
            case 'Escape':
                actions.set_mode('normal')
                break
            case ':':
                actions.set_mode('command')
                break
            case 'i':
                actions.set_mode('edit')
                break
            case '_':
                actions.normal_mode_goto_beginning_of_line()
                break
            case 'x':
                actions.normal_mode_delete_char()
                break
            case 'j': case 'J':
                if (e.shiftKey) {
                    actions.normal_mode_join_lines()
                } else {
                    actions.normal_mode_motion_down()
                }
                break
            case 'a': case 'A':
                if (e.shiftKey) {
                    actions.normal_mode_set_cursor_append_end_of_line()
                } else {
                    actions.normal_mode_set_cursor_append_char()
                }
                actions.set_mode('edit')
                break
            case 'c': case 'C':
                if (e.shiftKey) {
                    actions.normal_mode_change_end_of_line()
                } else {
                }
                break
            case 'w':
                actions.normal_mode_motion_forward_word()
                break
            case 'b':
                actions.normal_mode_motion_back_word()
                break
            case 'h':
                actions.normal_mode_motion_left()
                break
            case 'l':
                actions.normal_mode_motion_right()
                break
            case 'j':
                actions.normal_mode_motion_down()
                break
            case 'k':
                actions.normal_mode_motion_up()
                break
            case 'o': case 'O': 
                actions.set_mode('edit')
                if (e.shiftKey) {
                    actions.normal_mode_o_newline_above_set_in_edit_mode()
                } else {
                    actions.normal_mode_o_newline_set_in_edit_mode()
                }
                break
            default: 
                handled = false
                break
        }


        if (handled) {
            e.preventDefault()
        }
    }

    const handle_in_command_mode = (e: KeyboardEvent) => {
 
        let handled = true
        switch (e.key) {
            case 'Escape':
                actions.exit_command_mode()
                break
            case 'Enter':
                actions.in_command_execute_command()
                actions.exit_command_mode()
                break
            default: 
                if (e.key.length === 1) {
                    actions.in_command_insert_char(e.key)
                } else {
                    handled = false
                }
                break
        }


        if (handled) {
            e.preventDefault()
        }       
    }


    return (e: KeyboardEvent) => {
        switch (state.mode) {
            case 'normal':
                handle_in_normal_mode(e)
                break
            case 'edit':
                handle_in_edit_mode(e)
                break
            case 'command':
                handle_in_command_mode(e)
                break
        }
    }
}
