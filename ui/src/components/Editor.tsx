import { makePersisted } from "@solid-primitives/storage"
import { batch, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { createStore } from "solid-js/store"

type EditorMode = 'normal' | 'edit' | 'command' 

type MotionCommand = 'none' | 'delete' | 'change' | 'yank' | 'replace' | 'goto'

type EditorState = {
    yanked_text: string
    yanked_line: string
    motion_cmd: MotionCommand
    mode: EditorMode
    lines: string[]
    cursor_line: number
    cursor_char: number
    input_command: string
    camera_y: number
    motion_capture_begin: { x: number, y: number }
    visual_mode_rect?: { x: number, y: number, x2: number, y2: number }
}

type EditorActions = {
    on_escape(): void
    set_mode(mode: EditorMode): void
    in_command_execute_command(): void
    in_command_insert_char(char: string): void
    exit_command_mode(): void
    in_edit_delete_char(): void
    in_edit_insert_char(char: string): void
    in_edit_end_mode_backup_cursor(): void
    in_edit_break_line(): void
    normal_mode_undo(): void
    normal_mode_redo(): void
    normal_mode_delete_char(): void
    normal_mode_change_end_of_line(): void
    normal_mode_motion_left(): void
    normal_mode_motion_right(): void
    normal_mode_motion_up(): void
    normal_mode_motion_down(): void
    normal_mode_motion_back_word(): void
    normal_mode_motion_back_word_whitespace(): void
    normal_mode_motion_forward_word(): void
    normal_mode_motion_goto_end_of_line(): unknown
    normal_mode_motion_goto_end_of_page(): void
    normal_mode_o_newline_set_in_edit_mode(): void
    normal_mode_o_newline_above_set_in_edit_mode(): void
    normal_mode_set_cursor_append_char(): void
    normal_mode_set_cursor_append_end_of_line(): void
    normal_mode_join_lines(): void
    normal_mode_goto_beginning_of_line(): void
    normal_mode_delete_delete_line(): void
    normal_mode_yank_yank_line(): void
    normal_mode_yank_text(): void
    normal_mode_change_change_line(): void
    normal_mode_insert_wall_of_text(res: string): void
    normal_mode_begin_visual_mode(): void
    normal_mode_end_visual_mode(): void
    normal_mode_begin_motion_capture(): void
    normal_mode_end_motion_capture(): void
    normal_mode_replace_replace_char(char?: string): void
    normal_mode_goto_goto_line(): void
    normal_mode_page_up(): void
    normal_mode_page_down(): void
}

type UndoState = {
    lines: string[]
    cursor_line: number
    cursor_char: number
}

export default function Editor(props: { text: string, on_save_text: (_: string) => void, on_execute_command: (_: string) => void }) {

    let undo_stack: UndoState[] = []
    let redo_stack: UndoState[] = []

    const [state, set_state] = createStore<EditorState>({
        yanked_text: '',
        yanked_line: '',
        motion_cmd: 'none',
        mode: 'normal',
        lines: props.text.split('\n'),
        cursor_line: 0,
        cursor_char: 0,
        input_command: '',
        camera_y: 0,
        motion_capture_begin: { x: 0, y: 0 },
        visual_mode_rect: undefined
    })

    const [persisted_state, set_persisted_state] = makePersisted(createStore({
        text: ''
    }), { name: 'morchess5.editor.v1'})

    const save_program = () => {
        set_persisted_state('text', state.lines.join('\n'))
    }
    const load_program = () => {
        set_state('lines', persisted_state.text.split('\n'))
        props.on_save_text(Full_Text())
    }

    onMount(() => {
        load_program()
    })

    const Full_Text = createMemo(() => state.lines.join('\n'))

    const execute_command = (command: string) => {
        if (command === 'w') {
            props.on_save_text(Full_Text())
            set_state('input_command', '')
            save_program()
        }
        props.on_execute_command(command)
    }


    const on_cursor_change = () => {

        let _30 = nbLines()
        if (state.cursor_line < state.camera_y + 7) {
            scroll_camera_y(state.cursor_line - 7)
        } else
            if (state.cursor_line > (state.camera_y + _30 - 7)) {
                scroll_camera_y(state.cursor_line - _30 + 7)
            }
    }

    const scroll_camera_y = (delta: number) => {
        let tmp = state.camera_y
        set_state('camera_y', Math.min(Math.max(0, delta), state.lines.length))
        let now = state.camera_y

        return tmp !== now
    }

    let $element!: HTMLDivElement
    const [listen_to_resize, set_listen_to_resize] =  createSignal(void 0, { equals: false })

    onMount(() => {

        let o = new ResizeObserver(set_listen_to_resize)

        o.observe($element)

        onCleanup(() => {

            o.disconnect()
        })
    })

    const nbLines = createMemo(() => {

        listen_to_resize()

        if (!$element) {
            return 0
        }

        const elementHeight = $element.offsetHeight;


        const computedStyle = window.getComputedStyle($element);

        let iLineHeight = 0

        let lineHeight = computedStyle.lineHeight;

        // Convert line-height to a number (pixels) if it's not already
        if (lineHeight.includes('px')) {
            iLineHeight = parseFloat(lineHeight);
        } else {
            // If it's unitless or 'normal', you need a more robust way to determine pixel height,
            // typically by creating a dummy element or using a known multiplier (e.g., 1.2 to 1.6 times font-size).
            const fontSize = parseFloat(computedStyle.fontSize);
            iLineHeight = fontSize * 1.2; // A common default multiplier
        }


        const numberOfLines = Math.floor(elementHeight / iLineHeight)
        
        return numberOfLines
    })


    const apply_motion_capture = (motion: { x: number, y: number, x2: number, y2: number }) => {
        if (state.visual_mode_rect) {
            set_state('visual_mode_rect', 'x2', motion.x2)
            set_state('visual_mode_rect', 'y2', motion.y2)
        }
    }

    const apply_yank_delete_to_box = (box: { x: number, y: number, x2: number, y2: number }) => {

        let yanked_text = ''

        let next_cursor_line = -1
        let next_cursor_char = -1

        let full_lines_a = -1,
            full_lines_b = -1

        let half_lines_x_to_rightmost = -1,
            half_lines_x_to_rightmost_y = -1

        let half_lines_x_to_leftmost = -1,
            half_lines_x_to_leftmost_y = -1
        
        if (box.y < box.y2) {
            full_lines_a = box.y + 1
            full_lines_b = box.y2 - 1
            next_cursor_line = box.y + 1

            next_cursor_char = 0


            half_lines_x_to_rightmost = box.x
            half_lines_x_to_rightmost_y = box.y

            half_lines_x_to_leftmost = box.x2
            half_lines_x_to_leftmost_y = box.y2

        }

        if (box.y2 < box.y) {
            full_lines_a = box.y2 + 1
            full_lines_b = box.y - 1
            next_cursor_line = box.y2 + 1

            half_lines_x_to_rightmost = box.x2
            half_lines_x_to_rightmost_y = box.y2

            half_lines_x_to_leftmost = box.x
            half_lines_x_to_leftmost_y = box.y
        }

        batch(() => {

            if (half_lines_x_to_rightmost !== -1) {
                set_state('lines', half_lines_x_to_rightmost_y,
                    state.lines[half_lines_x_to_rightmost_y].slice(0, half_lines_x_to_rightmost)
                )
            }

            if (half_lines_x_to_leftmost !== -1) {
                set_state('lines', half_lines_x_to_leftmost_y,
                    state.lines[half_lines_x_to_leftmost_y].slice(half_lines_x_to_leftmost)
                )
            }

            if (full_lines_a <= full_lines_b) {
                yanked_text += state.lines.slice(full_lines_a, full_lines_b + 1).join('\n')
                set_state('lines', _ => _.toSpliced(full_lines_a, full_lines_b - full_lines_a + 1))
            }

            set_state('yanked_text', yanked_text)
            set_state('cursor_line', next_cursor_line)
            set_state('cursor_char', Math.max(0, Math.min(state.lines[state.cursor_line].length, next_cursor_char)))

            set_state('visual_mode_rect', undefined)
        })
    }

    function push_redo() {
        let stack = {
            lines: state.lines.slice(),
            cursor_line: state.cursor_line,
            cursor_char: state.cursor_char
        }
        redo_stack.push(stack)
        if (redo_stack.length > 10) {
            redo_stack = redo_stack.slice(-1)
        }
    }



    function push_undo() {
        let stack = {
            lines: state.lines.slice(),
            cursor_line: state.cursor_line,
            cursor_char: state.cursor_char
        }
        undo_stack.push(stack)
        if (undo_stack.length > 10) {
            undo_stack = undo_stack.slice(-1)
        }
    }

    function undo() {
        let undo_state = undo_stack.pop()

        if (undo_state) {
        push_redo()
            set_state('lines', undo_state.lines)
            set_state('cursor_line', undo_state.cursor_line)
            set_state('cursor_char', undo_state.cursor_char)

            on_cursor_change()
        }
    }

    function redo() {
        let redo_state = redo_stack.pop()

        if (redo_state) {
            push_undo()
            set_state('lines', redo_state.lines)
            set_state('cursor_line', redo_state.cursor_line)
            set_state('cursor_char', redo_state.cursor_char)

            on_cursor_change()
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
        normal_mode_undo() {
            undo()
        },
        normal_mode_redo() {
            redo()
        },
        normal_mode_begin_motion_capture() {
            set_state('motion_capture_begin', { x: state.cursor_char, y: state.cursor_line })
        },
        normal_mode_end_motion_capture() {
            let { x, y }  = state.motion_capture_begin
            let x2 = state.cursor_char
            let y2 = state.cursor_line

            let motion = { x, y, x2, y2 }

            apply_motion_capture(motion)
        },
        normal_mode_begin_visual_mode() {
            set_state('visual_mode_rect', { x: state.cursor_char, y: state.cursor_line, x2: state.cursor_char, y2: state.cursor_line })
        },
        normal_mode_end_visual_mode() {
            set_state('visual_mode_rect', undefined)
        },
        normal_mode_delete_char() {
            push_undo()
            let line = state.lines[state.cursor_line]
            let new_line = line.slice(0, state.cursor_char) + line.slice(state.cursor_char + 1)
            batch(() => {
                set_state('lines', state.cursor_line, new_line)
                //set_state('cursor_char', state.cursor_char + 1)
            })
        },
        normal_mode_set_cursor_append_char() {
            push_undo()
            set_state('cursor_char', state.cursor_char + 1)
        },
        normal_mode_set_cursor_append_end_of_line() {
            push_undo()
            set_state('cursor_char', state.lines[state.cursor_line].length)
        },
        normal_mode_o_newline_set_in_edit_mode() {
            push_undo()
            batch(() => {
                set_state('lines', _ => state.lines.toSpliced(state.cursor_line + 1, 0, ''))
                set_state('cursor_line', state.cursor_line + 1)
                set_state('cursor_char', 0)
            })
        }, 
        normal_mode_o_newline_above_set_in_edit_mode() {
            push_undo()
            batch(() => {
                set_state('lines', _ => state.lines.toSpliced(state.cursor_line, 0, ''))
                set_state('cursor_line', state.cursor_line)
                set_state('cursor_char', 0)
            })
        }, 
        normal_mode_change_end_of_line() {
            push_undo()
            batch(() => {
                let line_a = state.lines[state.cursor_line].slice(0, state.cursor_char)
                set_state('lines', _ => state.lines.toSpliced(state.cursor_line, 1, line_a))
                set_state('cursor_char', state.lines[state.cursor_line].length)
                set_state('mode', 'edit')
            })
        },
        normal_mode_motion_up() {
            batch(() => {
                actions.normal_mode_begin_motion_capture()
                if (state.cursor_line === 0) {
                    return
                }
                set_state('cursor_line', state.cursor_line - 1)
                let line = state.lines[state.cursor_line]
                if (state.cursor_char > line.length) {
                    set_state('cursor_char', line.length)
                }
                on_cursor_change()

                actions.normal_mode_end_motion_capture()
            })
        },
        normal_mode_motion_down() {
            batch(() => {
                actions.normal_mode_begin_motion_capture()
                if (state.cursor_line >= state.lines.length - 1) {
                    return
                }
                set_state('cursor_line', state.cursor_line + 1)
                let line = state.lines[state.cursor_line]
                if (state.cursor_char > line.length) {
                    set_state('cursor_char', line.length)
                }
                on_cursor_change()
                actions.normal_mode_end_motion_capture()
            })
        },
        normal_mode_motion_left() {
            batch(() => {
                actions.normal_mode_begin_motion_capture()
                if (state.cursor_char === 0) {
                    return
                }
                set_state('cursor_char', state.cursor_char - 1)
                actions.normal_mode_end_motion_capture()
            })
        },
        normal_mode_motion_right() {
            batch(() => {
                actions.normal_mode_begin_motion_capture()
                if (state.cursor_char === state.lines[state.cursor_line].length - 1) {
                    return
                }
                set_state('cursor_char', state.cursor_char + 1)
                actions.normal_mode_end_motion_capture()
            })
        },
        normal_mode_motion_back_word() {

            actions.normal_mode_begin_motion_capture()
            let line = state.lines[state.cursor_line]
            let i = state.cursor_char
            while (i > 0) {
                if (!/[a-zA-Z0-9]/.test(line[--i])) {
                    break
                }
            }
            set_state('cursor_char', i)
            actions.normal_mode_end_motion_capture()
        },
        normal_mode_motion_back_word_whitespace() {
            actions.normal_mode_begin_motion_capture()

            let line = state.lines[state.cursor_line]
            let i = state.cursor_char
            while (i > 0) {
                if (/\s/.test(line[--i])) {
                    break
                }
            }
            set_state('cursor_char', i)
            actions.normal_mode_end_motion_capture()
        },
        normal_mode_motion_forward_word() {
            actions.normal_mode_begin_motion_capture()
            let line = state.lines[state.cursor_line]
            let i = state.cursor_char
            while (i < line.length) {
                if (line[++i] === ' ') {
                    break
                }
            }
            set_state('cursor_char', i)
            actions.normal_mode_end_motion_capture()
        },
        normal_mode_motion_goto_end_of_line() {
            actions.normal_mode_begin_motion_capture()
            let line = state.lines[state.cursor_line]
            set_state('cursor_char', Math.max(0, line.length - 1))
            actions.normal_mode_end_motion_capture()
        },
        normal_mode_join_lines() {
            push_undo()
            batch(() => {
                let line_ab = state.lines[state.cursor_line] + state.lines[state.cursor_line + 1]
                set_state('lines', _ => state.lines.toSpliced(state.cursor_line, 2, line_ab))
                //set_state('cursor_line', state.cursor_line)
                //set_state('cursor_char', 0)
            })
        },
        normal_mode_goto_beginning_of_line() {
            actions.normal_mode_begin_motion_capture()
            let i = 0
            while (i < state.lines[state.cursor_line].length) {
                if (state.lines[state.cursor_line][i] !== ' ') {
                    break
                }
                i++
            }
            set_state('cursor_char', i)
            actions.normal_mode_end_motion_capture()
        },
        normal_mode_yank_yank_line() {

            if (state.motion_cmd === 'none') {
                set_state('motion_cmd', 'yank')
            } else if (state.motion_cmd === 'yank') {
                set_state('yanked_line', state.lines[state.cursor_line])
                set_state('motion_cmd', 'none')
            }
        },
        normal_mode_delete_delete_line() {

            push_undo()
            if (state.motion_cmd === 'none') {

                if (state.visual_mode_rect) {
                    apply_yank_delete_to_box(state.visual_mode_rect)
                } else {
                    set_state('motion_cmd', 'delete')
                }
            } else if (state.motion_cmd === 'delete') {
                set_state('yanked_line', state.lines[state.cursor_line])
                set_state('lines', _ => _.toSpliced(state.cursor_line, 1))
                set_state('motion_cmd', 'none')
            }
        },
        normal_mode_change_change_line() {

            push_undo()
            if (state.motion_cmd === 'none') {
                set_state('motion_cmd', 'change')
            } else if (state.motion_cmd === 'change') {
                set_state('yanked_line', state.lines[state.cursor_line])
                set_state('lines', _ => _.toSpliced(state.cursor_line, 1, ''))
                set_state('motion_cmd', 'none')
                set_state('mode', 'edit')
            }
        },
        normal_mode_yank_text() {

            if (state.yanked_line !== '') {
                set_state('lines', _ => _.toSpliced(state.cursor_line + 1, 0, state.yanked_line))
                set_state('cursor_line', state.cursor_line + 1)

            }
        },
        normal_mode_insert_wall_of_text(text: string) {
            push_undo()
            let lines = text.split('\n')
            batch(() => {

                let content = state.lines[state.cursor_line]
                let new_content = content.slice(0, state.cursor_char) + lines[0] + content.slice(state.cursor_char)


                set_state('lines', state.cursor_line, new_content)
                set_state('cursor_char', state.cursor_char + lines[0].length)

                for (let l of lines.slice(1)) {
                    set_state('lines', lines => lines.toSpliced(state.cursor_line + 1, 0, l))
                    set_state('cursor_char', l.length)
                    set_state('cursor_line', state.cursor_line + 1)
                }
            })

        },
        normal_mode_replace_replace_char(char?: string) {
            if (state.motion_cmd === 'none') {
                set_state('motion_cmd', 'replace')
            } else if (state.motion_cmd === 'replace') {
                if (char !== undefined && char.length === 1) {
                    let new_line = state.lines[state.cursor_line].slice(0, state.cursor_char) + char + state.lines[state.cursor_line].slice(state.cursor_char + 1)
                    set_state('lines', state.cursor_line, new_line)
                }
                set_state('motion_cmd', 'none')
            }
        },
        on_escape() {
            set_state('mode', 'normal')
            set_state('motion_cmd', 'none')
        },
        normal_mode_goto_goto_line() {
            if (state.motion_cmd === 'none') {
                set_state('motion_cmd', 'goto')
            } else if (state.motion_cmd === 'goto') {
                set_state('cursor_line', 0)
                on_cursor_change()
                set_state('motion_cmd', 'none')
            }
        },
        normal_mode_motion_goto_end_of_page() {
            set_state('cursor_line', state.lines.length - 1)
            on_cursor_change()
        },
        normal_mode_page_up() {
            set_state('cursor_line', Math.max(0, state.cursor_line - 11))
            on_cursor_change()
        },
        normal_mode_page_down() {
            set_state('cursor_line', Math.min(state.cursor_line + 11, state.lines.length - 1))
            on_cursor_change()
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
    <div ref={$element} class='editor h-full w-full flex flex-col space-mono-regular text-sm font-bold bg-zinc-700 text-amber-50'>
            <div class='area whitespace-pre flex-1 overflow-hidden'>
                <For each={state.lines}>{(line, index) =>
                    <Show when={index() >= state.camera_y}>
                        <Show when={index() === state.cursor_line} fallback={
                            <div class='line'><BlockLine line={line} index={index()} off_x={0} vi_rect={state.visual_mode_rect}/> </div>
                        }>
                            <div class='line'>
                                <span><BlockLine line={line.slice(0, state.cursor_char)} off_x={0} index={index()} vi_rect={state.visual_mode_rect}/></span>
                                <span class='relative'>
                                    <Cursor state={state} char={line[state.cursor_char]} />
                                </span>
                                <Show when={state.cursor_char < state.lines[state.cursor_line].length}>
                                    <span><BlockLine line={line.slice(state.cursor_char + 1)} off_x={state.cursor_char + 1} index={index()} vi_rect={state.visual_mode_rect}/></span>
                                </Show>

                            </div>
                        </Show>
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

function BlockLine(props: { line: string, off_x: number, index: number, vi_rect?: { x: number, y: number, x2: number, y2: number }}) {
    return (<>
        <For each={props.line.split('')}>{(char, i) => 
            <Char char={char} x={props.off_x + i()} y={props.index} vi_rect={props.vi_rect}/>
        }</For>
    </>)
}

function Char(props: { char: string, x: number, y: number, vi_rect?: { x: number, y: number, x2: number, y2: number }}) {
    const is_in_vi_rect = createMemo(() => {
        if (!props.vi_rect) {
            return false
        }

        if (props.vi_rect.y === props.vi_rect.y2) {
            let min_x = Math.min(props.vi_rect.x, props.vi_rect.x2)
            let max_x = Math.max(props.vi_rect.x, props.vi_rect.x2)

            if (props.y === props.vi_rect.y) {
                if (props.x >= min_x && props.x <= max_x) {
                    return true
                }
            }
        }


        if (props.vi_rect.y < props.vi_rect.y2) {
            if (props.y === props.vi_rect.y) {
                if (props.x >= props.vi_rect.x) {
                    return true
                }
            }
            if (props.y > props.vi_rect.y && props.y < props.vi_rect.y2) {
                return true
            }

            if (props.y === props.vi_rect.y2) {
                if (props.x <= props.vi_rect.x2) {
                    return true
                }
            }
        }


        if (props.vi_rect.y2 < props.vi_rect.y) {
            if (props.y === props.vi_rect.y2) {
                if (props.x >= props.vi_rect.x2) {
                    return true
                }
            }

            if (props.y > props.vi_rect.y2 && props.y < props.vi_rect.y) {
                return true
            }


            if (props.y === props.vi_rect.y) {
                if (props.x <= props.vi_rect.x) {
                    return true
                }
            }

        }



    })

    return (<>
        <span class='relative'>
            <span>{props.char}</span>
            <span class={`left-0 opacity-30 absolute w-full h-full ${is_in_vi_rect() ? 'bg-slate-300' : ''}`}></span>
        </span>
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
                actions.on_escape()
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

        if (state.motion_cmd === 'replace') {
            actions.normal_mode_replace_replace_char(e.key)
            return
        }

        switch (e.key) {
            case '$':
                actions.normal_mode_motion_goto_end_of_line()
                break
            case 'g':  case 'G': 
                if (e.shiftKey) {
                    actions.normal_mode_motion_goto_end_of_page()
                } else {
                    actions.normal_mode_goto_goto_line()
                }
            break
            case 'v': 
                if (e.ctrlKey) {
                    navigator.clipboard.readText().then(_ => {
                        let res = _.split('\r\n').join('\n')
                        actions.normal_mode_insert_wall_of_text(res)
                    })
                } else {
                    actions.normal_mode_begin_visual_mode()
                }
                break
            case 'Escape':
                actions.set_mode('normal')
                actions.normal_mode_end_visual_mode()
                break
            case ':':
                actions.set_mode('command')
                break
            case 'i':
                actions.set_mode('edit')
                break
            case 'u':
                if (e.ctrlKey) {
                    actions.normal_mode_page_up()
                } else {
                    actions.normal_mode_undo()
                }
                break
            case 'r':
                if (e.ctrlKey) {
                    actions.normal_mode_redo()
                } else {
                    actions.normal_mode_replace_replace_char()
                }
                break
            case '_':
                actions.normal_mode_goto_beginning_of_line()
                break
            case 'x':
                actions.normal_mode_delete_char()
                break
            case 'y':
                actions.normal_mode_yank_yank_line()
                break
            case 'd':
                if (e.ctrlKey) {
                    actions.normal_mode_page_down()
                } else {
                    actions.normal_mode_delete_delete_line()
                }
                break
            case 'p':
                actions.normal_mode_yank_text()
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
                    actions.normal_mode_change_change_line()
                }
                break
            case 'w':
                actions.normal_mode_motion_forward_word()
                break
            case 'b': case 'B':
                if (e.shiftKey) {
                    actions.normal_mode_motion_back_word_whitespace()
                } else {
                    actions.normal_mode_motion_back_word()
                }
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