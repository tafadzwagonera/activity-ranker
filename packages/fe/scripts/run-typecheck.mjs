import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRootDir = path.resolve(currentDir, "..");
const nodeBinPath = process.execPath;
const nuxtBinPath = path.resolve(packageRootDir, "node_modules/.bin/nuxt");
const patchScriptPath = path.resolve(
  packageRootDir,
  "scripts/patch-nuxt-typecheck-config.mjs",
);
const vueTscBinPath = path.resolve(packageRootDir, "node_modules/.bin/vue-tsc");
const routeBlockPluginError =
  "[Vue] Load plugin failed: vue-router/volar/sfc-route-blocks";
const routeBlockPluginStackPrefix =
  "[Vue] Failed to create plugin TypeError: plugin is not a function";

/**
 * @param {NodeJS.ReadableStream} stream
 * @param {NodeJS.WriteStream} outputStream
 * @param {{ suppressRouteBlockPluginError?: boolean }} options
 * @returns {Promise<void>}
 */
const pipeOutput = (stream, outputStream, options = {}) =>
  new Promise((resolve) => {
    let pendingText = "";
    let suppressStackTrace = false;

    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      pendingText += chunk;
      const lines = pendingText.split("\n");
      pendingText = lines.pop() ?? "";

      for (const line of lines) {
        if (
          options.suppressRouteBlockPluginError &&
          line.includes(routeBlockPluginError)
        ) {
          suppressStackTrace = false;
          continue;
        }

        if (
          options.suppressRouteBlockPluginError &&
          line.includes(routeBlockPluginStackPrefix)
        ) {
          suppressStackTrace = true;
          continue;
        }

        if (suppressStackTrace) {
          if (line.startsWith("    at ")) {
            continue;
          }

          suppressStackTrace = false;
        }

        outputStream.write(`${line}\n`);
      }
    });

    stream.on("end", () => {
      if (
        pendingText &&
        (!options.suppressRouteBlockPluginError ||
          (!pendingText.includes(routeBlockPluginError) &&
            !pendingText.includes(routeBlockPluginStackPrefix) &&
            !pendingText.startsWith("    at ")))
      ) {
        outputStream.write(pendingText);
      }

      resolve();
    });
  });

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ suppressRouteBlockPluginError?: boolean }} options
 * @returns {Promise<void>}
 */
const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      cwd: packageRootDir,
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const outputPromises = [
      pipeOutput(childProcess.stdout, process.stdout, options),
      pipeOutput(childProcess.stderr, process.stderr, options),
    ];

    childProcess.on("error", reject);
    childProcess.on("exit", async (exitCode) => {
      await Promise.all(outputPromises);

      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${exitCode ?? -1}`));
    });
  });

await runCommand(nuxtBinPath, ["prepare"]);
await runCommand(nodeBinPath, [patchScriptPath]);
await runCommand(
  vueTscBinPath,
  ["--project", "./.nuxt/tsconfig.json", "--noEmit"],
  { suppressRouteBlockPluginError: true },
);
