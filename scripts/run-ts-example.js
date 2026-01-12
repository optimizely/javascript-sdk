#!/usr/bin/env node

/**
 * Copyright 2025, Optimizely
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

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const exampleDir = path.join(rootDir, 'examples', 'typescript');

let datafileServer = null;

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
    cleanup();
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
    // npm pack outputs the tarball filename on the last line
    const lines = output.split('\n');
    return lines[lines.length - 1].trim();
  } catch (error) {
    console.error(`\nError executing: ${command}`);
    cleanup();
    process.exit(1);
  }
}

function startDatafileServer() {
  console.log('\n=== Starting Datafile Server ===');
  console.log('Starting server at http://localhost:8910...\n');

  const serverPath = path.join(exampleDir, 'datafile-server.js');
  datafileServer = spawn('node', [serverPath], {
    stdio: 'inherit',
    detached: false
  });

  datafileServer.on('error', (error) => {
    console.error('Failed to start datafile server:', error);
    process.exit(1);
  });

  // Give the server time to start
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

async function cleanup() {
  if (datafileServer) {
    console.log('\n=== Stopping Datafile Server ===\n');

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('Force killing datafile server...');
        datafileServer.kill('SIGKILL');
        resolve();
      }, 2000);

      datafileServer.on('exit', () => {
        clearTimeout(timeout);
        datafileServer = null;
        resolve();
      });

      datafileServer.kill('SIGTERM');
    });
  }
}

async function main() {
  console.log('=== Building SDK and Running TypeScript Example ===\n');

  console.log('Installing SDK dependencies...');
  run('npm install', rootDir);

  console.log('\nPacking SDK tarball...');
  const packOutput = runQuiet('npm pack', rootDir);
  const tarballPath = path.join(rootDir, packOutput);
  console.log(`Created: ${packOutput}`);

  console.log('\nInstalling ts-example devDependencies...');
  run('npm install', exampleDir);

  console.log('\nInstalling SDK tarball in ts-example...');
  run(`npm install ${tarballPath}`, exampleDir);

  console.log('\nBuilding ts-example...');
  run('npm run build', exampleDir);

  await startDatafileServer();

  console.log('\nRunning ts-example...');
  run('npm start', exampleDir);

  console.log('\nCleaning up tarball...');
  fs.unlinkSync(tarballPath);
  console.log(`Removed: ${packOutput}`);

  await cleanup();
  console.log('\n=== Example completed successfully! ===\n');
}

main().catch(async (error) => {
  console.error('Error:', error);
  await cleanup();
  process.exit(1);
});
