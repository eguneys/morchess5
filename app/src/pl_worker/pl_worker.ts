
import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
    
const __dirname = dirname(fileURLToPath(import.meta.url));

const prolog = spawn("swipl", [__dirname + "/worker.pl"]);

function validate(code: string) {

  let lines = code.split('\n')

  let builtin_functions = ['green', 'red', 'hlt']

  let variables = []

  let user_defined_functions = []
  for (let line of lines) {
    for (let m of line.matchAll(/^([a-z][A-Za-z_0-9]*) :- /g)) {
      user_defined_functions.push(m[1])
    }
  }

  for (let line of lines) {
    for (let m of line.matchAll(/([A-Z_][A-Za-z_0-9]*)/g)) {
      variables.push(m[1])
    }
  }



  let replace_all = [...builtin_functions, ...user_defined_functions]

  for (let line of lines) {

    for (let m of line.matchAll(/([A-Za-z_][A-Za-z_0-9]*)/g)) {
      if (!replace_all.includes(m[1]) && !variables.includes(m[1])) {
        return undefined
      }
    }
  }

  for (let r of replace_all) {
    code = code.replaceAll(r, `user_land_entry:${r}`)
  }

  return code
}

class PrologClient {

  static Instance = new PrologClient(prolog)

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
  
  execute(unsafeCode: string) {
    let code = validate(unsafeCode)

    if (!code) {
      return Promise.reject(new Error('Invalid Prolog code'))
    }
    const id = this.nextRequestId++;
    const payload = JSON.stringify({ id, code });
    
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

export async function run(code: string) {
  try {
  return await PrologClient.Instance.execute(code)
  } catch (e) {
    console.error(e)
  }
}

async function test_run2() {

  console.log(await run(`
green(X) :- hlt, X = 3.
`))

console.log(await run(`
green(1).
`))
console.log('done')




}

async function test_run() {
console.log(await run(`
green(1).
`))
console.log('done')


console.log(await run(`
green(X) :- red(X). 
red(X) :- green(X). 
`))
console.log('done')

console.log(await run(`
green(7).
`))
console.log(await run(`
green(8).
`))
console.log('asdf')
console.log(await run(`
green(7). green(8).
`))

console.log(await run(`
green(X) :- hlt, X = 3.
`))

console.log('after Halt')
console.log(await run(`
green(7). green(8).
`))
console.log('adsofn')

console.log(await run(`
green(1).
`))
console.log('done')


}


async function test_all() {
  await test_run()
  await test_run()

}

test_all()