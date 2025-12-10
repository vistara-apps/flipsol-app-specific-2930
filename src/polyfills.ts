import { Buffer } from 'buffer';
import BN from 'bn.js';

// Ensure global is available
if (typeof global === 'undefined') {
    window.global = window;
}

// Ensure Buffer is available globally
if (typeof global.Buffer === 'undefined') {
    global.Buffer = Buffer;
}
if (typeof window.Buffer === 'undefined') {
    window.Buffer = Buffer;
}
// globalThis is the modern standard
if (typeof globalThis.Buffer === 'undefined') {
    globalThis.Buffer = Buffer;
}

// Ensure process is available (minimal polyfill)
if (typeof window.process === 'undefined') {
    // @ts-ignore
    window.process = { env: {} };
}

// Ensure BN is available globally for Anchor
if (typeof window.BN === 'undefined') {
    // @ts-ignore
    window.BN = BN;
}
if (typeof global.BN === 'undefined') {
    // @ts-ignore
    global.BN = BN;
}
