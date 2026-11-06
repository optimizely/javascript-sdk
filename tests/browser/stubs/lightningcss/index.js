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

// Stand-in for lightningcss, swapped in through "overrides" in ../../package.json.
// lightningcss is MPL-2.0, which our license policy doesn't allow. Vite 8 lists it
// as a dependency but only loads it (lazily) for `css.transformer: 'lightningcss'`
// or CSS minification in production builds. Neither happens when Vitest runs the
// dev server, and this project has no CSS of its own.
throw new Error(
  'lightningcss is stubbed out in tests/browser (MPL-2.0 license). ' +
  'Something tried to load it: keep css.transformer as "postcss" and avoid CSS minification.'
);
