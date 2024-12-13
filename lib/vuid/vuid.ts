/**
 * Copyright 2024, Optimizely
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

import { v4 as uuidV4 } from 'uuid';

export const VUID_PREFIX = `vuid_`;
export const VUID_MAX_LENGTH = 32;

export const isVuid = (vuid: string): boolean => vuid.startsWith(VUID_PREFIX) && vuid.length > VUID_PREFIX.length;

export const makeVuid = (): string => {
  // make sure UUIDv4 is used (not UUIDv1 or UUIDv6) since the trailing 5 chars will be truncated. See TDD for details.
  const uuid = uuidV4();
  const formatted = uuid.replace(/-/g, '');
  const vuidFull = `${VUID_PREFIX}${formatted}`;

  return vuidFull.length <= VUID_MAX_LENGTH ? vuidFull : vuidFull.substring(0, VUID_MAX_LENGTH);
};
