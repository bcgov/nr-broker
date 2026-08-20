// ResizeObserver is not available in jsdom
globalThis.ResizeObserver = class ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
};

// Silence benign, test-only console noise so the test run output stays readable
// without masking real warnings/errors. Only the two specific known-benign
// messages are filtered; everything else is forwarded to the original console.
const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

// NG0953: emitted to a destroyed OutputRef. In the shared-worker test setup a
// component's async effect can fire after another component's fixture is
// destroyed, producing teardown-order warnings that bleed across specs.
const NG0953 = /Unexpected emit for destroyed `OutputRef`/;

// ngx-sse-client logs a reconnect notice whenever a keep-alive stream completes
// (createEventSource() reports the error event). Harmless in tests.
const SSE_RECONNECT = /Server response ended, will reconnect/;

function isBenign(...args: unknown[]): boolean {
  for (const arg of args) {
    const text = typeof arg === 'string' ? arg : safeStringify(arg);
    if (NG0953.test(text) || SSE_RECONNECT.test(text)) {
      return true;
    }
  }
  return false;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

console.warn = (...args: unknown[]) => {
  if (!isBenign(...args)) {
    originalWarn(...args);
  }
};

console.error = (...args: unknown[]) => {
  if (!isBenign(...args)) {
    originalError(...args);
  }
};
