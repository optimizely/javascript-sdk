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
import { vi } from 'vitest';

// The spec files are written for Vitest 3, where vi.restoreAllMocks() also
// reset every mock (calls and implementation). Since Vitest 4 it only restores
// spies created with vi.spyOn, so specs that call it in afterEach would see
// calls pile up from earlier tests. Restore the Vitest 3 behavior here.
const restoreAllMocks = vi.restoreAllMocks.bind(vi);

vi.restoreAllMocks = () => {
  vi.resetAllMocks();
  return restoreAllMocks();
};
