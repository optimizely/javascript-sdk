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

/**
 * Comprehensive test suite for platform isolation validator
 * 
 * This test documents and validates all the compatibility rules
 */


/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require('assert');
const validator = require('./validate-platform-isolation.js');

let passed = 0;
let failed = 0;

function test(description, actual, expected) {
  try {
    assert.strictEqual(actual, expected);
    console.log(`✅ ${description}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${description}`);
    console.log(`   Expected: ${expected}, Got: ${actual}`);
    failed++;
  }
}

console.log('Platform Isolation Validator - Comprehensive Test Suite\n');
console.log('=' .repeat(70));

console.log('\n1. UNIVERSAL IMPORTS (always compatible)');
console.log('-'.repeat(70));
test('Browser file can import universal', 
  validator.isPlatformCompatible(['browser'], ['__universal__']), true);
test('Node file can import universal', 
  validator.isPlatformCompatible(['node'], ['__universal__']), true);
test('Multi-platform file can import universal', 
  validator.isPlatformCompatible(['browser', 'react_native'], ['__universal__']), true);
test('Universal file can import universal', 
  validator.isPlatformCompatible(['__universal__'], ['__universal__']), true);


console.log('\n2. SINGLE PLATFORM FILES');
console.log('-'.repeat(70));
test('Browser file can import from browser file', 
  validator.isPlatformCompatible(['browser'], ['browser']), true);
test('Browser file can import from universal file', 
  validator.isPlatformCompatible(['browser'], ['__universal__']), true);
test('Browser file CANNOT import from node file', 
  validator.isPlatformCompatible(['browser'], ['node']), false);
test('Node file can import from node file', 
  validator.isPlatformCompatible(['node'], ['node']), true);
test('Node file can import from universal file', 
  validator.isPlatformCompatible(['node'], ['__universal__']), true);
test('React Native file can import from react_native file', 
  validator.isPlatformCompatible(['react_native'], ['react_native']), true);
test('React Native file can import from universal file', 
  validator.isPlatformCompatible(['react_native'], ['__universal__']), true);


console.log('\n3. UNIVERSAL IMPORTING FROM NON-UNIVERSAL');
console.log('-'.repeat(70));
test('Universal file CANNOT import from browser file', 
  validator.isPlatformCompatible(['__universal__'], ['browser']), false);
test('Universal file CANNOT import from node file', 
  validator.isPlatformCompatible(['__universal__'], ['node']), false);
test('Universal file CANNOT import from react_native file', 
  validator.isPlatformCompatible(['__universal__'], ['react_native']), false);
test('Universal file CANNOT import from [browser, react_native] file', 
  validator.isPlatformCompatible(['__universal__'], ['browser', 'react_native']), false);
test('Universal file CANNOT import from [browser, node] file', 
  validator.isPlatformCompatible(['__universal__'], ['browser', 'node']), false);
  

console.log('\n4. SINGLE PLATFORM IMPORTING FROM MULTI-PLATFORM');
console.log('-'.repeat(70));
test('Browser file CAN import from [browser, react_native] file', 
  validator.isPlatformCompatible(['browser'], ['browser', 'react_native']), true);
test('React Native file CAN import from [browser, react_native] file', 
  validator.isPlatformCompatible(['react_native'], ['browser', 'react_native']), true);
test('Node file CANNOT import from [browser, react_native] file', 
  validator.isPlatformCompatible(['node'], ['browser', 'react_native']), false);

console.log('\n5. MULTI-PLATFORM FILES (strictest rules)');
console.log('-'.repeat(70));
test('[browser, react_native] file CAN import from [browser, react_native] file', 
  validator.isPlatformCompatible(['browser', 'react_native'], ['browser', 'react_native']), true);
test('[browser, react_native] file CAN import from universal file', 
  validator.isPlatformCompatible(['browser', 'react_native'], ['__universal__']), true);
test('[browser, react_native] file CANNOT import from browser-only file', 
  validator.isPlatformCompatible(['browser', 'react_native'], 'browser'), false);
test('[browser, react_native] file CANNOT import from react_native-only file', 
  validator.isPlatformCompatible(['browser', 'react_native'], 'react_native'), false);
test('[browser, react_native] file CANNOT import from node file', 
  validator.isPlatformCompatible(['browser', 'react_native'], 'node'), false);


console.log('\n' + '='.repeat(70));
console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\n✅ All tests passed!');
