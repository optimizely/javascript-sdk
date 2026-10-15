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

// Runs every case in cases.mjs on every fixture: bundles the test app with the fixture's Metro and runs
// the bundle in a fresh Node vm context. See README.md.
//
// Usage: node tests/react-native-metro/run.mjs [--sdk <package.tgz>] [--fixture <name>] [--case <id>]
//   --sdk      SDK package to test. Default: `npm pack` of this repo (which builds it, as `npm publish` does).
//   --fixture  only run this fixture. --case: only run this case. Both can be repeated.

import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
import { CASES, FIXTURES } from './cases.mjs';

const ROOT = fs.realpathSync(path.dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = path.resolve(ROOT, '../..');
const SDK_DIR = path.join(ROOT, '.sdk');
const OUT_DIR = path.join(ROOT, '.out');
const CASE_TIMEOUT_MS = 15000;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const args = process.argv.slice(2);
const argValues = (name) => args.flatMap((arg, i) => (arg === name ? [args[i + 1]] : []));
const run = (cmd, cmdArgs, cwd) => {
  try {
    return execFileSync(cmd, cmdArgs, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  } catch (e) {
    throw new Error(`${cmd} ${cmdArgs.join(' ')} failed in ${cwd}:\n${e.stdout}\n${e.stderr}`);
  }
};

// Installs the SDK package into .sdk the way an app would, with its dependencies and without its
// (optional) peer dependencies.
function installSdk() {
  let tarball = argValues('--sdk')[0];
  if (tarball) {
    tarball = path.resolve(tarball);
  } else {
    // npm pack runs the package's prepare script (the build), as npm publish does.
    const packDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rn-metro-test-'));
    const name = run('npm', ['pack', '--silent', '--pack-destination', packDir], REPO_ROOT).trim().split('\n').pop();
    tarball = path.join(packDir, name);
  }
  fs.rmSync(SDK_DIR, { recursive: true, force: true });
  fs.mkdirSync(SDK_DIR, { recursive: true });
  fs.writeFileSync(path.join(SDK_DIR, 'package.json'), JSON.stringify({
    name: 'rn-metro-test-sdk',
    private: true,
    dependencies: { '@optimizely/optimizely-sdk': `file:${tarball}` },
  }, null, 2));
  fs.writeFileSync(path.join(SDK_DIR, 'index.js'), '');
  run('npm', ['install', '--omit=peer', '--omit=dev', '--ignore-scripts', '--no-package-lock', '--no-audit', '--no-fund', '--silent'], SDK_DIR);
  return tarball;
}

function installFixture(fixture) {
  const dir = path.join(ROOT, 'fixtures', fixture);
  if (!fs.existsSync(path.join(dir, 'node_modules'))) {
    console.log(`Installing fixture ${fixture}...`);
    run('npm', ['ci', '--no-audit', '--no-fund', '--silent'], dir);
  }
}

// Builds one bundle per distinct set of installed modules; returns { file } or { error }.
const bundles = new Map();
function buildBundle(fixture, modules) {
  const key = `${fixture}:${JSON.stringify(modules)}`;
  if (!bundles.has(key)) {
    const out = path.join(OUT_DIR, fixture, `bundle-${bundles.size}.js`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const result = spawnSync(process.execPath, [path.join(ROOT, 'build.cjs'), path.join(ROOT, 'fixtures', fixture), out], {
      env: { ...process.env, RN_METRO_TEST_MODULES: JSON.stringify(modules) },
      encoding: 'utf8',
    });
    bundles.set(key, result.status === 0 ? { file: out } : { error: (result.stderr || result.stdout || '').trim() });
  }
  return bundles.get(key);
}

// Errors thrown from the bundle's timers or promises surface here; they belong to the case being run.
let currentRecords = null;
const recordUncaught = (error) => {
  if (!currentRecords) throw error;
  currentRecords.uncaught.push(String((error && error.message) || error));
};
process.on('uncaughtException', recordUncaught);
process.on('unhandledRejection', recordUncaught);

async function runBundle(file, runtime) {
  const records = { reportedError: [], caughtError: [], sdk: [], result: [], readBack: [], uncaught: [], logs: [] };
  currentRecords = records;
  let done;
  const finished = new Promise((resolve) => { done = resolve; });
  const timers = new Set();
  const log = (...items) => records.logs.push(items.map(String).join(' '));

  const context = {
    console: { log, info: log, warn: log, error: log, debug: log, trace: log },
    setTimeout: (fn, ms, ...rest) => {
      const timer = setTimeout(() => { timers.delete(timer); fn(...rest); }, ms);
      timers.add(timer);
      return timer;
    },
    clearTimeout: (timer) => { timers.delete(timer); clearTimeout(timer); },
    setInterval: (fn, ms, ...rest) => {
      const timer = setInterval(fn, ms, ...rest);
      timers.add(timer);
      return timer;
    },
    clearInterval: (timer) => { timers.delete(timer); clearInterval(timer); },
    queueMicrotask,
    __CASE__: runtime,
    __record: (type, data) => { (records[type] = records[type] || []).push(data); },
    __done: () => done(),
  };
  // A fresh context only has standard JS built-ins: no TextEncoder or crypto, like Hermes before RN 0.74.
  if (runtime.nativeTextEncoder) {
    context.TextEncoder = TextEncoder;
    context.__nativeTextEncoder = TextEncoder;
  }
  vm.createContext(context);

  const timeout = setTimeout(() => { records.timedOut = true; done(); }, CASE_TIMEOUT_MS);
  try {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  } catch (e) {
    recordUncaught(e);
    done();
  }
  await finished;
  clearTimeout(timeout);
  await new Promise((resolve) => setTimeout(resolve, 50));
  for (const timer of timers) {
    clearTimeout(timer);
    clearInterval(timer);
  }
  currentRecords = null;
  return records;
}

// Returns a list of problems; empty if the case behaved as expected.
function check(testCase, records) {
  const { expect } = testCase;
  const problems = [];
  const fatal = records.reportedError.filter((e) => e.isFatal);
  const nonFatal = records.reportedError.filter((e) => !e.isFatal);
  const sdk = records.sdk[0];
  const result = records.result[0];

  if (records.timedOut) problems.push('timed out');
  if (records.uncaught.length) problems.push(`uncaught error: ${records.uncaught.join(' | ')}`);
  if (nonFatal.length) problems.push(`reported error: ${nonFatal.map((e) => e.message).join(' | ')}`);

  if (expect.works) {
    if (fatal.length) problems.push(`fatal error: ${fatal.map((e) => e.message).join(' | ')}`);
    if (records.caughtError.length) problems.push(`error: ${records.caughtError.map((e) => e.message).join(' | ')}`);
    if (!sdk || !sdk.loaded) {
      problems.push('SDK did not load');
    } else {
      for (const [name, source] of Object.entries(expect.works)) {
        if (sdk.sources[name] !== source) problems.push(`${name}: expected ${source}, got ${sdk.sources[name]}`);
      }
    }
    if (!result) {
      problems.push('no result');
    } else {
      if (Object.keys(result.decisions).length === 0) problems.push('no decisions');
      if (result.events.length === 0) problems.push('no events dispatched');
      if (!result.events.every((uuid) => UUID_V4.test(uuid))) problems.push(`invalid event UUIDs: ${result.events.join(', ')}`);
      if (result.calls.encode === 0) problems.push('TextEncoder.encode was not called');
      if (result.calls.getRandomValues === 0) problems.push('crypto.getRandomValues was not called');
    }
    if (expect.readBack) {
      const readBack = records.readBack[0];
      if (!readBack || readBack.events.length === 0) problems.push('stored events were not read back');
      else if (!readBack.storageCalls.includes(expect.readBack)) {
        problems.push(`expected AsyncStorage.${expect.readBack}, calls: ${readBack.storageCalls.join(', ')}`);
      }
    }
  } else if (expect.fatal) {
    if (!fatal.some((e) => e.message.includes(expect.fatal))) {
      problems.push(`expected fatal "${expect.fatal}", got: ${fatal.map((e) => e.message).join(' | ') || 'none'}`);
    }
    if (sdk && sdk.loaded) problems.push('SDK loaded');
    if (records.caughtError.length) problems.push(`error thrown to the app: ${records.caughtError.map((e) => e.message).join(' | ')}`);
  } else if (expect.caught) {
    if (!records.caughtError.some((e) => e.message.includes(expect.caught))) {
      problems.push(`expected error "${expect.caught}", got: ${records.caughtError.map((e) => e.message).join(' | ') || 'none'}`);
    }
    if (fatal.length) problems.push(`fatal error: ${fatal.map((e) => e.message).join(' | ')}`);
  }
  return problems;
}

const describeExpect = ({ expect }) => (expect.works
  ? `works (TextEncoder: ${expect.works.textEncoder}, getRandomValues: ${expect.works.getRandomValues}`
    + `${expect.readBack ? `, read back via ${expect.readBack}` : ''})`
  : expect.fatal ? `fatal: ${expect.fatal}` : `error: ${expect.caught}`);

async function main() {
  const fixtures = argValues('--fixture').length ? argValues('--fixture') : FIXTURES;
  const cases = argValues('--case').length ? CASES.filter((c) => argValues('--case').includes(c.id)) : CASES;

  const tarball = installSdk();
  console.log(`SDK under test: ${tarball}`);
  fs.rmSync(OUT_DIR, { recursive: true, force: true });

  const rows = [];
  for (const fixture of fixtures) {
    installFixture(fixture);
    for (const testCase of cases) {
      const bundle = buildBundle(fixture, testCase.modules);
      const problems = bundle.error
        ? [`bundle failed: ${bundle.error.split('\n').slice(0, 3).join(' ')}`]
        : check(testCase, await runBundle(bundle.file, testCase.runtime));
      rows.push({ fixture, testCase, problems });
      console.log(`${problems.length ? '✗' : '✓'} ${fixture} ${testCase.id} ${testCase.description}`);
      for (const problem of problems) console.log(`    ${problem}`);
    }
  }

  console.log('\n| Fixture | Case | Setup | Expected | Result |\n|---|---|---|---|---|');
  for (const { fixture, testCase, problems } of rows) {
    console.log(`| ${fixture} | ${testCase.id} | ${testCase.description} | ${describeExpect(testCase)} | ${problems.length ? `✗ ${problems.join('; ')}` : '✓'} |`);
  }
  const failed = rows.filter((row) => row.problems.length).length;
  console.log(`\n${rows.length - failed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
