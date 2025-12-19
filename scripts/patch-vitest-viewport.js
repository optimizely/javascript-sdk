#!/usr/bin/env node

/**
 * Copyright 2024-2025, Optimizely
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

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

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

let ast;
try {
  ast = acorn.parse(code, {
    ecmaVersion: 2022,
    sourceType: 'module',
  });
} catch (error) {
  console.error('[VIEWPORT PATCH] Failed to parse index.js:', error.message);
  process.exit(1);
}

// Find the viewport variable declaration
let viewportNode = null;

function walk(node, callback) {
  callback(node);
  for (const key in node) {
    if (key === 'type' || key === 'loc' || key === 'range') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach(c => c && typeof c === 'object' && walk(c, callback));
    } else if (child && typeof child === 'object') {
      walk(child, callback);
    }
  }
}

walk(ast, (node) => {
  // Look for: const viewport = async (context, options) => { ... }
  if (
    node.type === 'VariableDeclaration' &&
    node.kind === 'const' &&
    node.declarations &&
    node.declarations.length > 0
  ) {
    const decl = node.declarations[0];
    if (
      decl.id &&
      decl.id.type === 'Identifier' &&
      decl.id.name === 'viewport' &&
      decl.init &&
      decl.init.type === 'ArrowFunctionExpression' &&
      decl.init.async === true
    ) {
      viewportNode = node;
    }
  }
});

if (!viewportNode) {
  console.error('[VIEWPORT PATCH] ERROR: Could not find viewport function declaration in AST');
  process.exit(1);
}

console.log(`[VIEWPORT PATCH] Found viewport function at position ${viewportNode.start}-${viewportNode.end}`);

// Extract the original function for logging
const originalFunction = code.substring(viewportNode.start, viewportNode.end);
console.log('[VIEWPORT PATCH] Original function:');
console.log(originalFunction);

// Create the replacement
const replacement = `const viewport = async (context, options) => {
	console.log('[VIEWPORT PATCH] Viewport command intercepted and ignored', options);
	return Promise.resolve();
};`;

// Replace the function using string manipulation
const patchedCode =
  code.substring(0, viewportNode.start) +
  replacement +
  code.substring(viewportNode.end);

// Write the patched code
fs.writeFileSync(vitestIndexPath, patchedCode, 'utf8');

console.log('[VIEWPORT PATCH] Successfully patched viewport command');
console.log('[VIEWPORT PATCH] Replacement:');
console.log(replacement);
