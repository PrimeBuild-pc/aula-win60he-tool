import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

export function createHidTransport() {
  const bridge = spawn('python', [fileURLToPath(new URL('./hid-bridge.py', import.meta.url))], { windowsHide: true, stdio: ['pipe', 'pipe', 'inherit'] });
  const lines = createInterface({ input: bridge.stdout });
  let pending;
  lines.on('line', line => {
    const result = JSON.parse(line);
    if (result.error) pending?.reject(new Error(result.error)); else pending?.resolve(result.packet);
    pending = null;
  });
  bridge.on('error', error => pending?.reject(error));
  bridge.on('exit', code => pending?.reject(new Error(`HID bridge closed: ${code}`)));
  return {
    send: async packet => {
      if (pending) throw new Error('Concurrent HID command');
      return new Promise((resolve, reject) => { pending = { resolve, reject }; bridge.stdin.write(`${JSON.stringify([...packet])}\n`); });
    },
    close: () => bridge.stdin.end(),
  };
}
