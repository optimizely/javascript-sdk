/**
 * Copyright 2019-2020 Optimizely
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
import sinon from 'sinon';
import { assert } from 'chai';

import { createLogger } from './index.react_native';
import { LOG_LEVEL } from '../../utils/enums';

describe('lib/plugins/logger/react_native', function() {
  describe('APIs', function() {
    var defaultLogger;
    describe('createLogger', function() {
      it('should return an instance of the default logger', function() {
        defaultLogger = createLogger();
        assert.isObject(defaultLogger);
      });
    });

    describe('log', function() {
      beforeEach(function() {
        defaultLogger = createLogger();

        sinon.stub(console, 'log');
        sinon.stub(console, 'info');
        sinon.stub(console, 'warn');
        sinon.stub(console, 'error');
      });

      afterEach(function() {
        console.log.restore();
        console.info.restore();
        console.warn.restore();
        console.error.restore();
      });

      it('shoud use console.info when log level is info', function() {
        defaultLogger.log(LOG_LEVEL.INFO, 'message');
        sinon.assert.calledWithExactly(console.info, sinon.match(/.*INFO.*message.*/));
        sinon.assert.notCalled(console.log);
        sinon.assert.notCalled(console.warn);
        sinon.assert.notCalled(console.error);
      });

      it('shoud use console.log when log level is debug', function() {
        defaultLogger.log(LOG_LEVEL.DEBUG, 'message');
        sinon.assert.calledWithExactly(console.log, sinon.match(/.*DEBUG.*message.*/));
        sinon.assert.notCalled(console.info);
        sinon.assert.notCalled(console.warn);
        sinon.assert.notCalled(console.error);
      });

      it('shoud use console.warn when log level is warn', function() {
        defaultLogger.log(LOG_LEVEL.WARNING, 'message');
        sinon.assert.calledWithExactly(console.warn, sinon.match(/.*WARNING.*message.*/));
        sinon.assert.notCalled(console.log);
        sinon.assert.notCalled(console.info);
        sinon.assert.notCalled(console.error);
      });

      it('shoud use console.warn when log level is error', function() {
        defaultLogger.log(LOG_LEVEL.ERROR, 'message');
        sinon.assert.calledWithExactly(console.warn, sinon.match(/.*ERROR.*message.*/));
        sinon.assert.notCalled(console.log);
        sinon.assert.notCalled(console.info);
        sinon.assert.notCalled(console.error);
      });
    });
  });
});
