/**
 * Copyright 2025, Optimizely
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

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * This module contains feature flags that control the availability of features under development.
 * Each flag represents a feature that is not yet ready for production release. These flags
 * serve multiple purposes in our development workflow:
 * 
 * When a new feature is in development, it can be safely merged into the main branch
 * while remaining disabled in production. This allows continuous integration without
 * affecting the stability of production releases. The feature code will be automatically
 * removed in production builds through tree-shaking when the flag is disabled.
 * 
 * During development and testing, these flags can be easily mocked to enable/disable
 * specific features. Once a feature is complete and ready for release, its corresponding
 * flag and all associated checks can be removed from the codebase.
 */

// export const holdout = () => false as const;

export type IfActive<T extends () => boolean, Y, N = unknown> = ReturnType<T> extends true ? Y : N;
