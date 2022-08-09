/**
 * Copyright 2022, Optimizely
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

/// <reference types="jest" />

import { VuidManager } from '../lib/plugins/vuid_manager';

describe('VUID Manager', () => {

  it('should make a VUID', () => {
    // arrange
    const manager = VuidManager.getInstance();

    // act
    const vuid = manager.makeVuid();

    // assert
    expect(vuid.startsWith('vuid_')).toBe(true);
    expect(vuid.length).toBeGreaterThan(20);
    expect(vuid).not.toContain('-');
  });

  it('should test if a VUID is valid', () => {
    const manager = VuidManager.getInstance();

    expect(manager.isVuid('vuid_123')).toBeTruthy();
    expect(manager.isVuid('vuid-123')).toBeFalsy();
    expect(manager.isVuid('123')).toBeFalsy();
  });

  it('should auto-save and auto-load', () => {
    // TODO: Where is UserDefaults in javascript sdk?
    // UserDefaults.standard.removeObject(forKey: "optimizely-odp")

    let manager = VuidManager.getInstance();
    const vuid1 = manager.vuid;

    manager = VuidManager.getInstance();
    const vuid2 = manager.vuid;

    expect(vuid1).toStrictEqual(vuid2);
    expect(manager.isVuid(vuid1)).toBeTruthy();
    expect(manager.isVuid(vuid2)).toBeTruthy();

    // UserDefaults.standard.removeObject(forKey: "optimizely-odp")

    // TODO: should end up being a new instance since we just removed it above
    manager = VuidManager.getInstance();
    const vuid3 = manager.vuid;

    expect(vuid3).not.toStrictEqual(vuid1);
  });
});
