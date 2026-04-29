import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import istanbulCoverage from "istanbul-lib-coverage";
import istanbulReport from "istanbul-lib-report";
import istanbulReports from "istanbul-reports";

const COVERAGE_FILES = [
  "packages/shared/coverage/coverage-final.json",
  "packages/be/coverage/coverage-final.json",
  "packages/fe/coverage/coverage-final.json",
];
const MIN_THRESHOLD = 90;

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "coverage");
const { createCoverageMap } = istanbulCoverage;
const { createContext } = istanbulReport;
const coverageMap = createCoverageMap({});

for (const relativeFile of COVERAGE_FILES) {
  const absoluteFile = path.join(rootDir, relativeFile);
  const contents = await readFile(absoluteFile, "utf8");
  coverageMap.merge(JSON.parse(contents));
}

await mkdir(outputDir, { recursive: true });
await writeFile(
  path.join(outputDir, "coverage-final.json"),
  JSON.stringify(coverageMap.toJSON()),
);

const context = createContext({
  coverageMap,
  dir: outputDir,
});

for (const reporter of ["json-summary", "lcov", "text-summary"]) {
  istanbulReports.create(reporter).execute(context);
}

const summary = JSON.parse(
  await readFile(path.join(outputDir, "coverage-summary.json"), "utf8"),
).total;

const metrics = [
  ["statements", summary.statements.pct],
  ["branches", summary.branches.pct],
  ["functions", summary.functions.pct],
  ["lines", summary.lines.pct],
];

console.log("Combined coverage summary:");

for (const [metric, value] of metrics) {
  console.log(`- ${metric}: ${value}%`);
}

if (process.argv.includes("--check")) {
  const failed = metrics.filter(([, value]) => value < MIN_THRESHOLD);

  if (failed.length > 0) {
    throw new Error(
      `Combined coverage threshold check failed. Expected at least ${MIN_THRESHOLD}% for ${failed
        .map(([metric]) => metric)
        .join(", ")}.`,
    );
  }
}
