// Polyfills for browser compatibility
import { Buffer } from 'buffer';

// Make Buffer available globally
window.Buffer = Buffer;
globalThis.Buffer = Buffer;

// Polyfill for process if needed
if (typeof process === 'undefined') {
  window.process = { env: {}, browser: true };
}
