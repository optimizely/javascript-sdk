/****************************************************************************
 * Copyright 2017-2020, Optimizely, Inc. and contributors                        *
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

// MODULES FOR OBJECTS TO BE USED BY TESTS
var NotificationCenter = require('./')
var errorHandler = require('../../plugins/error_handler');
var logger = require('../../plugins/logger');
var enums = require('../../utils/enums');
var fns = require('../../utils/fns');
var sprintf = require('@optimizely/js-sdk-utils').sprintf;
var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var chai = require('chai');
var sinon = require('sinon');
var assert = chai.assert;

describe('lib/core/notification_center', function() {
    describe('APIs', function() {
        var mockLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});
        var mockErrorHandler = errorHandler.handleError;
        var mockLoggerStub;
        var mockErrorHandlerStub;
        var notificationCenterInstance;
        var listenerId;
        var activateCallbackSpy1;
        var activateCallbackSpy2;
        var decisionCallbackSpy1;
        var decisionCallbackSpy2;
        var logEventCallbackSpy1;
        var logEventCallbackSpy2;
        var configUpdateCallbackSpy1;
        var configUpdateCallbackSpy2;
        var trackCallbackSpy1;
        var trackCallbackSpy2;
    
        beforeEach(function(){
            mockLoggerStub = sinon.stub(mockLogger, 'log');
            mockErrorHandlerStub = sinon.stub(mockErrorHandler, 'handleError');
    
            notificationCenterInstance = NotificationCenter.createNotificationCenter({
                logger: mockLoggerStub,
                errorHandler: mockErrorHandlerStub
            }); 

            activateCallbackSpy1 = sinon.spy();
            activateCallbackSpy2 = sinon.spy();
            decisionCallbackSpy1 = sinon.spy();
            decisionCallbackSpy2 = sinon.spy();
            logEventCallbackSpy1 = sinon.spy();
            logEventCallbackSpy2 = sinon.spy();
            configUpdateCallbackSpy1 = sinon.spy();
            configUpdateCallbackSpy2 = sinon.spy();
            trackCallbackSpy1 = sinon.spy();
            trackCallbackSpy2 = sinon.spy();
        });
    
        afterEach(function(){
            mockLoggerStub.restore();
            mockErrorHandlerStub.restore();
            
            activateCallbackSpy1.reset();
            activateCallbackSpy2.reset();
            decisionCallbackSpy1.reset();
            decisionCallbackSpy2.reset();
            logEventCallbackSpy1.reset();
            logEventCallbackSpy2.reset();
            configUpdateCallbackSpy1.reset();
            configUpdateCallbackSpy2.reset();
            trackCallbackSpy1.reset();
            trackCallbackSpy2.reset();
        });

        describe('#addNotificationListener', function() {
            context('the listener type is not a valid one', function(){
                var INVALID_LISTENER_TYPE = 'INVALID_LISTENER_TYPE'
                var genericCallbackSpy;

                beforeEach(function(){
                    genericCallbackSpy = sinon.spy();
                });

                afterEach(function(){
                    genericCallbackSpy.reset();
                });

                it('should return -1 if notification type is not a valid one', function(){
                    
                    listenerId = notificationCenterInstance.addNotificationListener(
                        INVALID_LISTENER_TYPE, 
                        genericCallbackSpy
                    );
                    assert.strictEqual(listenerId, -1);
                });

                it('should not call the callback function if notification type is not a valid one', function(){
                    listenerId = notificationCenterInstance.addNotificationListener(
                        INVALID_LISTENER_TYPE, 
                        genericCallbackSpy
                    );
                    sinon.assert.notCalled(genericCallbackSpy);
                });
            });

            context('an error is caught', function(){
                it('should return -1 if an error is caught')
                it('should thrown an error if an error is caught');
                it('should log an error message if an error is caught');
            });
            
            context('add notification listener for type ACTIVATE', function(){
                var listenerId2;
                it('should return -1 if that same ACTIVATE callback is already added', function(){
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.ACTIVATE,
                        activateCallbackSpy1
                    );
                    
                    assert.strictEqual(notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.ACTIVATE,
                        activateCallbackSpy1
                    ), -1);

                });

                // should return an id of notification listener (listenerId) if ACTIVATE listener is not already added 
                it('should return an id (listenerId) > 0 of the notification listener if ACTIVATE callback is not already added', function(){
                    listenerId = notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.ACTIVATE,
                        activateCallbackSpy1
                    );

                    assert.isAbove(listenerId, 0);
                });
            });

            context('add notification listener for type DECISION', function(){
                it('should return -1 if that same DECISION callback is already added', function(){
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.DECISION,
                        decisionCallbackSpy1
                    );
                    
                    assert.strictEqual(notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.DECISION,
                        decisionCallbackSpy1
                    ), -1);
                });

                // should return an id of notification listener (listenerId) if DECISION listener is not already added
                it('should return an id (listenerId) > 0 of the notification listener if DECISION callback is not already added', function(){
                    listenerId = notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.DECISION,
                        decisionCallbackSpy1
                    );

                    assert.isAbove(listenerId, 0);
                });
            });

            context('add notification listener for type LOG_EVENT', function(){
                it('should return -1 if that same LOG_EVENT callback is already added', function(){
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.LOG_EVENT,
                        logEventCallbackSpy1
                    );
                    
                    assert.strictEqual(notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.LOG_EVENT,
                        logEventCallbackSpy1
                    ), -1);
                });

                // should return an id of notification listener (listenerId) if LOG_EVENT listener is not already added
                it('should return an id (listenerId) > 0 of the notification listener if LOG_EVENT callback is not already added', function(){
                    listenerId = notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.LOG_EVENT,
                        logEventCallbackSpy1
                    );

                    assert.isAbove(listenerId, 0);
                });

                // LOG_EVENT: should return callback with object argument properties of: url {str}, httpVerb {str}, params {obj} when an impression or conversion is sent
            });
            
            context('add notification listener for type OPTIMIZELY_CONFIG_UPDATE', function(){
                it('should return -1 if that same OPTIMIZELY_CONFIG_UPDATE callback is already added', function(){
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
                        configUpdateCallbackSpy1
                    );
                    
                    assert.strictEqual(notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
                        configUpdateCallbackSpy1
                    ), -1);
                });

                // should return an id of notification listener (listenerId) if OPTIMIZELY_CONFIG_UPDATE listener is not already added
                it('should return an id (listenerId) > 0 of the notification listener if OPTIMIZELY_CONFIG_UPDATE callback is not already added', function(){
                    listenerId = notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
                        configUpdateCallbackSpy1
                    );

                    assert.isAbove(listenerId, 0);
                });
            });

            context('add notification listener for type TRACK', function(){
                it('should return -1 if that same TRACK callback is already added', function(){
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.TRACK,
                        trackCallbackSpy1
                    );
                    
                    assert.strictEqual(notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.TRACK,
                        trackCallbackSpy1
                    ), -1);
                });
                
                // should return an id of notification listener (listenerId) if TRACK listener is not already added
                it('should return an id (listenerId) > 0 of the notification listener if TRACK callback is not already added', function(){
                    listenerId = notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.TRACK,
                        trackCallbackSpy1
                    );

                    assert.isAbove(listenerId, 0);
                });

                // TRACK: should return a callback with object argument properties of: eventKey {str}, userId {str}, attributes {obj|undef}, eventTags {obj|undef}, logEvent {obj} when a conversion event is sent to Optimizely
            });
        });

        describe('#removeNotificationListener', function() {   
            var listenerRemoved;

            it('should return false if listenerId does not exist', function(){
                listenerId = notificationCenterInstance.removeNotificationListener(5);
                assert.isFalse(listenerId);
            });

            context('remove notification listener for type ACTIVATE', function(){
                it('should return true when valid listenerId of ACTIVATE type has been supplied and the listener is removed', function(){
                    listenerId = notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.ACTIVATE,
                        activateCallbackSpy1
                    );
                    listenerRemoved = notificationCenterInstance.removeNotificationListener(listenerId);
                    assert.strictEqual(listenerRemoved, true);
                });
                it('should not remove any other listeners except for the one belonging to the listenerId');
            });
            context('remove notification listener for type DECISION', function(){
                it('should return true when valid listenerId of DECISION type has been supplied and the listener is removed', function(){
                    listenerId = notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.DECISION,
                        decisionCallbackSpy1
                    );
                    listenerRemoved = notificationCenterInstance.removeNotificationListener(listenerId);
                    assert.strictEqual(listenerRemoved, true);
                });
            });
            context('remove notification listener for type LOG_EVENT', function(){
                it('should return true when valid listenerId of LOG_EVENT type has been supplied and the listener is removed', function(){
                    listenerId = notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.LOG_EVENT,
                        logEventCallbackSpy1
                    );
                    listenerRemoved = notificationCenterInstance.removeNotificationListener(listenerId);
                    assert.strictEqual(listenerRemoved, true);
                });
            });
            context('remove notification listener for type OPTIMIZELY_CONFIG_UPDATE', function(){
                it('should return true when valid listenerId of OPTIMIZELY_CONFIG_UPDATE type has been supplied and the listener is removed', function(){
                    listenerId = notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
                        configUpdateCallbackSpy1
                    );
                    listenerRemoved = notificationCenterInstance.removeNotificationListener(listenerId);
                    assert.strictEqual(listenerRemoved, true);
                });
            });
            context('remove notification listener for type TRACK', function(){
                it('should return true when valid listenerId of TRACK type has been supplied and the listener is removed', function(){
                    listenerId = notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.TRACK,
                        trackCallbackSpy1
                    );
                    listenerRemoved = notificationCenterInstance.removeNotificationListener(listenerId);
                    assert.strictEqual(listenerRemoved, true);
                });
            });

        });

        describe('#clearAllNotificationListeners', function() {
            it('should remove all notification listeners for all types', function(){
                // add a listener for each notification type
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.ACTIVATE,
                    activateCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.DECISION,
                    decisionCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.LOG_EVENT,
                    logEventCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
                    configUpdateCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.TRACK,
                    trackCallbackSpy1
                );
                // remove all listeners
                notificationCenterInstance.clearAllNotificationListeners();
                // trigger send notifications
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.ACTIVATE, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.DECISION, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.LOG_EVENT, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.TRACK, 
                    {}
                );
                // check that none of the now removed listeners were called
                sinon.assert.notCalled(activateCallbackSpy1);
                sinon.assert.notCalled(decisionCallbackSpy1);
                sinon.assert.notCalled(logEventCallbackSpy1);
                sinon.assert.notCalled(configUpdateCallbackSpy1);
                sinon.assert.notCalled(trackCallbackSpy1);
            })
        });

        describe('#clearNotificationListeners', function() {
            context('remove every notification listener for type ACTIVATE', function(){
                it('should remove all notification listeners for the ACTIVATE type when there are no listeners for other types', function(){
                    //add 2 different listeners for ACTIVATE
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.ACTIVATE,
                        activateCallbackSpy1
                    );
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.ACTIVATE,
                        activateCallbackSpy2
                    );
                    // remove ACTIVATE listeners
                    notificationCenterInstance.clearAllNotificationListeners(enums.NOTIFICATION_TYPES.ACTIVATE);
                    // trigger send notifications
                    notificationCenterInstance.sendNotifications(
                        enums.NOTIFICATION_TYPES.ACTIVATE, 
                        {}
                    );
                    // check that none of the ACTIVATE listeners were called
                    sinon.assert.notCalled(activateCallbackSpy1);
                    sinon.assert.notCalled(activateCallbackSpy2);
                });

                it('should not remove notification listeners of the other types', function(){
                //add 2 different listeners for ACTIVATE
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.ACTIVATE,
                    activateCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.ACTIVATE,
                    activateCallbackSpy2
                );
                // add a listener for each notification type
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.DECISION,
                    decisionCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.LOG_EVENT,
                    logEventCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
                    configUpdateCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.TRACK,
                    trackCallbackSpy1
                );
                // remove only ACTIVATE type
                notificationCenterInstance.clearNotificationListeners(enums.NOTIFICATION_TYPES.ACTIVATE);
                // trigger send notifications
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.ACTIVATE, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.DECISION, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.LOG_EVENT, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.TRACK, 
                    {}
                );
                // check that ACTIVATE listeners were note called
                sinon.assert.notCalled(activateCallbackSpy1);
                sinon.assert.notCalled(activateCallbackSpy2);
                // check that all other listeners were called. 
                sinon.assert.calledOnce(decisionCallbackSpy1);
                sinon.assert.calledOnce(logEventCallbackSpy1);
                sinon.assert.calledOnce(configUpdateCallbackSpy1);
                sinon.assert.calledOnce(trackCallbackSpy1);
                });
            });

            context('remove every notification listener for type DECISION', function(){
                it('should remove all notification listeners for the DECISION type when there are no listeners for other types', function(){
                    //add 2 different listeners for DECISION
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.DECISION,
                        decisionCallbackSpy1
                    );
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.DECISION,
                        decisionCallbackSpy2
                    );
                    // remove DECISION listeners
                    notificationCenterInstance.clearAllNotificationListeners(enums.NOTIFICATION_TYPES.DECISION);
                    // trigger send notifications
                    notificationCenterInstance.sendNotifications(
                        enums.NOTIFICATION_TYPES.DECISION, 
                        {}
                    );
                    // check that none of the DECISION listeners were called
                    sinon.assert.notCalled(decisionCallbackSpy1);
                    sinon.assert.notCalled(decisionCallbackSpy2);
                });

                it('should not remove notification listeners of the other types when there are no listeners for other types', function(){
                // add 2 different listeners for DECISION
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.DECISION,
                    decisionCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.DECISION,
                    decisionCallbackSpy2
                );
                // add a listener for each notification type
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.ACTIVATE,
                    activateCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.LOG_EVENT,
                    logEventCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
                    configUpdateCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.TRACK,
                    trackCallbackSpy1
                );
                // remove only DECISION type
                notificationCenterInstance.clearNotificationListeners(enums.NOTIFICATION_TYPES.DECISION);
                // trigger send notifications
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.ACTIVATE, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.DECISION, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.LOG_EVENT, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.TRACK, 
                    {}
                );
                // check that DECISION listeners were not called
                sinon.assert.notCalled(decisionCallbackSpy1);
                sinon.assert.notCalled(decisionCallbackSpy2);
                // check that all other listeners were called. 
                sinon.assert.calledOnce(activateCallbackSpy1);
                sinon.assert.calledOnce(logEventCallbackSpy1);
                sinon.assert.calledOnce(configUpdateCallbackSpy1);
                sinon.assert.calledOnce(trackCallbackSpy1);
                });
            });

            context('remove every notification listener for type LOG_EVENT', function(){
                it('should remove all notification listeners for the LOG_EVENT type', function(){
                    //add 2 different listeners for LOG_EVENT
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.LOG_EVENT,
                        logEventCallbackSpy1
                    );
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.LOG_EVENT,
                        logEventCallbackSpy2
                    );
                    // remove LOG_EVENT listeners
                    notificationCenterInstance.clearAllNotificationListeners(enums.NOTIFICATION_TYPES.LOG_EVENT);
                    // trigger send notifications
                    notificationCenterInstance.sendNotifications(
                        enums.NOTIFICATION_TYPES.LOG_EVENT, 
                        {}
                    );
                    // check that none of the LOG_EVENT listeners were called
                    sinon.assert.notCalled(logEventCallbackSpy1);
                    sinon.assert.notCalled(logEventCallbackSpy2);
                });
                it('should not remove notification listeners of the other types', function(){
                // add 2 different listeners for LOG_EVENT
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.LOG_EVENT,
                    logEventCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.LOG_EVENT,
                    logEventCallbackSpy2
                );
                // add a listener for each notification type
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.ACTIVATE,
                    activateCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.DECISION,
                    decisionCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
                    configUpdateCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.TRACK,
                    trackCallbackSpy1
                );
                // remove only LOG_EVENT type
                notificationCenterInstance.clearNotificationListeners(enums.NOTIFICATION_TYPES.LOG_EVENT);
                // trigger send notifications
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.ACTIVATE, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.DECISION, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.LOG_EVENT, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.TRACK, 
                    {}
                );
                // check that LOG_EVENT listeners were not called
                sinon.assert.notCalled(logEventCallbackSpy1);
                sinon.assert.notCalled(logEventCallbackSpy2);
                // check that all other listeners were called. 
                sinon.assert.calledOnce(activateCallbackSpy1);
                sinon.assert.calledOnce(decisionCallbackSpy1);
                sinon.assert.calledOnce(configUpdateCallbackSpy1);
                sinon.assert.calledOnce(trackCallbackSpy1);
                });
            });

            context('remove every notification listener for type OPTIMIZELY_CONFIG_UPDATE', function(){
                it('should remove all notification listeners for the OPTIMIZELY_CONFIG_UPDATE type when there are no listeners for other types', function(){
                    //add 2 different listeners for OPTIMIZELY_CONFIG_UPDATE
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
                        configUpdateCallbackSpy1
                    );
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
                        configUpdateCallbackSpy1
                    );
                    // remove OPTIMIZELY_CONFIG_UPDATE listeners
                    notificationCenterInstance.clearAllNotificationListeners(enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE);
                    // trigger send notifications
                    notificationCenterInstance.sendNotifications(
                        enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, 
                        {}
                    );
                    // check that none of the OPTIMIZELY_CONFIG_UPDATE listeners were called
                    sinon.assert.notCalled(configUpdateCallbackSpy1);
                    sinon.assert.notCalled(configUpdateCallbackSpy1);
                });

                it('should not remove notification listeners of the other types', function(){
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
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.ACTIVATE,
                        activateCallbackSpy1
                    );
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.DECISION,
                        decisionCallbackSpy1
                    );
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.LOG_EVENT,
                        logEventCallbackSpy1
                    );
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.TRACK,
                        trackCallbackSpy1
                    );
                    // remove only OPTIMIZELY_CONFIG_UPDATE type
                    notificationCenterInstance.clearNotificationListeners(enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE);
                    // trigger send notifications
                    notificationCenterInstance.sendNotifications(
                        enums.NOTIFICATION_TYPES.ACTIVATE, 
                        {}
                    );
                    notificationCenterInstance.sendNotifications(
                        enums.NOTIFICATION_TYPES.DECISION, 
                        {}
                    );
                    notificationCenterInstance.sendNotifications(
                        enums.NOTIFICATION_TYPES.LOG_EVENT, 
                        {}
                    );
                    notificationCenterInstance.sendNotifications(
                        enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, 
                        {}
                    );
                    notificationCenterInstance.sendNotifications(
                        enums.NOTIFICATION_TYPES.TRACK, 
                        {}
                    );
                    // check that OPTIMIZELY_CONFIG_UPDATE listeners were not called
                    sinon.assert.notCalled(configUpdateCallbackSpy1);
                    sinon.assert.notCalled(configUpdateCallbackSpy1);
                    // check that all other listeners were called. 
                    sinon.assert.calledOnce(activateCallbackSpy1);
                    sinon.assert.calledOnce(decisionCallbackSpy1);
                    sinon.assert.calledOnce(logEventCallbackSpy1);
                    sinon.assert.calledOnce(trackCallbackSpy1);
                    });
            });

            context('remove every notification listener for type TRACK', function(){
                it('should remove all notification listeners for the TRACK type when there are no listeners for other types', function(){
                    //add 2 different listeners for TRACK
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.TRACK,
                        trackCallbackSpy1
                    );
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.TRACK,
                        trackCallbackSpy2
                    );
                    // remove TRACK listeners
                    notificationCenterInstance.clearAllNotificationListeners(enums.NOTIFICATION_TYPES.TRACK);
                    // trigger send notifications
                    notificationCenterInstance.sendNotifications(
                        enums.NOTIFICATION_TYPES.TRACK, 
                        {}
                    );
                    // check that none of the TRACK listeners were called
                    sinon.assert.notCalled(trackCallbackSpy1);
                    sinon.assert.notCalled(trackCallbackSpy2);
                });
                it('should not remove notification listeners of the other types', function(){
                // add 2 different listeners for TRACK
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.TRACK,
                    trackCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.TRACK,
                    trackCallbackSpy2
                );
                // add a listener for each notification type
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.ACTIVATE,
                    activateCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.DECISION,
                    decisionCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.LOG_EVENT,
                    logEventCallbackSpy1
                );
                notificationCenterInstance.addNotificationListener(
                    enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
                    configUpdateCallbackSpy1
                );
                // remove only TRACK type
                notificationCenterInstance.clearNotificationListeners(enums.NOTIFICATION_TYPES.TRACK);
                // trigger send notifications
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.ACTIVATE, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.DECISION, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.LOG_EVENT, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, 
                    {}
                );
                notificationCenterInstance.sendNotifications(
                    enums.NOTIFICATION_TYPES.TRACK, 
                    {}
                );
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
            context('send notification for type ACTIVATE', function(){
                // ACTIVATE: should return callback with object argument properties of: experiment {obj}, user_id {str}, attributes{obj|undef}, variation{obj}, logEvent {obj} when an impression is sent           
                it('the ACTIVATE callback should be called with exact options arguments', function(){
                    var activateData = {
                        experiment: {},
                        userId: "",
                        attributes: {},
                        variation: {},
                        logEvent: {}
                    }
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.ACTIVATE,
                        activateCallbackSpy1
                    );
                    notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.ACTIVATE, activateData)
                    sinon.assert.calledWithExactly(activateCallbackSpy1, activateData);
                });
            });

            context('send notification for type DECISION', function(){
                // DECISION: should return callback with object argument properties of: type {str}, userId {str}, attributes {obj|undef}, decisionInfo {obj|undef} when a decision is made in the system; type {str} (DECISION_TYPES): feature, ab-test, feature-test, feature-variable decisionInfo {obj|undef}: decisionInfo k-v map determined by type {str}
                it('the DECISION callback should be ccalled with exact arguments', function(){
                    var decisionData = {
                        type: '',
                        userId: 'use1',
                        attributes: {},
                        decisionInfo: {}
                      };
                      notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.DECISION,
                        decisionCallbackSpy1
                    );
                    notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.DECISION, decisionData)
                    sinon.assert.calledWithExactly(decisionCallbackSpy1, decisionData);
                });
            });

            context('send notification for type LOG_EVENT', function(){
                // LOG_EVENT: should return callback with object argument properties of: url {str}, httpVerb {str}, params {obj} when an impression or conversion is sent
                it('the LOG_EVENT callback should be called with exact arguments', function(){
                    var logEventData = {
                        url: '',
                        httpVerb: '',
                        params: {}
                    };
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.LOG_EVENT,
                        logEventCallbackSpy1
                    );
                    notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.LOG_EVENT, logEventData)
                    sinon.assert.calledWithExactly(logEventCallbackSpy1, logEventData);
                });
            });

            context('send notification for type OPTIMIZELY_CONFIG_UPDATE', function(){
                // OPTIMIZELY_CONFIG_UPDATE: should return 'OPTIMIZELY_CONFIG_UPDATE'
                it('the OPTIMIZELY_CONFIG_UPDATE callback should be called with exact arguments', function(){
                    var configUpdateData = {};
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
                        configUpdateCallbackSpy1
                    );
                    notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, configUpdateData);
                    sinon.assert.calledWithExactly(configUpdateCallbackSpy1, configUpdateData);
                });
            });

            context('send notification for type TRACK', function(){
                // TRACK: should return a callback with object argument properties of: eventKey {str}, userId {str}, attributes {obj|undef}, eventTags {obj|undef}, logEvent {obj} when a conversion event is sent to Optimizely
                it('the TRACK callback should be called with exact arguments', function(){
                    var trackData = {
                        eventKey: '',
                        userId: '',
                        attributes: {},
                        eventTags: {}
                    };
                    notificationCenterInstance.addNotificationListener(
                        enums.NOTIFICATION_TYPES.TRACK,
                        trackCallbackSpy1
                    );
                    notificationCenterInstance.sendNotifications(enums.NOTIFICATION_TYPES.TRACK, trackData);
                    sinon.assert.calledWithExactly(trackCallbackSpy1, trackData);
                });
            });
        });
    });
});