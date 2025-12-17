#!/usr/bin/env node

/**
 * Safari WebSocket Debug Test Runner (Node.js version)
 * Coordinates running the debug server and BrowserStack test
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const browserstack = require('browserstack-local');
require('dotenv').config();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

function header(message) {
  console.log('');
  log('='.repeat(80), colors.cyan);
  log(message, colors.bright + colors.cyan);
  log('='.repeat(80), colors.cyan);
  console.log('');
}

async function checkEnvironment() {
  log('Checking environment...', colors.yellow);
  console.log('');

  let ready = true;

  // Check Node.js version
  log(`✓ Node.js ${process.version}`, colors.green);

  // Check required modules
  const requiredModules = ['ws', 'webdriverio', 'dotenv'];
  for (const mod of requiredModules) {
    try {
      require.resolve(mod);
      log(`✓ ${mod} installed`, colors.green);
    } catch (e) {
      log(`✗ ${mod} not installed`, colors.red);
      log(`  Run: npm install ${mod}`, colors.yellow);
      ready = false;
    }
  }

  // Check environment variables
  if (process.env.BROWSERSTACK_USERNAME) {
    log(`✓ BROWSERSTACK_USERNAME: ${process.env.BROWSERSTACK_USERNAME}`, colors.green);
  } else {
    log('✗ BROWSERSTACK_USERNAME not set', colors.red);
    ready = false;
  }

  if (process.env.BROWSERSTACK_ACCESS_KEY) {
    log(`✓ BROWSERSTACK_ACCESS_KEY: ${process.env.BROWSERSTACK_ACCESS_KEY.substring(0, 8)}...`, colors.green);
  } else {
    log('✗ BROWSERSTACK_ACCESS_KEY not set', colors.red);
    ready = false;
  }

  // Check debug scripts exist
  const requiredFiles = [
    'debug-safari-ws-server.js',
    'debug-safari-webdriver.js',
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      log(`✓ ${file} exists`, colors.green);
    } else {
      log(`✗ ${file} not found`, colors.red);
      ready = false;
    }
  }

  console.log('');

  if (!ready) {
    log('✗ Environment is not ready. Please fix the issues above.', colors.red);
    process.exit(1);
  }

  log('✓ Environment is ready!', colors.green);
  console.log('');
}

function createLogsDir() {
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
    log(`Created logs directory: ${logsDir}`, colors.green);
  }
  return logsDir;
}

function startBrowserStackLocal() {
  return new Promise((resolve, reject) => {
    log('Starting BrowserStack Local tunnel...', colors.yellow);

    const bs_local = new browserstack.Local();
    const bsLocalArgs = {
      key: process.env.BROWSERSTACK_ACCESS_KEY,
      force: true,
      forceLocal: true,
    };

    bs_local.start(bsLocalArgs, (error) => {
      if (error) {
        log(`✗ Error starting BrowserStack Local: ${error.message}`, colors.red);
        reject(error);
      } else {
        log('✓ BrowserStack Local tunnel started successfully', colors.green);
        log(`  Local Identifier: ${bs_local.pid}`, colors.cyan);
        log('  Waiting for tunnel to establish...', colors.yellow);

        // Wait for tunnel to fully establish
        setTimeout(() => {
          log('✓ Tunnel ready!', colors.green);
          console.log('');
          resolve(bs_local);
        }, 10000);
      }
    });
  });
}

function stopBrowserStackLocal(bs_local) {
  if (!bs_local) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    log('Stopping BrowserStack Local tunnel...', colors.yellow);
    bs_local.stop(() => {
      log('✓ BrowserStack Local tunnel stopped', colors.green);
      resolve();
    });
  });
}

async function startDebugServer(logFile) {
  return new Promise((resolve, reject) => {
    log('Starting debug server...', colors.yellow);

    const serverLogStream = fs.createWriteStream(logFile);

    const serverProcess = spawn('node', ['debug-safari-ws-server.js'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Pipe output to both file and console
    serverProcess.stdout.pipe(serverLogStream);
    serverProcess.stderr.pipe(serverLogStream);

    serverProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    serverProcess.on('error', (error) => {
      log(`✗ Server failed to start: ${error.message}`, colors.red);
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        log(`✗ Server exited with code ${code}`, colors.red);
      }
    });

    // Wait for server to be ready
    setTimeout(() => {
      if (serverProcess.exitCode === null) {
        log(`✓ Debug server started (PID: ${serverProcess.pid})`, colors.green);
        log(`  Server log: ${logFile}`, colors.cyan);
        console.log('');
        resolve(serverProcess);
      } else {
        reject(new Error('Server exited immediately'));
      }
    }, 2000);
  });
}

async function runWebDriverTest(logFile) {
  return new Promise((resolve, reject) => {
    log('Starting WebDriver test...', colors.yellow);
    console.log('');

    const webdriverLogStream = fs.createWriteStream(logFile);

    const webdriverProcess = spawn('node', ['debug-safari-webdriver.js'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    // Pipe output to both file and console
    webdriverProcess.stdout.pipe(webdriverLogStream);
    webdriverProcess.stderr.pipe(webdriverLogStream);

    webdriverProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    webdriverProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    webdriverProcess.on('error', (error) => {
      log(`✗ WebDriver test failed: ${error.message}`, colors.red);
      reject(error);
    });

    webdriverProcess.on('exit', (code) => {
      console.log('');
      if (code === 0) {
        log('✓ WebDriver test completed successfully', colors.green);
        resolve();
      } else {
        log(`✗ WebDriver test exited with code ${code}`, colors.red);
        reject(new Error(`WebDriver test failed with code ${code}`));
      }
    });
  });
}

async function main() {
  header('Safari WebSocket Debug Test');

  // Check environment
  await checkEnvironment();

  // Create logs directory
  const logsDir = createLogsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').split('Z')[0];
  const serverLog = path.join(logsDir, `debug-server-${timestamp}.log`);
  const webdriverLog = path.join(logsDir, `debug-webdriver-${timestamp}.log`);

  log('Log files:', colors.cyan);
  log(`  Server: ${serverLog}`, colors.cyan);
  log(`  WebDriver: ${webdriverLog}`, colors.cyan);
  console.log('');

  let serverProcess = null;
  let bs_local = null;

  // Cleanup function
  const cleanup = async () => {
    if (serverProcess) {
      log('Stopping debug server...', colors.yellow);
      serverProcess.kill('SIGTERM');

      setTimeout(() => {
        if (serverProcess.exitCode === null) {
          log('Force killing server...', colors.yellow);
          serverProcess.kill('SIGKILL');
        }
      }, 3000);
    }

    if (bs_local) {
      await stopBrowserStackLocal(bs_local);
    }
  };

  process.on('SIGINT', async () => {
    console.log('');
    log('Received SIGINT, cleaning up...', colors.yellow);
    await cleanup();
    process.exit(130);
  });

  process.on('SIGTERM', async () => {
    console.log('');
    log('Received SIGTERM, cleaning up...', colors.yellow);
    await cleanup();
    process.exit(143);
  });

  try {
    // Start BrowserStack Local tunnel
    header('Starting BrowserStack Local');
    bs_local = await startBrowserStackLocal();

    // Start debug server
    serverProcess = await startDebugServer(serverLog);

    // Run WebDriver test
    await runWebDriverTest(webdriverLog);

    // Test complete
    header('Test Complete');
    log('Server log:', colors.cyan);
    log(`  ${serverLog}`, colors.bright);
    console.log('');
    log('WebDriver log:', colors.cyan);
    log(`  ${webdriverLog}`, colors.bright);
    console.log('');
    log('To view logs:', colors.cyan);
    log(`  cat ${serverLog}`, colors.bright);
    log(`  cat ${webdriverLog}`, colors.bright);
    console.log('');

  } catch (error) {
    console.log('');
    log('✗ Error: ' + error.message, colors.red);
    console.log('');
  } finally {
    await cleanup();
  }
}

// Run main
main().catch((error) => {
  console.error('');
  log('✗ Unhandled error: ' + error.message, colors.red);
  console.error(error.stack);
  process.exit(1);
});
