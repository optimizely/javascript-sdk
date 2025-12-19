#!/usr/bin/env node

/**
 * Copyright 2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


// when running browser tests with vitest, the viewport command in @vitest/browser
// tries to set the viewport size which is not supported for some browsers we
// are testing on. So we are patching the viewport command to be a no-op cause
// we don't actually need to change the viewport size for our tests.


// This script patches files in node_modules/@vitest/browser, so it depends
// on particular implementation details in that file. So, the @vitest/browser
// vesion should be pinned in package.json devDependencies to avoid
// unexpected breakages. 

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

console.log('[VIEWPORT PATCH] Verifying @vitest/browser version...');

// Verify @vitest/browser version matches package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const vitestBrowserPackageJsonPath = path.join(__dirname, '../node_modules/@vitest/browser/package.json');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const vitestBrowserPackageJson = JSON.parse(fs.readFileSync(vitestBrowserPackageJsonPath, 'utf8'));

const expectedVersion = packageJson.devDependencies['@vitest/browser'];
const installedVersion = vitestBrowserPackageJson.version;

console.log(`[VIEWPORT PATCH] Expected version: ${expectedVersion}`);
console.log(`[VIEWPORT PATCH] Installed version: ${installedVersion}`);

if (expectedVersion !== installedVersion) {
  console.error('[VIEWPORT PATCH] ERROR: Version mismatch!');
  console.error(`[VIEWPORT PATCH]   Expected: ${expectedVersion}`);
  console.error(`[VIEWPORT PATCH]   Installed: ${installedVersion}`);
  console.error('[VIEWPORT PATCH] Please run "npm install" to sync versions.');
  process.exit(1);
}

console.log('[VIEWPORT PATCH] Version verification passed!');

// Path to the Vitest browser index.js file
const vitestIndexPath = path.join(__dirname, '../node_modules/@vitest/browser/dist/index.js');
const backupPath = vitestIndexPath + '.backup';

console.log('[VIEWPORT PATCH] Patching Vitest viewport command...');

// Create backup if it doesn't exist
if (!fs.existsSync(backupPath)) {
  console.log('[VIEWPORT PATCH] Creating backup...');
  fs.copyFileSync(vitestIndexPath, backupPath);
}

// Read the file
const code = fs.readFileSync(vitestIndexPath, 'utf8');

// Parse using TypeScript compiler
const sourceFile = ts.createSourceFile(
  'index.js',
  code,
  ts.ScriptTarget.ES2022,
  true,
  ts.ScriptKind.JS
);

// Find the viewport variable declaration
let viewportNode = null;

function visit(node) {
  // Look for: const viewport = async (context, options) => { ... }
  if (
    ts.isVariableStatement(node) &&
    node.declarationList.flags & ts.NodeFlags.Const
  ) {
    const declaration = node.declarationList.declarations[0];
    if (
      declaration &&
      ts.isIdentifier(declaration.name) &&
      declaration.name.text === 'viewport' &&
      declaration.initializer &&
      ts.isArrowFunction(declaration.initializer) &&
      declaration.initializer.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)
    ) {
      viewportNode = node;
      return;
    }
  }

  ts.forEachChild(node, visit);
}

visit(sourceFile);

if (!viewportNode) {
  console.error('[VIEWPORT PATCH] ERROR: Could not find viewport function declaration');
  process.exit(1);
}

const start = viewportNode.getStart(sourceFile);
const end = viewportNode.getEnd();

console.log(`[VIEWPORT PATCH] Found viewport function at position ${start}-${end}`);

// Extract the original function for logging
const originalFunction = code.substring(start, end);
console.log('[VIEWPORT PATCH] Original function:');
console.log(originalFunction);

// Create the replacement
const replacement = `const viewport = async (context, options) => {
	return Promise.resolve();
};`;

// Replace the function using string manipulation
const patchedCode =
  code.substring(0, start) +
  replacement +
  code.substring(end);

// Write the patched code
fs.writeFileSync(vitestIndexPath, patchedCode, 'utf8');

console.log('[VIEWPORT PATCH] Successfully patched viewport command');
console.log('[VIEWPORT PATCH] Replacement:');
console.log(replacement);
