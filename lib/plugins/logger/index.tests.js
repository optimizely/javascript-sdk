/**
 * Copyright 2016, 2020, Optimizely
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
import { assert, expect } from 'chai';
import sinon from 'sinon';

import { createLogger } from './';
import { LOG_LEVEL } from '../../utils/enums';;

describe('lib/plugins/logger', function() {
  describe('APIs', function() {
    var defaultLogger;
    describe('createLogger', function() {
      it('should return an instance of the default logger', function() {
        defaultLogger = createLogger({ logLevel: LOG_LEVEL.NOTSET });
        assert.isObject(defaultLogger);
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.NOTSET);
      });
    });

    describe('log', function() {
      beforeEach(function() {
        defaultLogger = createLogger({ logLevel: LOG_LEVEL.INFO });

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

      it('should log a message at the threshold log level', function() {
        defaultLogger.log(LOG_LEVEL.INFO, 'message');

        sinon.assert.notCalled(console.log);
        sinon.assert.calledOnce(console.info);
        sinon.assert.calledWithExactly(console.info, sinon.match(/.*INFO.*message.*/));
        sinon.assert.notCalled(console.warn);
        sinon.assert.notCalled(console.error);
      });

      it('should log a message if its log level is higher than the threshold log level', function() {
        defaultLogger.log(LOG_LEVEL.WARNING, 'message');

        sinon.assert.notCalled(console.log);
        sinon.assert.notCalled(console.info);
        sinon.assert.calledOnce(console.warn);
        sinon.assert.calledWithExactly(console.warn, sinon.match(/.*WARN.*message.*/));
        sinon.assert.notCalled(console.error);
      });

      it('should not log a message if its log level is lower than the threshold log level', function() {
        defaultLogger.log(LOG_LEVEL.DEBUG, 'message');

        sinon.assert.notCalled(console.log);
        sinon.assert.notCalled(console.info);
        sinon.assert.notCalled(console.warn);
        sinon.assert.notCalled(console.error);
      });
    });

    describe('setLogLevel', function() {
      beforeEach(function() {
        defaultLogger = createLogger({ logLevel: LOG_LEVEL.NOTSET });
      });

      it('should set the log level to the specified log level', function() {
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.NOTSET);

        defaultLogger.setLogLevel(LOG_LEVEL.DEBUG);
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.DEBUG);

        defaultLogger.setLogLevel(LOG_LEVEL.INFO);
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.INFO);
      });

      it('should set the log level to the ERROR when log level is not specified', function() {
        defaultLogger.setLogLevel();
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.ERROR);
      });

      it('should set the log level to the ERROR when log level is not valid', function() {
        defaultLogger.setLogLevel(-123);
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.ERROR);

        defaultLogger.setLogLevel(undefined);
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.ERROR);

        defaultLogger.setLogLevel('abc');
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.ERROR);
      });
    });
  });
});
