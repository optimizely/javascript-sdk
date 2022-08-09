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

import sinon from 'sinon';
import { assert } from 'chai';

describe('VUID Manager', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should make a VUID', () => {
    // arrange
    // TODO: implement
    const manager = {
      makeVuid: () => {
        return '';
      },
    };

    // act
    const vuid = manager.makeVuid();

    // assert
    assert.isTrue(vuid.startsWith('vuid_'));
    assert.isTrue(vuid.length > 20);
  });

  it('should test if a VUID is valid', () => {
    // TODO: implement
    const manager = {
      isVuid: (visitorId) => {
        return true;
      },
    };

    assert.isTrue(manager.isVuid('vuid_123'));
    assert.isFalse(manager.isVuid('vuid-123'));
    assert.isFalse(manager.isVuid('123'));
  });

  it('should auto-save and auto-load', () => {
    // TODO: Where is UserDefaults in javascript sdk?
    // UserDefaults.standard.removeObject(forKey: "optimizely-odp")

    // TODO: implement
    let manager = {
      vuid: 'vuid_77e42d9a17f311ed861d0242ac120002',
      isVuid: (visitorId) => {
        return true;
      },
    };
    const vuid1 = manager.vuid;

    // TODO: should be same instance as above static
    manager = manager; // OdpVuidManager()
    const vuid2 = manager.vuid;

    assert.strictEqual(vuid1, vuid2);
    assert.isTrue(manager.isVuid(vuid1));
    assert.isTrue(manager.isVuid(vuid2));

    // UserDefaults.standard.removeObject(forKey: "optimizely-odp")

    // TODO: should end up being a new instance since we just removed it above
    manager = { vuid: 'vuid_06fac8e017f411ed861d0242ac120002' };
    const vuid3 = manager.vuid;

    assert.notEqual(vuid1, vuid3);
  });
});
