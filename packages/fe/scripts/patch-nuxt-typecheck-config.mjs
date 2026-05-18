import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRootDir = path.resolve(currentDir, "..");
const NUXT_DIR = path.resolve(packageRootDir, ".nuxt");
const ROUTE_BLOCK_PLUGIN = "vue-router/volar/sfc-route-blocks";

/**
 * Remove the invalid vue-router Volar route-block plugin from a generated Nuxt tsconfig file.
 *
 * @param {string} filePath
 * @returns {Promise<void>}
 */
const patchTypecheckConfig = async (filePath) => {
  const content = await readFile(filePath, "utf8");
  const config = JSON.parse(content);
  const plugins = config.vueCompilerOptions?.plugins;

  if (!Array.isArray(plugins)) {
    return;
  }

  const filteredPlugins = plugins.filter(
    (plugin) => plugin !== ROUTE_BLOCK_PLUGIN,
  );

  if (filteredPlugins.length === plugins.length) {
    return;
  }

  config.vueCompilerOptions.plugins = filteredPlugins;
  await writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
};

/**
 * @param {string} filePath
 * @returns {Promise<void>}
 */
const assertPluginRemoved = async (filePath) => {
  const content = await readFile(filePath, "utf8");

  if (content.includes(ROUTE_BLOCK_PLUGIN)) {
    throw new Error(`Failed to remove ${ROUTE_BLOCK_PLUGIN} from ${filePath}`);
  }
};

/**
 * Patch every generated Nuxt tsconfig file used by vue-tsc.
 *
 * @returns {Promise<void>}
 */
const main = async () => {
  const entries = await readdir(NUXT_DIR);
  const typecheckConfigs = entries
    .filter((entry) => entry.startsWith("tsconfig") && entry.endsWith(".json"))
    .map((entry) => path.join(NUXT_DIR, entry));

  await Promise.all(
    typecheckConfigs.map((configPath) => patchTypecheckConfig(configPath)),
  );
  await Promise.all(
    typecheckConfigs.map((configPath) => assertPluginRemoved(configPath)),
  );
};

await main();
