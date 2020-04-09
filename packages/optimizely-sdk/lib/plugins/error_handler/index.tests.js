/**
 * Copyright 2016, 2020 Optimizely
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

import { handleError } from './';

describe('lib/plugins/error_handler', function() {
  describe('APIs', function() {
    describe('handleError', function() {
      it('should just be a no-op function', function() {
        assert.isFunction(handleError);
      });
    });
  });
});
