import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers.js';

/**
 * Node-side MSW server that reuses the SAME request handlers as the browser
 * service worker. This lets tests exercise the real API contract in-process,
 * without the service worker.
 */
export const server = setupServer(...handlers);
