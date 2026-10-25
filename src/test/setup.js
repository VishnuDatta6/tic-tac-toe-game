import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { server } from './server.js';
import { resetStore } from '../mocks/store.js';
import { setMockLatency } from '../mocks/handlers.js';

// Disable artificial latency so tests are fast and deterministic.
setMockLatency(0);

// Lifecycle wiring for the MSW node server.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  server.resetHandlers();
  cleanup();
  resetStore();
});

afterAll(() => server.close());

beforeEach(() => {
  // Start each test from a clean session + store.
  resetStore();
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
});
