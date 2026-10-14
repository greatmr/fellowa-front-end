import "@testing-library/jest-dom/vitest";

import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";

import { server } from "./msw/server";

// Network is mocked at the boundary, never per-module. An unhandled request is
// an error so a test can never silently hit a real service.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());
