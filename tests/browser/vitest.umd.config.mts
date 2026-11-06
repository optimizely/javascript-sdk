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
import { createBrowserConfig } from './vitest.shared.mts';
import { umdPlugin } from './umd-plugin';

// Same spec files as the root vitest.umd.config.mts. The UMD bundle is built
// and copied to vitest/public/dist by run.js before this runs.
export default createBrowserConfig({
  plugins: [
    umdPlugin(),
  ],
  include: [
    'lib/**/*.umd.spec.ts',
  ],
});
