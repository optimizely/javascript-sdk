#!/usr/bin/env node

/**
 * Copyright 2026, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const exampleDir = path.join(rootDir, 'examples', 'node-commonjs');

function run(command, cwd) {
  console.log(`\n> ${command}`);
  console.log(`  (in ${cwd})\n`);
  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      shell: true
    });
  } catch (error) {
    console.error(`\nError executing: ${command}`);
    process.exit(1);
  }
}

function runQuiet(command, cwd) {
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf8',
      shell: true
    }).trim();
    const lines = output.split('\n');
    return lines[lines.length - 1].trim();
  } catch (error) {
    console.error(`\nError executing: ${command}`);
    process.exit(1);
  }
}

// The tarball `npm pack` creates for the current package version, e.g.
// @optimizely/optimizely-sdk@6.7.0 -> optimizely-optimizely-sdk-6.7.0.tgz.
// Only this exact file is used, so a leftover archive of another version is never tested (or deleted).
function findTarball() {
  const { name, version } = require(path.join(rootDir, 'package.json'));
  const fileName = `${name.replace(/^@/, '').replace(/\//g, '-')}-${version}.tgz`;
  const tarballPath = path.join(rootDir, fileName);
  if (!fs.existsSync(tarballPath)) {
    console.error(`SDK tarball ${fileName} not found. Run \`npm pack\` first.`);
    process.exit(1);
  }
  return tarballPath;
}

// Options:
//   --skip-build  use the tarball an earlier `npm pack` created instead of installing and packing
//   --skip-run    install the SDK in the example but don't run it. CI installs with Node 22 (and the
//                 pinned npm), then switches Node and runs `npm start` in examples/node-commonjs.
function main() {
  const skipBuild = process.argv.includes('--skip-build');
  const skipRun = process.argv.includes('--skip-run');

  console.log('=== Building SDK and Running CommonJS Example ===\n');

  let tarballPath;

  if (skipBuild) {
    console.log('Skipping build (--skip-build), using existing tarball...');
    tarballPath = findTarball();
  } else {
    console.log('Installing SDK dependencies...');
    run('npm install', rootDir);

    console.log('\nPacking SDK tarball...');
    const packOutput = runQuiet('npm pack', rootDir);
    tarballPath = path.join(rootDir, packOutput);
    console.log(`Created: ${packOutput}`);
  }

  console.log('\nInstalling SDK tarball in cjs-example...');
  run(`npm install --no-save --no-package-lock ${tarballPath}`, exampleDir);

  if (!skipRun) {
    console.log('\nRunning cjs-example...');
    run('npm start', exampleDir);
  }

  console.log('\nCleaning up tarball...');
  fs.unlinkSync(tarballPath);
  console.log(`Removed: ${path.basename(tarballPath)}`);

  console.log(skipRun ? '\n=== SDK installed in cjs-example (not run: --skip-run) ===\n' : '\n=== Example completed successfully! ===\n');
}

main();
