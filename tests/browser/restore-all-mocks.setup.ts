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

// The spec files expect vi.restoreAllMocks() to also reset every mock (calls and
// implementation), as the root project's Vitest does. This Vitest only restores
// spies created with vi.spyOn, so specs that call it in afterEach would see calls
// pile up from earlier tests. Reset all mocks before restoring.
const restoreAllMocks = vi.restoreAllMocks.bind(vi);

vi.restoreAllMocks = () => {
  vi.resetAllMocks();
  return restoreAllMocks();
};
