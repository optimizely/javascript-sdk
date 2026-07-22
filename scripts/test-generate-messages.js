#!/usr/bin/env node

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

const SCRIPT = path.resolve(__dirname, 'generate-messages.js');

const FILE1_EXPECTED = [
  { name: 'HELLO', value: 'Hello, %s!' },
  { name: 'GOODBYE', value: 'Goodbye, %s!' },
  { name: 'WARNING', value: 'Warning: %s' },
];

const FILE2_EXPECTED = [
  { name: 'ERR_NOT_FOUND', value: 'Resource %s not found' },
  { name: 'ERR_TIMEOUT', value: 'Request timed out after %s ms' },
  { name: 'ERR_INVALID', value: 'Invalid input: %s' },
  { name: 'ERR_PERMISSION', value: 'Permission denied for %s' },
];

function buildFileContent(expected, { includeMessages = true, includePlatforms = false } = {}) {
  let content = expected.map((e) => `export const ${e.name} = '${e.value}';`).join('\n');
  if (includeMessages) content += `\n\nexport const messages: string[] = [];`;
  if (includePlatforms) content += `\nexport const __platforms: string[] = ['__universal__'];`;
  return content;
}

function compileAndLoad(tsPath) {
  const source = fs.readFileSync(tsPath, 'utf-8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const jsPath = tsPath.replace(/\.ts$/, '.js');
  fs.writeFileSync(jsPath, outputText, 'utf-8');
  return require(jsPath);
}

function runTest() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-msg-test-'));

  try {
    const file1 = path.join(tmpDir, 'file1.ts');
    const file2 = path.join(tmpDir, 'file2.ts');
    fs.writeFileSync(file1, buildFileContent(FILE1_EXPECTED, { includePlatforms: true }), 'utf-8');
    fs.writeFileSync(file2, buildFileContent(FILE2_EXPECTED), 'utf-8');

    execFileSync(process.execPath, [SCRIPT, file1, file2], { stdio: 'pipe' });

    const genFile1 = path.join(tmpDir, 'file1.gen.ts');
    const genFile2 = path.join(tmpDir, 'file2.gen.ts');
    assert.ok(fs.existsSync(genFile1), 'file1.gen.ts should be created');
    assert.ok(fs.existsSync(genFile2), 'file2.gen.ts should be created');

    for (const [expected, genPath, label] of [
      [FILE1_EXPECTED, genFile1, 'file1'],
      [FILE2_EXPECTED, genFile2, 'file2'],
    ]) {
      const mod = compileAndLoad(genPath);

      assert.ok(Array.isArray(mod.messages), `${label}: messages should be an array`);
      assert.equal(mod.messages.length, expected.length,
        `${label}: messages array length should be ${expected.length}, got ${mod.messages.length}`);

      assert.equal(mod.__platforms, undefined, `${label}: __platforms should not be exported`);

      const constantCount = Object.keys(mod).filter((k) => k !== 'messages').length;
      assert.equal(constantCount, expected.length,
        `${label}: should have ${expected.length} constants, got ${constantCount}`);

      for (const exp of expected) {
        assert.ok(exp.name in mod,
          `${label}: constant "${exp.name}" should be present`);

        const index = Number(mod[exp.name]);
        assert.equal(mod.messages[index], exp.value,
          `${label}: messages[${index}] should be "${exp.value}", got "${mod.messages[index]}"`);
      }
    }

    console.log('All tests passed.');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

runTest();
