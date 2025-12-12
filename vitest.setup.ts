/**
 * Copyright 2024-2025, Optimizely
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

import { beforeAll } from 'vitest';

// Declare global variable for TypeScript
declare const __VITEST_SESSION_ID__: string | undefined;

beforeAll(() => {
  // Print session information at the start of tests
  if (typeof window !== 'undefined') {
    const sessionId = typeof __VITEST_SESSION_ID__ !== 'undefined' ? __VITEST_SESSION_ID__ : 'unknown';
    const url = new URL(window.location.href);
    const urlSessionId = url.searchParams.get('sessionId');

    console.log('='.repeat(80));
    console.log(`Vitest Browser Session ID (global): ${sessionId}`);
    console.log(`Vitest Browser Session ID (URL): ${urlSessionId}`);
    console.log(`User Agent: ${navigator.userAgent}`);
    console.log(`Location: ${window.location.href}`);
    console.log('='.repeat(80));
  }
});
