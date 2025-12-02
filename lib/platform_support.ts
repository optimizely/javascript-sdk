
/**
 * ⚠️ WARNING: DO NOT MOVE, DELETE, OR RENAME THIS FILE
 * 
 * This file is used by the build system and validation scripts:
 * - scripts/validate-platform-isolation-ts.js
 * - scripts/platform-utils.js
 * - eslint-local-rules/require-platform-declaration.js
 * 
 * These tools parse this file at build time to extract the Platform type definition.
 * Moving or renaming this file will break the build.
 */

/**
 * Valid platform identifiers
 */
export type Platform = 'browser' | 'node' | 'react_native' | '__universal__';
