export class UsbConnectionError extends Error {
  code = 'USB_CONNECTION_LOST';
  constructor() {
    super('La tastiera non risponde. Riconnettila e riprova; alcune modifiche potrebbero essere già applicate.');
  }
}

const guards = new WeakMap();

// SDK 1.0.24 leaves queued promises pending on null replies and errors other than "Read timeout".
export function guardUsbQueue(base, { timeoutMs = 3500, onFailure } = {}) {
  const previous = guards.get(base);
  if (previous) { previous.failed = false; previous.onFailure = onFailure; return; }
  const session = { failed: false, onFailure };
  guards.set(base, session);
  const queues = [
    ['flushQueue', 'commandQueueWrapper', false],
    ['flushQueueMultiple', 'commandQueueWrapperMultiple', true],
  ];
  for (const [flush, property, multiple] of queues) {
    base[flush] = async () => {
      const queue = base[property];
      if (queue.isFlushing) return;
      queue.isFlushing = true;
      try {
        while (queue.commandQueue.length && queue.isFlushing) {
          const request = queue.commandQueue[0];
          let timer;
          try {
            if (session.failed) throw new UsbConnectionError();
            if (typeof request.args === 'function') { await request.args(); request.res(); }
            else {
              const response = await Promise.race([
                multiple
                  ? base.hidService.sendReportAndWaitMultipleResponses(request.args, request.expectedResponses, request.timeout, request.sendTime)
                  : base.hidService.sendReportAndWaitResponse(request.args, request.timeout, request.sendTime),
                new Promise((_, reject) => { timer = setTimeout(() => reject(new UsbConnectionError()), timeoutMs); }),
              ]);
              if (!response || (multiple && (!Array.isArray(response) || response.length !== request.expectedResponses))) throw new UsbConnectionError();
              request.res(multiple ? response : base.hidService.deviceUsagePage === 0xffb0
                ? new Uint8Array(response.buffer) : new Uint8Array(response.buffer).slice(4));
            }
          } catch {
            const error = new UsbConnectionError();
            request.rej(error);
            if (!session.failed) { session.failed = true; session.onFailure?.(error); }
          } finally {
            clearTimeout(timer);
            if (queue.commandQueue[0] === request) queue.commandQueue.shift();
          }
        }
      } finally {
        queue.isFlushing = false;
        const [otherFlush, otherProperty] = queues.find(([name]) => name !== flush);
        if (base[otherProperty].commandQueue.length && !base[otherProperty].isFlushing) void base[otherFlush]();
      }
    };
  }
}
