import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Polyfill global fetch or crypto if not present
if (typeof globalThis.fetch === 'undefined') {
  // @ts-ignore
  globalThis.fetch = vi.fn();
}
