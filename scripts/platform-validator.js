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
 * Platform validator CLI
 * 
 * Provides a unified interface for validating and fixing platform isolation issues.
 * 
 * Usage:
 *   node platform-validator.js --validate  # Validate platform isolation (default)
 *   node platform-validator.js --fix       # Fix platform isolation issues
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require('child_process');

function main() {
  const args = process.argv.slice(2);
  
  const hasValidate = args.includes('--validate');
  const hasFix = args.includes('--fix');
  
  // Check if both options are provided
  if (hasValidate && hasFix) {
    console.error('❌ Error: Cannot specify both --validate and --fix options');
    process.exit(1);
  }
  
  // Determine which script to run (default to validate)
  const shouldFix = hasFix;
  
  try {
    if (shouldFix) {
      console.log('🔧 Running platform isolation fix...\n');
      execSync('node scripts/add-platform-exports.js', { stdio: 'inherit' });
    } else {
      console.log('🔍 Running platform isolation validation...\n');
      execSync('node scripts/validate-platform-isolation.js', { stdio: 'inherit' });
    }
  } catch (error) {
    process.exit(error.status || 1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
