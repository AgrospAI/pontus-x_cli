import { vi } from "vitest";

let envContent = "";

export function setupEnvFsMock() {
  vi.mock("node:fs", async () => {
    const fs = await vi.importActual<typeof import("node:fs")>("node:fs");
    return {
      ...fs,
      existsSync(path: string) {
        if (path === ".env") return true;
        return fs.existsSync(path);
      },
      mkdirSync() {},
      readFileSync(path: string, ...args: any[]) {
        if (path === ".env") return envContent;
        return fs.readFileSync(path, ...args);
      },
      writeFileSync(path: string, data: any) {
        if (path === ".env") {
          envContent = data.toString();
        }
      },
    };
  });
}

export function getEnvVariable(key: string) {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1] : null;
}

export function resetEnvContent() {
  envContent = "";
}
