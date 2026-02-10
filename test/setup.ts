import { resetEnvContent, setupEnvFsMock } from "@test/helpers/env-mock";
import { afterEach, beforeEach, vi } from "vitest";

// let consoleOutput: string[] = []
// export {consoleOutput}

setupEnvFsMock();

beforeEach(() => {
  // Capture console.log output
  // consoleOutput = []
  // vi.spyOn(console, 'log').mockImplementation((...args) => {
  //   consoleOutput.push(args.join(' '))
  // })

  // Reset in-memory .env before each test
  resetEnvContent();
});

afterEach(() => {
  vi.restoreAllMocks();
});
