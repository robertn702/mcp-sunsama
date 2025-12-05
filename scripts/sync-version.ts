#!/usr/bin/env bun
/**
 * Syncs the version from package.json to src/constants.ts
 * Run automatically as part of `bun run version`
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT_DIR = join(import.meta.dirname, "..");
const PACKAGE_JSON_PATH = join(ROOT_DIR, "package.json");
const CONSTANTS_PATH = join(ROOT_DIR, "src", "constants.ts");

// Read version from package.json
const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf-8"));
const version = packageJson.version;

// Read constants.ts
let constantsContent = readFileSync(CONSTANTS_PATH, "utf-8");

// Replace VERSION value
const versionRegex = /export const VERSION = "[^"]+";/;
const newVersionLine = `export const VERSION = "${version}";`;

if (!versionRegex.test(constantsContent)) {
  console.error("Could not find VERSION export in constants.ts");
  process.exit(1);
}

constantsContent = constantsContent.replace(versionRegex, newVersionLine);

// Write back
writeFileSync(CONSTANTS_PATH, constantsContent);

console.log(`Synced VERSION to ${version} in src/constants.ts`);
