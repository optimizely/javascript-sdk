#!/usr/bin/env node

/**
 * Script to build the SDK and run the TypeScript example
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const exampleDir = path.join(rootDir, 'ts-example');

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

function cleanup() {
  if (datafileServer) {
    console.log('\n=== Stopping Datafile Server ===\n');
    datafileServer.kill();
    datafileServer = null;
  }
}

// Handle cleanup on exit
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

async function main() {
  console.log('=== Building SDK and Running TypeScript Example ===\n');

  // Step 1: Build the SDK
  console.log('Step 1: Building SDK...');
  run('npm run build', rootDir);

  // Step 2: Install dependencies for ts-example
  console.log('\nStep 2: Installing ts-example dependencies...');
  run('npm install', exampleDir);

  // Step 3: Build the ts-example
  console.log('\nStep 3: Building ts-example...');
  run('npm run build', exampleDir);

  // Step 4: Start the datafile server
  await startDatafileServer();

  // Step 5: Run the ts-example
  console.log('\nStep 4: Running ts-example...');
  run('npm start', exampleDir);

  // Cleanup and exit
  cleanup();
  console.log('\n=== Example completed successfully! ===\n');
}

main().catch((error) => {
  console.error('Error:', error);
  cleanup();
  process.exit(1);
});
