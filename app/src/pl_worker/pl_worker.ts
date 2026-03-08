
import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Puzzle } from "../puzzles_fixture.js";
    
const __dirname = dirname(fileURLToPath(import.meta.url));

const prolog = spawn("swipl", [__dirname + "/worker.pl"]);
const prolog2_categorizer = spawn("swipl", [__dirname + "/worker_category.pl"]);

const files = 'abcdefgh'.split('')
const ranks = '12345678'.split('')
const roles = [
  'bishop',
  'rook',
  'knight',
  'pawn',
  'king',
  'queen']

const colors = ['white', 'black']

const Root = ['root', 'move', 'step']

const Builtin_Functions = `
green
red
piece_at
history
hyp_world
attacks
side_to_move
opposite_color
bishop_attack
empty
`.trim().split(`\n`)

const Square_Names = files.flatMap(file => ranks.map(rank => `${file}${rank}`))

export function validate(code: string) {

  let lines = code.split('\n')

  const builtin_facts = [...Square_Names, ...roles, ...colors, ...Root]
  let builtin_functions = Builtin_Functions

  let categories = []

  let variables = []

  let user_defined_functions = []
  for (let line of lines) {
    for (let m of line.matchAll(/^tactic_detector\((c_[A-Z][A-Za-z_0-9]*),/g)) {
      categories.push(m[1])
    }

    for (let m of line.matchAll(/^([a-z][A-Za-z_0-9]*) :- /g)) {
      user_defined_functions.push(m[1])
    }
    for (let m of line.matchAll(/^([a-z][A-Za-z_0-9]*):- /g)) {
      user_defined_functions.push(m[1])
    }
    for (let m of line.matchAll(/^([a-z][A-Za-z_0-9]*)\(/g)) {
      user_defined_functions.push(m[1])
    }
  }

  for (let line of lines) {
    for (let m of line.matchAll(/([A-Z_][A-Za-z_0-9]*)/g)) {
      variables.push(m[1])
    }
  }

  for (let line of lines) {

    for (let m of line.matchAll(/([A-Za-z_][A-Za-z_0-9]*)/g)) {
      if (m[1] === 'tactic_detector') {
        continue
      }
      if (categories.includes(m[1])) {
        continue
      }
      if (user_defined_functions.includes(m[1])) {
        continue
      } 
      if (builtin_functions.includes(m[1])) {
        continue
      } 
      if (variables.includes(m[1])) {
        continue
      }
      if (builtin_facts.includes(m[1])) {
        continue
      }
      return undefined
    }
  }

  let replace_all = [...builtin_functions]
  for (let r of replace_all) {
    code = code.replaceAll(r, `user_land_entry:${r}`)
  }

  let categorize_replace = ['tactic_detector']

  for (let r of categorize_replace) {
    code = code.replaceAll(r, `user_land_categorizer:${r}`)
  }

  return code
}

export class PrologClient {

  static Instance = new PrologClient(prolog)
  static Instance2_Categorizer = new PrologClient(prolog2_categorizer)

  prolog: ChildProcessWithoutNullStreams
  pendingRequests: Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>
  nextRequestId: number

  constructor(prologProcess: ChildProcessWithoutNullStreams) {
    this.prolog = prologProcess;
    this.pendingRequests = new Map();
    this.nextRequestId = 1;
    this.setupResponseHandler();
  }
  
  setupResponseHandler() {
    let buffer = '';
    
    this.prolog.stdout.on('data', data => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop()!; // Keep incomplete line
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            const { id, result, error } = response;
            // Find and resolve the corresponding promise
            const handler = this.pendingRequests.get(id);
            if (handler) {
              this.pendingRequests.delete(id);
              if (error) {
                handler.reject(new Error(error));
              } else {
                handler.resolve(result);
              }
            }
          } catch (e) {
            console.error('Failed to parse response:', line);
          }
        }
      }
    });
    
    // Keep stderr for logging/debugging only
    this.prolog.stderr.on('data', data => {
      console.log('Prolog stderr:', data.toString());
    });
  }
  

  execute_category(unsafeCode: string, puzzles: Puzzle[]) {
    let code = validate(unsafeCode)

    if (!code) {
      return Promise.resolve({error: "Invalid Prolog Code."})
    }

    let rows = puzzles.map(_ => [_.id, _.fen2, _.solution])

    const id = this.nextRequestId++;
    const payload = JSON.stringify({ id, code, rows });
    
    return new Promise((resolve, reject) => {
      // Store promise handlers
      this.pendingRequests.set(id, { resolve, reject });
      
      // Send request
      this.prolog.stdin.write(payload + '\n');
      
      // Timeout handling
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 8000);
    });
  }


  execute(unsafeCode: string, fen: string) {
    let code = validate(unsafeCode)

    if (!code) {
      return Promise.resolve({error: "Invalid Prolog Code."})
    }
    const id = this.nextRequestId++;
    const payload = JSON.stringify({ id, code, fen });
    
    return new Promise((resolve, reject) => {
      // Store promise handlers
      this.pendingRequests.set(id, { resolve, reject });
      
      // Send request
      this.prolog.stdin.write(payload + '\n');
      
      // Timeout handling
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 5000);
    });
  }
}

export async function run_category(code: string, puzzles: Puzzle[]) {
  try {
    return await PrologClient.Instance2_Categorizer.execute_category(code, puzzles)
  } catch (e) {
    console.error(e)
  }
}



export async function run(code: string, Fen: string) {
  try {
    return await PrologClient.Instance.execute(code, Fen)
  } catch (e) {
    console.error(e)
  }
}

async function test_run2() {

  let fen = ''
  console.log(await run(`
green(X) :- hlt, X = 3.
`, fen))

console.log(await run(`
green(1).
`, fen))
console.log('done')




}

async function test_run() {
  let fen = ''
console.log(await run(`
green(1).
`, fen))
console.log('done')


console.log(await run(`
green(X) :- red(X). 
red(X) :- green(X). 
`, fen))
console.log('done')

console.log(await run(`
green(7).
`, fen))
console.log(await run(`
green(8).
`, fen))
console.log('asdf')
console.log(await run(`
green(7). green(8).
`, fen))

console.log(await run(`
green(X) :- hlt, X = 3.
`, fen))

console.log('after Halt')
console.log(await run(`
green(7). green(8).
`, fen))
console.log('adsofn')

console.log(await run(`
green(1).
`, fen))
console.log('done')


}


async function test_all() {
  await test_run()
  await test_run()

}

//test_all()