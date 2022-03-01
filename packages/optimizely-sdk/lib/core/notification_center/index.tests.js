/****************************************************************************
 * Copyright 2020, Optimizely, Inc. and contributors                        *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/
import sinon from 'sinon';
import { assert } from 'chai';

import { createNotificationCenter } from './';
import * as enums from '../../utils/enums';
import { createLogger } from '../../plugins/logger';
import errorHandler from '../../plugins/error_handler';

var LOG_LEVEL = enums.LOG_LEVEL;

describe('lib/core/notification_center', function() {
  describe('APIs', function() {
    var mockLogger = createLogger({ logLevel: LOG_LEVEL.INFO });
    var mockErrorHandler = errorHandler.handleError;
    var mockLoggerStub;
    var mockErrorHandlerStub;
    var notificationCenterInstance;
    var sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      mockLoggerStub = sandbox.stub(mockLogger, 'log');
      mockErrorHandlerStub = sandbox.stub(mockErrorHandler, 'handleError');

      notificationCenterInstance = createNotificationCenter({
        logger: mockLoggerStub,
        errorHandler: mockErrorHandlerStub,
      });
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe('#addNotificationListener', function() {
      context('the listener type is not a valid type', function() {
        it('should return -1 if notification type is not a valid type', function() {
          var INVALID_LISTENER_TYPE = 'INVALID_LISTENER_TYPE';
          var genericCallbackSpy = sinon.spy();

          var listenerId = notificationCenterInstance.addNotificationListener(
            INVALID_LISTENER_TYPE,
            genericCallbackSpy
          );
          assert.strictEqual(listenerId, -1);
        });
      });

      context('the listener type is a valid type', function() {
        it('should return -1 if that same callback is already added', function() {
          var activateCallback;
          var decisionCallback;
          var logEventCallback;
          var configUpdateCallback;
          var trackCallback;
          // add a listener for each type
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateCallback);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionCallback);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventCallback);
          notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallback
          );
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackCallback);
          // assertions
          assert.strictEqual(
            notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateCallback),
            -1
          );
          assert.strictEqual(
            notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionCallback),
            -1
          );
          assert.strictEqual(
            notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventCallback),
            -1
          );
          assert.strictEqual(
            notificationCenterInstance.addNotificationListener(
              enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
              configUpdateCallback
            ),
            -1
          );
          assert.strictEqual(
            notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackCallback),
            -1
          );
        });

        it('should return an id (listenerId) > 0 of the notification listener if callback is not already added', function() {
          var activateCallback;
          var decisionCallback;
          var logEventCallback;
          var configUpdateCallback;
          var trackCallback;
          // store a listenerId for each type
          var activateListenerId = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.ACTIVATE,
            activateCallback
          );
          var decisionListenerId = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.DECISION,
            decisionCallback
          );
          var logEventListenerId = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.LOG_EVENT,
            logEventCallback
          );
          var configUpdateListenerId = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallback
          );
          var trackListenerId = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.TRACK,
            trackCallback
          );
          // assertions
          assert.isAbove(activateListenerId, 0);
          assert.isAbove(decisionListenerId, 0);
          assert.isAbove(logEventListenerId, 0);
          assert.isAbove(configUpdateListenerId, 0);
          assert.isAbove(trackListenerId, 0);
        });
      });
    });

    describe('#removeNotificationListener', function() {
      context('the listenerId does not exist', function() {
        it('should return false if listenerId does not exist', function() {
          var notListenerId = notificationCenterInstance.removeNotificationListener(5);
          assert.isFalse(notListenerId);
        });
      });

      context('listenerId exists', function() {
        it('should return true when existing listener is removed', function() {
          var activateCallback;
          var decisionCallback;
          var logEventCallback;
          var configUpdateCallback;
          var trackCallback;
          // add listeners for each type
          var activateListenerId = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.ACTIVATE,
            activateCallback
          );
          var decisionListenerId = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.DECISION,
            decisionCallback
          );
          var logEventListenerId = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.LOG_EVENT,
            logEventCallback
          );
          var configListenerId = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallback
          );
          var trackListenerId = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.TRACK,
            trackCallback
          );
          // remove listeners for each type
          var activateListenerRemoved = notificationCenterInstance.removeNotificationListener(activateListenerId);
          var decisionListenerRemoved = notificationCenterInstance.removeNotificationListener(decisionListenerId);
          var logEventListenerRemoved = notificationCenterInstance.removeNotificationListener(logEventListenerId);
          var trackListenerRemoved = notificationCenterInstance.removeNotificationListener(trackListenerId);
          var configListenerRemoved = notificationCenterInstance.removeNotificationListener(configListenerId);

          // assertions
          assert.strictEqual(activateListenerRemoved, true);
          assert.strictEqual(decisionListenerRemoved, true);
          assert.strictEqual(logEventListenerRemoved, true);
          assert.strictEqual(trackListenerRemoved, true);
          assert.strictEqual(configListenerRemoved, true);
        });

        it('should only remove the specified listener', function() {
          var activateCallbackSpy1 = sinon.spy();
          var activateCallbackSpy2 = sinon.spy();
          var decisionCallbackSpy1 = sinon.spy();
          var decisionCallbackSpy2 = sinon.spy();
          var logEventCallbackSpy1 = sinon.spy();
          var logEventCallbackSpy2 = sinon.spy();
          var configUpdateCallbackSpy1 = sinon.spy();
          var configUpdateCallbackSpy2 = sinon.spy();
          var trackCallbackSpy1 = sinon.spy();
          var trackCallbackSpy2 = sinon.spy();
          // register listeners for each type
          var activateListenerId1 = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.ACTIVATE,
            activateCallbackSpy1
          );
          var decisionListenerId1 = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.DECISION,
            decisionCallbackSpy1
          );
          var logeventlistenerId1 = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.LOG_EVENT,
            logEventCallbackSpy1
          );
          var configUpdateListenerId1 = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallbackSpy1
          );
          var trackListenerId1 = notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.TRACK,
            trackCallbackSpy1
          );
          // register second listeners for each type
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy2);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionCallbackSpy2);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy2);
          notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallbackSpy2
          );
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackCallbackSpy2);
          // remove first listener
          var activateListenerRemoved1 = notificationCenterInstance.removeNotificationListener(activateListenerId1);
          var decisionListenerRemoved1 = notificationCenterInstance.removeNotificationListener(decisionListenerId1);
          var logEventListenerRemoved1 = notificationCenterInstance.removeNotificationListener(logeventlistenerId1);
          var configUpdateListenerRemoved1 = notificationCenterInstance.removeNotificationListener(
            configUpdateListenerId1
          );
          var trackListenerRemoved1 = notificationCenterInstance.removeNotificationListener(trackListenerId1);
          // send notifications
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.ACTIVATE, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.DECISION, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.LOG_EVENT, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.TRACK, {});
          // Assertions
          assert.strictEqual(activateListenerRemoved1, true);
          sinon.assert.notCalled(activateCallbackSpy1);
          sinon.assert.calledOnce(activateCallbackSpy2);
          assert.strictEqual(decisionListenerRemoved1, true);
          sinon.assert.notCalled(decisionCallbackSpy1);
          sinon.assert.calledOnce(decisionCallbackSpy2);
          assert.strictEqual(logEventListenerRemoved1, true);
          sinon.assert.notCalled(logEventCallbackSpy1);
          sinon.assert.calledOnce(logEventCallbackSpy2);
          assert.strictEqual(configUpdateListenerRemoved1, true);
          sinon.assert.notCalled(configUpdateCallbackSpy1);
          sinon.assert.calledOnce(configUpdateCallbackSpy2);
          assert.strictEqual(trackListenerRemoved1, true);
          sinon.assert.notCalled(trackCallbackSpy1);
          sinon.assert.calledOnce(trackCallbackSpy2);
        });
      });
    });

    describe('#clearAllNotificationListeners', function() {
      it('should remove all notification listeners for all types', function() {
        var activateCallbackSpy1 = sinon.spy();
        var decisionCallbackSpy1 = sinon.spy();
        var logEventCallbackSpy1 = sinon.spy();
        var configUpdateCallbackSpy1 = sinon.spy();
        var trackCallbackSpy1 = sinon.spy();
        // add a listener for each notification type
        notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
        notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
        notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
        notificationCenterInstance.addNotificationListener(
          enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
          configUpdateCallbackSpy1
        );
        notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
        // remove all listeners
        notificationCenterInstance.clearAllNotificationListeners();
        // trigger send notifications
        notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.ACTIVATE, {});
        notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.DECISION, {});
        notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.LOG_EVENT, {});
        notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, {});
        notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.TRACK, {});
        // check that none of the now removed listeners were called
        sinon.assert.notCalled(activateCallbackSpy1);
        sinon.assert.notCalled(decisionCallbackSpy1);
        sinon.assert.notCalled(logEventCallbackSpy1);
        sinon.assert.notCalled(configUpdateCallbackSpy1);
        sinon.assert.notCalled(trackCallbackSpy1);
      });
    });

    describe('#clearNotificationListeners', function() {
      context('there is only one type of listener added', function() {
        it('should remove all notification listeners for the ACTIVATE type', function() {
          var activateCallbackSpy1 = sinon.spy();
          var activateCallbackSpy2 = sinon.spy();
          //add 2 different listeners for ACTIVATE
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy2);
          // remove ACTIVATE listeners
          notificationCenterInstance.clearNotificationListeners(enums.NOTIFICATION_TYPES.ACTIVATE);
          // trigger send notifications
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.ACTIVATE, {});
          // check that none of the ACTIVATE listeners were called
          sinon.assert.notCalled(activateCallbackSpy1);
          sinon.assert.notCalled(activateCallbackSpy2);
        });

        it('should remove all notification listeners for the DECISION type', function() {
          var decisionCallbackSpy1 = sinon.spy();
          var decisionCallbackSpy2 = sinon.spy();
          //add 2 different listeners for DECISION
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionCallbackSpy2);
          // remove DECISION listeners
          notificationCenterInstance.clearAllNotificationListeners(enums.NOTIFICATION_TYPES.DECISION);
          // trigger send notifications
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.DECISION, {});
          // check that none of the DECISION listeners were called
          sinon.assert.notCalled(decisionCallbackSpy1);
          sinon.assert.notCalled(decisionCallbackSpy2);
        });

        it('should remove all notification listeners for the LOG_EVENT type', function() {
          var logEventCallbackSpy1 = sinon.spy();
          var logEventCallbackSpy2 = sinon.spy();
          //add 2 different listeners for LOG_EVENT
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy2);
          // remove LOG_EVENT listeners
          notificationCenterInstance.clearAllNotificationListeners(enums.NOTIFICATION_TYPES.LOG_EVENT);
          // trigger send notifications
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.LOG_EVENT, {});
          // check that none of the LOG_EVENT listeners were called
          sinon.assert.notCalled(logEventCallbackSpy1);
          sinon.assert.notCalled(logEventCallbackSpy2);
        });

        it('should remove all notification listeners for the OPTIMIZELY_CONFIG_UPDATE type', function() {
          var configUpdateCallbackSpy1 = sinon.spy();
          var configUpdateCallbackSpy2 = sinon.spy();
          //add 2 different listeners for OPTIMIZELY_CONFIG_UPDATE
          notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallbackSpy1
          );
          notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallbackSpy2
          );
          // remove OPTIMIZELY_CONFIG_UPDATE listeners
          notificationCenterInstance.clearAllNotificationListeners(enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE);
          // trigger send notifications
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, {});
          // check that none of the OPTIMIZELY_CONFIG_UPDATE listeners were called
          sinon.assert.notCalled(configUpdateCallbackSpy1);
          sinon.assert.notCalled(configUpdateCallbackSpy2);
        });

        it('should remove all notification listeners for the TRACK type', function() {
          var trackCallbackSpy1 = sinon.spy();
          var trackCallbackSpy2 = sinon.spy();
          //add 2 different listeners for TRACK
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackCallbackSpy2);
          // remove TRACK listeners
          notificationCenterInstance.clearAllNotificationListeners(enums.NOTIFICATION_TYPES.TRACK);
          // trigger send notifications
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.TRACK, {});
          // check that none of the TRACK listeners were called
          sinon.assert.notCalled(trackCallbackSpy1);
          sinon.assert.notCalled(trackCallbackSpy2);
        });
      });

      context('there is more than one type of listener added', function() {
        it('should only remove ACTIVATE type listeners and not any other types', function() {
          var activateCallbackSpy1 = sinon.spy();
          var activateCallbackSpy2 = sinon.spy();
          var decisionCallbackSpy1 = sinon.spy();
          var logEventCallbackSpy1 = sinon.spy();
          var configUpdateCallbackSpy1 = sinon.spy();
          var trackCallbackSpy1 = sinon.spy();
          //add 2 different listeners for ACTIVATE
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy2);
          // add a listener for each notification type
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
          notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallbackSpy1
          );
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
          // remove only ACTIVATE type
          notificationCenterInstance.clearNotificationListeners(enums.NOTIFICATION_TYPES.ACTIVATE);
          // trigger send notifications
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.ACTIVATE, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.DECISION, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.LOG_EVENT, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.TRACK, {});
          // check that ACTIVATE listeners were note called
          sinon.assert.notCalled(activateCallbackSpy1);
          sinon.assert.notCalled(activateCallbackSpy2);
          // check that all other listeners were called.
          sinon.assert.calledOnce(decisionCallbackSpy1);
          sinon.assert.calledOnce(logEventCallbackSpy1);
          sinon.assert.calledOnce(configUpdateCallbackSpy1);
          sinon.assert.calledOnce(trackCallbackSpy1);
        });

        it('should only remove DECISION type listeners and not any other types', function() {
          var decisionCallbackSpy1 = sinon.spy();
          var decisionCallbackSpy2 = sinon.spy();
          var activateCallbackSpy1 = sinon.spy();
          var logEventCallbackSpy1 = sinon.spy();
          var configUpdateCallbackSpy1 = sinon.spy();
          var trackCallbackSpy1 = sinon.spy();
          // add 2 different listeners for DECISION
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionCallbackSpy2);
          // add a listener for each notification type
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
          notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallbackSpy1
          );
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
          // remove only DECISION type
          notificationCenterInstance.clearNotificationListeners(enums.NOTIFICATION_TYPES.DECISION);
          // trigger send notifications
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.ACTIVATE, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.DECISION, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.LOG_EVENT, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.TRACK, {});
          // check that DECISION listeners were not called
          sinon.assert.notCalled(decisionCallbackSpy1);
          sinon.assert.notCalled(decisionCallbackSpy2);
          // check that all other listeners were called.
          sinon.assert.calledOnce(activateCallbackSpy1);
          sinon.assert.calledOnce(logEventCallbackSpy1);
          sinon.assert.calledOnce(configUpdateCallbackSpy1);
          sinon.assert.calledOnce(trackCallbackSpy1);
        });

        it('should only remove LOG_EVENT type listeners and not any other types', function() {
          var logEventCallbackSpy1 = sinon.spy();
          var logEventCallbackSpy2 = sinon.spy();
          var activateCallbackSpy1 = sinon.spy();
          var decisionCallbackSpy1 = sinon.spy();
          var configUpdateCallbackSpy1 = sinon.spy();
          var trackCallbackSpy1 = sinon.spy();
          // add 2 different listeners for LOG_EVENT
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy2);
          // add a listener for each notification type
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
          notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallbackSpy1
          );
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
          // remove only LOG_EVENT type
          notificationCenterInstance.clearNotificationListeners(enums.NOTIFICATION_TYPES.LOG_EVENT);
          // trigger send notifications
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.ACTIVATE, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.DECISION, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.LOG_EVENT, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.TRACK, {});
          // check that LOG_EVENT listeners were not called
          sinon.assert.notCalled(logEventCallbackSpy1);
          sinon.assert.notCalled(logEventCallbackSpy2);
          // check that all other listeners were called.
          sinon.assert.calledOnce(activateCallbackSpy1);
          sinon.assert.calledOnce(decisionCallbackSpy1);
          sinon.assert.calledOnce(configUpdateCallbackSpy1);
          sinon.assert.calledOnce(trackCallbackSpy1);
        });

        it('should only remove OPTIMIZELY_CONFIG_UPDATE type listeners and not any other types', function() {
          var configUpdateCallbackSpy1 = sinon.spy();
          var configUpdateCallbackSpy2 = sinon.spy();
          var activateCallbackSpy1 = sinon.spy();
          var decisionCallbackSpy1 = sinon.spy();
          var logEventCallbackSpy1 = sinon.spy();
          var trackCallbackSpy1 = sinon.spy();
          // add 2 different listeners for OPTIMIZELY_CONFIG_UPDATE
          notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallbackSpy1
          );
          notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallbackSpy2
          );
          // add a listener for each notification type
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
          // remove only OPTIMIZELY_CONFIG_UPDATE type
          notificationCenterInstance.clearNotificationListeners(enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE);
          // trigger send notifications
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.ACTIVATE, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.DECISION, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.LOG_EVENT, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.TRACK, {});
          // check that OPTIMIZELY_CONFIG_UPDATE listeners were not called
          sinon.assert.notCalled(configUpdateCallbackSpy1);
          sinon.assert.notCalled(configUpdateCallbackSpy2);
          // check that all other listeners were called.
          sinon.assert.calledOnce(activateCallbackSpy1);
          sinon.assert.calledOnce(decisionCallbackSpy1);
          sinon.assert.calledOnce(logEventCallbackSpy1);
          sinon.assert.calledOnce(trackCallbackSpy1);
        });

        it('should only remove TRACK type listeners and not any other types', function() {
          var trackCallbackSpy1 = sinon.spy();
          var trackCallbackSpy2 = sinon.spy();
          var activateCallbackSpy1 = sinon.spy();
          var decisionCallbackSpy1 = sinon.spy();
          var logEventCallbackSpy1 = sinon.spy();
          var configUpdateCallbackSpy1 = sinon.spy();
          // add 2 different listeners for TRACK
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackCallbackSpy2);
          // add a listener for each notification type
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
          notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallbackSpy1
          );
          // remove only TRACK type
          notificationCenterInstance.clearNotificationListeners(enums.NOTIFICATION_TYPES.TRACK);
          // trigger send notifications
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.ACTIVATE, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.DECISION, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.LOG_EVENT, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, {});
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.TRACK, {});
          // check that TRACK listeners were not called
          sinon.assert.notCalled(trackCallbackSpy1);
          sinon.assert.notCalled(trackCallbackSpy2);
          // check that all other listeners were called.
          sinon.assert.calledOnce(activateCallbackSpy1);
          sinon.assert.calledOnce(decisionCallbackSpy1);
          sinon.assert.calledOnce(logEventCallbackSpy1);
          sinon.assert.calledOnce(configUpdateCallbackSpy1);
        });
      });
    });

    describe('#sendNotifications', function() {
      context('send notification for each type ', function() {
        it('should call the listener callback with exact arguments', function() {
          var activateCallbackSpy1 = sinon.spy();
          var decisionCallbackSpy1 = sinon.spy();
          var logEventCallbackSpy1 = sinon.spy();
          var configUpdateCallbackSpy1 = sinon.spy();
          var trackCallbackSpy1 = sinon.spy();
          // listener object data for each type
          var activateData = {
            experiment: {},
            userId: '',
            attributes: {},
            variation: {},
            logEvent: {},
          };
          var decisionData = {
            type: '',
            userId: 'use1',
            attributes: {},
            decisionInfo: {},
          };
          var logEventData = {
            url: '',
            httpVerb: '',
            params: {},
          };
          var configUpdateData = {};
          var trackData = {
            eventKey: '',
            userId: '',
            attributes: {},
            eventTags: {},
          };
          // add listeners
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
          notificationCenterInstance.addNotificationListener(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateCallbackSpy1
          );
          notificationCenterInstance.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
          // send notifications
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.ACTIVATE, activateData);
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.DECISION, decisionData);
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventData);
          notificationCenterInstance.sendNotifications(
            enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
            configUpdateData
          );
          notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.TRACK, trackData);
          // assertions
          sinon.assert.calledWithExactly(activateCallbackSpy1, activateData);
          sinon.assert.calledWithExactly(decisionCallbackSpy1, decisionData);
          sinon.assert.calledWithExactly(logEventCallbackSpy1, logEventData);
          sinon.assert.calledWithExactly(configUpdateCallbackSpy1, configUpdateData);
          sinon.assert.calledWithExactly(trackCallbackSpy1, trackData);
        });
      });
    });
  });
});
