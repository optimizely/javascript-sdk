#!/usr/bin/env node

/**
 * Comprehensive test suite for platform isolation validator
 * 
 * This test documents and validates all the compatibility rules
 */

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

console.log('\n2. SINGLE PLATFORM FILES');
console.log('-'.repeat(70));
test('Browser file can import from browser file', 
  validator.isPlatformCompatible(['browser'], ['browser']), true);
test('Browser file CANNOT import from node file', 
  validator.isPlatformCompatible(['browser'], ['node']), false);
test('Node file can import from node file', 
  validator.isPlatformCompatible(['node'], ['node']), true);
test('React Native file can import from react_native file', 
  validator.isPlatformCompatible(['react_native'], ['react_native']), true);

console.log('\n3. SINGLE PLATFORM IMPORTING FROM MULTI-PLATFORM');
console.log('-'.repeat(70));
test('Browser file CAN import from [browser, react_native] file', 
  validator.isPlatformCompatible(['browser'], ['browser', 'react_native']), true);
test('React Native file CAN import from [browser, react_native] file', 
  validator.isPlatformCompatible(['react_native'], ['browser', 'react_native']), true);
test('Node file CANNOT import from [browser, react_native] file', 
  validator.isPlatformCompatible(['node'], ['browser', 'react_native']), false);

console.log('\n4. MULTI-PLATFORM FILES (strictest rules)');
console.log('-'.repeat(70));
test('[browser, react_native] file CAN import from [browser, react_native] file', 
  validator.isPlatformCompatible(['browser', 'react_native'], ['browser', 'react_native']), true);
test('[browser, react_native] file CANNOT import from browser-only file', 
  validator.isPlatformCompatible(['browser', 'react_native'], 'browser'), false);
test('[browser, react_native] file CANNOT import from react_native-only file', 
  validator.isPlatformCompatible(['browser', 'react_native'], 'react_native'), false);
test('[browser, react_native] file CANNOT import from node file', 
  validator.isPlatformCompatible(['browser', 'react_native'], 'node'), false);

console.log('\n5. SUPPORTED PLATFORMS EXTRACTION');
console.log('-'.repeat(70));
const testExport1 = `export const __supportedPlatforms = ['browser', 'react_native'];`;
const platforms1 = validator.extractSupportedPlatforms(testExport1);
test('Extract __supportedPlatforms array', 
  JSON.stringify(platforms1), JSON.stringify(['browser', 'react_native']));

const testExport2 = `export const __supportedPlatforms: string[] = ["browser", "node"];`;
const platforms2 = validator.extractSupportedPlatforms(testExport2);
test('Extract __supportedPlatforms with type annotation', 
  JSON.stringify(platforms2), JSON.stringify(['browser', 'node']));

const testExport3 = `export const __supportedPlatforms = ['__universal__'];`;
const platforms3 = validator.extractSupportedPlatforms(testExport3);
test('Extract __universal__ marker', 
  JSON.stringify(platforms3), JSON.stringify(['__universal__']));

console.log('\n' + '='.repeat(70));
console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\n✅ All tests passed!');
