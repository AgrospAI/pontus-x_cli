import { withLogin } from "@test/helpers/login";
import { extractJson } from "@test/helpers/parser";
import { diff } from "jest-diff";
import { expect, test, vi } from "vitest";
import Publish from "@/commands/publish";

const SCRIPT_FOLDER = "samples/publish/downloadable-data/spec.yaml";

test(
  "publish command works with valid script folder after login",
  withLogin(async () => {
    await Publish.run([SCRIPT_FOLDER, "--dry-run"]);
  }),
);

test(
  "publish command output is the same for json, yaml and ts files",
  withLogin(async () => {
    // Array of sample folder paths that contain spec.json, spec.yaml and index.ts
    const sampleFolders = [
      "samples/publish/algo",
      "samples/publish/basic-predictor",
      "samples/publish/data",
      "samples/publish/downloadable-data",
      "samples/publish/forecasting",
      "samples/publish/forecasting-data",
    ];

    // Spy on console.log to capture output
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      const runAndExtract = async (file: string) => {
        await Publish.run([file, "--dry-run"]);
        const output = consoleLogSpy.mock.calls
          .map((call) => call.join(" "))
          .join("\n");
        consoleLogSpy.mockClear();

        if (!output) {
          throw new Error(
            `Publish command returned empty output for file: ${file}`,
          );
        }

        return extractJson(output);
      };

      // Test each sample folder in parallel
      await Promise.all(
        sampleFolders.map(async (folder) => {
          console.log(`Testing folder: ${folder}`);

          const jsonPath = `${folder}/spec.json`;
          const yamlPath = `${folder}/spec.yaml`;
          const tsPath = `${folder}/index.ts`;

          const [jsonObject, yamlObject, tsObject] = await Promise.all([
            runAndExtract(jsonPath),
            runAndExtract(yamlPath),
            runAndExtract(tsPath),
          ]);

          try {
            expect(jsonObject).toEqual(yamlObject);
          } catch (error) {
            const diffMsg = `\nDiff:\n${diff(jsonObject, yamlObject)}`;
            throw new Error(
              `Mismatch between JSON and YAML in folder: ${folder}\n` +
                `  JSON file: ${jsonPath}\n  YAML file: ${yamlPath}\n` +
                `  Error: ${error instanceof Error ? error.message : error}` +
                diffMsg,
            );
          }

          try {
            expect(jsonObject).toEqual(tsObject);
          } catch (error) {
            const diffMsg = `\nDiff:\n${diff(jsonObject, tsObject)}`;
            throw new Error(
              `Mismatch between JSON and TS in folder: ${folder}\n` +
                `  JSON file: ${jsonPath}\n  TS file: ${tsPath}\n` +
                `  Error: ${error instanceof Error ? error.message : error}` +
                diffMsg,
            );
          }
        }),
      );
    } finally {
      // Restore console.log
      consoleLogSpy.mockRestore();
    }
  }),
);
