/**
 * Platform Support Type Definitions
 * 
 * Every source file (except tests) must export __platforms to declare
 * which platforms it supports. This is enforced at both type-level and runtime.
 */

/**
 * Valid platform identifiers
 */
export type Platform = 'browser' | 'node' | 'react_native' | '__universal__';

export const __platforms: Platform[] = ['__universal__'];

/**
 * Platform support declaration
 * 
 * Every file must export this to declare which platforms it supports:
 * - Specific platforms: export const __platforms = ['browser', 'node'];
 * - All platforms (universal): export const __platforms = ['__universal__'];
 * 
 * @example
 * // Browser and React Native only
 * export const __platforms = ['browser', 'react_native'] satisfies Platform[];
 * 
 * @example
 * // Node.js only
 * export const __platforms = ['node'] satisfies Platform[];
 * 
 * @example  
 * // Universal (all platforms)
 * export const __platforms = ['__universal__'] satisfies Platform[];
 */
export type SupportedPlatforms = readonly Platform[];

/**
 * Helper type to enforce that a module exports __platforms
 * 
 * Usage in your module:
 * ```typescript
 * import type { RequirePlatformDeclaration, Platform } from './platform_support';
 * 
 * export const __platforms = ['browser'] satisfies Platform[];
 * 
 * // This type check ensures __platforms is exported
 * // type _Check = RequirePlatformDeclaration<typeof import('./your-module')>;
 * ```
 */
export type RequirePlatformDeclaration<T> = T extends { __platforms: readonly Platform[] }
  ? T
  : never & { error: '__platforms export is required' };

/**
 * Utility to check if a file is universal (supports all platforms)
 */
export function isUniversal(platforms: readonly Platform[]): boolean {
  return platforms.length === 1 && platforms[0] === '__universal__';
}
