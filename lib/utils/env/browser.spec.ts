/**
 * Copyright 2026, Optimizely
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

import { it, describe, expect, beforeEach, afterEach } from 'vitest';
import { isLocalStorageAvailable } from './browser';

describe('isLocalStorageAvailable', () => {
  let originalDescriptor: PropertyDescriptor | undefined;

  const mockLocalStorageGetter = (get: () => unknown) => {
    Object.defineProperty(globalThis, 'localStorage', { get, configurable: true });
  };

  beforeEach(() => {
    originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  });

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('should return true when localStorage global can be accessed', () => {
    mockLocalStorageGetter(() => ({}));

    expect(isLocalStorageAvailable()).toBe(true);
  });

  it('should return false when localStorage is null', () => {
    mockLocalStorageGetter(() => null);

    expect(isLocalStorageAvailable()).toBe(false);
  });

  it('should return false when localStorage is not defined', () => {
    mockLocalStorageGetter(() => {
      throw new ReferenceError('localStorage is not defined');
    });

    expect(isLocalStorageAvailable()).toBe(false);
  });

  it('should return false when accessing localStorage throws a SecurityError', () => {
    mockLocalStorageGetter(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    expect(isLocalStorageAvailable()).toBe(false);
  });
});
