#!/usr/bin/env node

/**
 * Copyright 2026, Optimizely
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

const ts = require('typescript');
const fs = require('fs');
const path = require('path');

function extractMessages(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
  );

  const exports = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;

    const hasExport = statement.modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (!hasExport) continue;

    for (const decl of statement.declarationList.declarations) {
      const name = decl.name.getText(sourceFile);
      if (name === 'messages' || name === '__platforms') continue;
      if (!decl.initializer || !ts.isStringLiteral(decl.initializer)) continue;

      exports.push({ name, value: decl.initializer.text });
    }
  }

  return exports;
}

function buildOutputAst(exports) {
  const { factory } = ts;
  const statements = [];

  exports.forEach((exp, i) => {
    statements.push(
      factory.createVariableStatement(
        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        factory.createVariableDeclarationList(
          [factory.createVariableDeclaration(exp.name, undefined, undefined, factory.createStringLiteral(String(i)))],
          ts.NodeFlags.Const,
        ),
      ),
    );
  });

  statements.push(
    factory.createVariableStatement(
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            'messages',
            undefined,
            undefined,
            factory.createArrayLiteralExpression(
              exports.map((exp) => factory.createStringLiteral(exp.value)),
              true,
            ),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    ),
  );

  return factory.createSourceFile(statements, factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);
}

function generate(filePath) {
  const absPath = path.resolve(filePath);
  const parsed = path.parse(absPath);
  const genPath = path.join(parsed.dir, `${parsed.name}.gen${parsed.ext}`);

  console.log('generating messages for:', absPath);

  const exports = extractMessages(absPath);
  const outputAst = buildOutputAst(exports);

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const output = printer.printFile(outputAst);

  fs.writeFileSync(genPath, output, 'utf-8');
  console.log('generated file path:', genPath);
}

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error('Usage: generate-messages.js <file1.ts> [file2.ts] ...');
  process.exit(1);
}

for (const file of files) {
  generate(file);
}

console.log('successfully generated messages');
