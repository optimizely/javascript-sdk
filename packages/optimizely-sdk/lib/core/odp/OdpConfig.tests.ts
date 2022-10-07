/**
 * Copyright 2022, Optimizely
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

import { assert } from 'chai';
import { OdpConfig } from './OdpConfig';

describe('/lib/core/odp/OdpConfig', () => {
  const apiHost = 'test-host';
  const apiKey = 'test-key';
  const segmentsToCheck = ['test-segment'];

  describe('ODP Config', () => {
    it('should successfully initialize a new config.', () => {
      const config = new OdpConfig(apiHost, apiKey, segmentsToCheck);

      assert.equal(config.apiHost, apiHost);
      assert.equal(config.apiKey, apiKey);
      assert.equal(config.segmentsToCheck?.join(), segmentsToCheck.join());
    });

    it('should successfully update an existing config.', () => {
      const config = new OdpConfig();
      let configUpdated = config.update(apiHost, apiKey, segmentsToCheck);

      assert.isTrue(configUpdated);
      assert.equal(config.apiHost, apiHost);
      assert.equal(config.apiKey, apiKey);
      assert.equal(config.segmentsToCheck?.join(), segmentsToCheck.join());

      configUpdated = config.update(apiHost, apiKey, segmentsToCheck);
      assert.isFalse(configUpdated);
    });
  });
});
