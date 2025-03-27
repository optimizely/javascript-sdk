/**
 * Copyright 2025, Optimizely
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

import { describe, beforeEach, it, vi, expect } from 'vitest';
import { createNotificationCenter, DefaultNotificationCenter } from './';
import {
  ActivateListenerPayload,
  DecisionListenerPayload,
  LogEventListenerPayload,
  NOTIFICATION_TYPES,
  TrackListenerPayload,
  OptimizelyConfigUpdateListenerPayload,
} from './type';
import { getMockLogger } from '../tests/mock/mock_logger';
import { LoggerFacade } from '../logging/logger';

describe('addNotificationListener', () => {
  let logger: LoggerFacade;
  let notificationCenterInstance: DefaultNotificationCenter;

  beforeEach(() => {
    logger = getMockLogger();
    notificationCenterInstance = createNotificationCenter({ logger });
  });

  it('should return -1 if notification type is not a valid type', () => {
    const INVALID_LISTENER_TYPE = 'INVALID_LISTENER_TYPE' as const;
    const mockFn = vi.fn();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const listenerId = notificationCenterInstance.addNotificationListener(INVALID_LISTENER_TYPE, mockFn);

    expect(listenerId).toBe(-1);
  });

  it('should return an id (listernId) > 0 of the notification listener if callback is not already added', () => {
    const activateCallback = vi.fn();
    const decisionCallback = vi.fn();
    const logEventCallback = vi.fn();
    const configUpdateCallback = vi.fn();
    const trackCallback = vi.fn();
    // store a listenerId for each type
    const activateListenerId = notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.ACTIVATE,
      activateCallback
    );
    const decisionListenerId = notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.DECISION,
      decisionCallback
    );
    const logEventListenerId = notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.LOG_EVENT,
      logEventCallback
    );
    const configUpdateListenerId = notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallback
    );
    const trackListenerId = notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.TRACK, trackCallback);

    expect(activateListenerId).toBeGreaterThan(0);
    expect(decisionListenerId).toBeGreaterThan(0);
    expect(logEventListenerId).toBeGreaterThan(0);
    expect(configUpdateListenerId).toBeGreaterThan(0);
    expect(trackListenerId).toBeGreaterThan(0);
  });
});

describe('removeNotificationListener', () => {
  let logger: LoggerFacade;
  let notificationCenterInstance: DefaultNotificationCenter;

  beforeEach(() => {
    logger = getMockLogger();
    notificationCenterInstance = createNotificationCenter({ logger });
  });

  it('should return false if listernId does not exist', () => {
    const notListenerId = notificationCenterInstance.removeNotificationListener(5);

    expect(notListenerId).toBe(false);
  });

  it('should return true when eixsting listener is removed', () => {
    const activateCallback = vi.fn();
    const decisionCallback = vi.fn();
    const logEventCallback = vi.fn();
    const configUpdateCallback = vi.fn();
    const trackCallback = vi.fn();
    // add listeners for each type
    const activateListenerId = notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.ACTIVATE,
      activateCallback
    );
    const decisionListenerId = notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.DECISION,
      decisionCallback
    );
    const logEventListenerId = notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.LOG_EVENT,
      logEventCallback
    );
    const configListenerId = notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallback
    );
    const trackListenerId = notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.TRACK, trackCallback);
    // remove listeners for each type
    const activateListenerRemoved = notificationCenterInstance.removeNotificationListener(activateListenerId);
    const decisionListenerRemoved = notificationCenterInstance.removeNotificationListener(decisionListenerId);
    const logEventListenerRemoved = notificationCenterInstance.removeNotificationListener(logEventListenerId);
    const trackListenerRemoved = notificationCenterInstance.removeNotificationListener(trackListenerId);
    const configListenerRemoved = notificationCenterInstance.removeNotificationListener(configListenerId);

    expect(activateListenerRemoved).toBe(true);
    expect(decisionListenerRemoved).toBe(true);
    expect(logEventListenerRemoved).toBe(true);
    expect(trackListenerRemoved).toBe(true);
    expect(configListenerRemoved).toBe(true);
  });
  it('should only remove the specified listener', () => {
    const activateCallbackSpy1 = vi.fn();
    const activateCallbackSpy2 = vi.fn();
    const decisionCallbackSpy1 = vi.fn();
    const decisionCallbackSpy2 = vi.fn();
    const logEventCallbackSpy1 = vi.fn();
    const logEventCallbackSpy2 = vi.fn();
    const configUpdateCallbackSpy1 = vi.fn();
    const configUpdateCallbackSpy2 = vi.fn();
    const trackCallbackSpy1 = vi.fn();
    const trackCallbackSpy2 = vi.fn();
    // register listeners for each type
    const activateListenerId1 = notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.ACTIVATE,
      activateCallbackSpy1
    );
    const decisionListenerId1 = notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.DECISION,
      decisionCallbackSpy1
    );
    const logeventlistenerId1 = notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.LOG_EVENT,
      logEventCallbackSpy1
    );
    const configUpdateListenerId1 = notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallbackSpy1
    );
    const trackListenerId1 = notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.TRACK,
      trackCallbackSpy1
    );
    // register second listeners for each type
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy2);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.DECISION, decisionCallbackSpy2);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy2);
    notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallbackSpy2
    );
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.TRACK, trackCallbackSpy2);
    // remove first listener
    const activateListenerRemoved1 = notificationCenterInstance.removeNotificationListener(activateListenerId1);
    const decisionListenerRemoved1 = notificationCenterInstance.removeNotificationListener(decisionListenerId1);
    const logEventListenerRemoved1 = notificationCenterInstance.removeNotificationListener(logeventlistenerId1);
    const configUpdateListenerRemoved1 = notificationCenterInstance.removeNotificationListener(configUpdateListenerId1);
    const trackListenerRemoved1 = notificationCenterInstance.removeNotificationListener(trackListenerId1);
    // send notifications
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, {} as ActivateListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.DECISION, {} as DecisionListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.LOG_EVENT, {} as LogEventListenerPayload);
    notificationCenterInstance.sendNotifications(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      ({} as unknown) as OptimizelyConfigUpdateListenerPayload
    );
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.TRACK, {} as TrackListenerPayload);

    expect(activateListenerRemoved1).toBe(true);
    expect(activateCallbackSpy1).not.toHaveBeenCalled();
    expect(activateCallbackSpy2).toHaveBeenCalledTimes(1);
    expect(decisionListenerRemoved1).toBe(true);
    expect(decisionCallbackSpy1).not.toHaveBeenCalled();
    expect(decisionCallbackSpy2).toHaveBeenCalledTimes(1);
    expect(logEventListenerRemoved1).toBe(true);
    expect(logEventCallbackSpy1).not.toHaveBeenCalled();
    expect(logEventCallbackSpy2).toHaveBeenCalledTimes(1);
    expect(configUpdateListenerRemoved1).toBe(true);
    expect(configUpdateCallbackSpy1).not.toHaveBeenCalled();
    expect(configUpdateCallbackSpy2).toHaveBeenCalledTimes(1);
    expect(trackListenerRemoved1).toBe(true);
    expect(trackCallbackSpy1).not.toHaveBeenCalled();
    expect(trackCallbackSpy2).toHaveBeenCalledTimes(1);
  });
});

describe('clearAllNotificationListeners', () => {
  let logger: LoggerFacade;
  let notificationCenterInstance: DefaultNotificationCenter;

  beforeEach(() => {
    logger = getMockLogger();
    notificationCenterInstance = createNotificationCenter({ logger });
  });

  it('should remove all notification listeners for all types', () => {
    const activateCallbackSpy1 = vi.fn();
    const decisionCallbackSpy1 = vi.fn();
    const logEventCallbackSpy1 = vi.fn();
    const configUpdateCallbackSpy1 = vi.fn();
    const trackCallbackSpy1 = vi.fn();
    // add a listener for each notification type
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
    notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallbackSpy1
    );
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
    // remove all listeners
    notificationCenterInstance.clearAllNotificationListeners();
    // trigger send notifications
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, {} as ActivateListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.DECISION, {} as DecisionListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.LOG_EVENT, {} as LogEventListenerPayload);
    notificationCenterInstance.sendNotifications(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      ({} as unknown) as OptimizelyConfigUpdateListenerPayload
    );
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.TRACK, {} as TrackListenerPayload);

    expect(activateCallbackSpy1).not.toHaveBeenCalled();
    expect(decisionCallbackSpy1).not.toHaveBeenCalled();
    expect(logEventCallbackSpy1).not.toHaveBeenCalled();
    expect(configUpdateCallbackSpy1).not.toHaveBeenCalled();
    expect(trackCallbackSpy1).not.toHaveBeenCalled();
  });
});

describe('clearNotificationListeners', () => {
  let logger: LoggerFacade;
  let notificationCenterInstance: DefaultNotificationCenter;

  beforeEach(() => {
    logger = getMockLogger();
    notificationCenterInstance = createNotificationCenter({ logger });
  });

  it('should remove all notification listeners for the ACTIVATE type', () => {
    const activateCallbackSpy1 = vi.fn();
    const activateCallbackSpy2 = vi.fn();
    //add 2 different listeners for ACTIVATE
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy2);
    // remove ACTIVATE listeners
    notificationCenterInstance.clearNotificationListeners(NOTIFICATION_TYPES.ACTIVATE);
    // trigger send notifications
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, {} as ActivateListenerPayload);

    expect(activateCallbackSpy1).not.toHaveBeenCalled();
    expect(activateCallbackSpy2).not.toHaveBeenCalled();
  });

  it('should remove all notification listeners for the DECISION type', () => {
    const decisionCallbackSpy1 = vi.fn();
    const decisionCallbackSpy2 = vi.fn();
    //add 2 different listeners for DECISION
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.DECISION, decisionCallbackSpy2);
    // remove DECISION listeners
    notificationCenterInstance.clearNotificationListeners(NOTIFICATION_TYPES.DECISION);
    // trigger send notifications
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.DECISION, {} as DecisionListenerPayload);

    expect(decisionCallbackSpy1).not.toHaveBeenCalled();
    expect(decisionCallbackSpy2).not.toHaveBeenCalled();
  });

  it('should remove all notification listeners for the LOG_EVENT type', () => {
    const logEventCallbackSpy1 = vi.fn();
    const logEventCallbackSpy2 = vi.fn();
    //add 2 different listeners for LOG_EVENT
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy2);
    // remove LOG_EVENT listeners
    notificationCenterInstance.clearNotificationListeners(NOTIFICATION_TYPES.LOG_EVENT);
    // trigger send notifications
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.LOG_EVENT, {} as LogEventListenerPayload);

    expect(logEventCallbackSpy1).not.toHaveBeenCalled();
    expect(logEventCallbackSpy2).not.toHaveBeenCalled();
  });

  it('should remove all notification listeners for the OPTIMIZELY_CONFIG_UPDATE type', () => {
    const configUpdateCallbackSpy1 = vi.fn();
    const configUpdateCallbackSpy2 = vi.fn();
    //add 2 different listeners for OPTIMIZELY_CONFIG_UPDATE
    notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallbackSpy1
    );
    notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallbackSpy2
    );
    // remove OPTIMIZELY_CONFIG_UPDATE listeners
    notificationCenterInstance.clearNotificationListeners(NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE);
    // trigger send notifications
    notificationCenterInstance.sendNotifications(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      ({} as unknown) as OptimizelyConfigUpdateListenerPayload
    );

    expect(configUpdateCallbackSpy1).not.toHaveBeenCalled();
    expect(configUpdateCallbackSpy2).not.toHaveBeenCalled();
  });

  it('should remove all notification listeners for the TRACK type', () => {
    const trackCallbackSpy1 = vi.fn();
    const trackCallbackSpy2 = vi.fn();
    //add 2 different listeners for TRACK
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.TRACK, trackCallbackSpy2);
    // remove TRACK listeners
    notificationCenterInstance.clearNotificationListeners(NOTIFICATION_TYPES.TRACK);
    // trigger send notifications
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.TRACK, {} as TrackListenerPayload);

    expect(trackCallbackSpy1).not.toHaveBeenCalled();
    expect(trackCallbackSpy2).not.toHaveBeenCalled();
  });

  it('should only remove ACTIVATE type listeners and not any other types', () => {
    const activateCallbackSpy1 = vi.fn();
    const activateCallbackSpy2 = vi.fn();
    const decisionCallbackSpy1 = vi.fn();
    const logEventCallbackSpy1 = vi.fn();
    const configUpdateCallbackSpy1 = vi.fn();
    const trackCallbackSpy1 = vi.fn();
    //add 2 different listeners for ACTIVATE
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy2);
    // add a listener for each notification type
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
    notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallbackSpy1
    );
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
    // remove only ACTIVATE type
    notificationCenterInstance.clearNotificationListeners(NOTIFICATION_TYPES.ACTIVATE);
    // trigger send notifications
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, {} as ActivateListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.DECISION, {} as DecisionListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.LOG_EVENT, {} as LogEventListenerPayload);
    notificationCenterInstance.sendNotifications(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      ({} as unknown) as OptimizelyConfigUpdateListenerPayload
    );
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.TRACK, {} as TrackListenerPayload);

    expect(activateCallbackSpy1).not.toHaveBeenCalled();
    expect(activateCallbackSpy2).not.toHaveBeenCalled();
    expect(decisionCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(logEventCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(configUpdateCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(trackCallbackSpy1).toHaveBeenCalledTimes(1);
  });

  it('should only remove DECISION type listeners and not any other types', () => {
    const decisionCallbackSpy1 = vi.fn();
    const decisionCallbackSpy2 = vi.fn();
    const activateCallbackSpy1 = vi.fn();
    const logEventCallbackSpy1 = vi.fn();
    const configUpdateCallbackSpy1 = vi.fn();
    const trackCallbackSpy1 = vi.fn();
    // add 2 different listeners for DECISION
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.DECISION, decisionCallbackSpy2);
    // add a listener for each notification type
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
    notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallbackSpy1
    );
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
    // remove only DECISION type
    notificationCenterInstance.clearNotificationListeners(NOTIFICATION_TYPES.DECISION);
    // trigger send notifications
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, {} as ActivateListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.DECISION, {} as DecisionListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.LOG_EVENT, {} as LogEventListenerPayload);
    notificationCenterInstance.sendNotifications(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      ({} as unknown) as OptimizelyConfigUpdateListenerPayload
    );
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.TRACK, {} as TrackListenerPayload);

    expect(decisionCallbackSpy1).not.toHaveBeenCalled();
    expect(decisionCallbackSpy2).not.toHaveBeenCalled();
    expect(activateCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(logEventCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(configUpdateCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(trackCallbackSpy1).toHaveBeenCalledTimes(1);
  });

  it('should only remove LOG_EVENT type listeners and not any other types', () => {
    const logEventCallbackSpy1 = vi.fn();
    const logEventCallbackSpy2 = vi.fn();
    const activateCallbackSpy1 = vi.fn();
    const decisionCallbackSpy1 = vi.fn();
    const configUpdateCallbackSpy1 = vi.fn();
    const trackCallbackSpy1 = vi.fn();
    // add 2 different listeners for LOG_EVENT
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy2);
    // add a listener for each notification type
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
    notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallbackSpy1
    );
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
    // remove only LOG_EVENT type
    notificationCenterInstance.clearNotificationListeners(NOTIFICATION_TYPES.LOG_EVENT);
    // trigger send notifications
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, {} as ActivateListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.DECISION, {} as DecisionListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.LOG_EVENT, {} as LogEventListenerPayload);
    notificationCenterInstance.sendNotifications(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      ({} as unknown) as OptimizelyConfigUpdateListenerPayload
    );
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.TRACK, {} as TrackListenerPayload);

    expect(logEventCallbackSpy1).not.toHaveBeenCalled();
    expect(logEventCallbackSpy2).not.toHaveBeenCalled();
    expect(activateCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(decisionCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(configUpdateCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(trackCallbackSpy1).toHaveBeenCalledTimes(1);
  });

  it('should only remove OPTIMIZELY_CONFIG_UPDATE type listeners and not any other types', () => {
    const configUpdateCallbackSpy1 = vi.fn();
    const configUpdateCallbackSpy2 = vi.fn();
    const activateCallbackSpy1 = vi.fn();
    const decisionCallbackSpy1 = vi.fn();
    const logEventCallbackSpy1 = vi.fn();
    const trackCallbackSpy1 = vi.fn();
    // add 2 different listeners for OPTIMIZELY_CONFIG_UPDATE
    notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallbackSpy1
    );
    notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallbackSpy2
    );
    // add a listener for each notification type
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
    // remove only OPTIMIZELY_CONFIG_UPDATE type
    notificationCenterInstance.clearNotificationListeners(NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE);
    // trigger send notifications
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, {} as ActivateListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.DECISION, {} as DecisionListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.LOG_EVENT, {} as LogEventListenerPayload);
    notificationCenterInstance.sendNotifications(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      ({} as unknown) as OptimizelyConfigUpdateListenerPayload
    );
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.TRACK, {} as TrackListenerPayload);

    expect(configUpdateCallbackSpy1).not.toHaveBeenCalled();
    expect(configUpdateCallbackSpy2).not.toHaveBeenCalled();
    expect(activateCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(decisionCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(logEventCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(trackCallbackSpy1).toHaveBeenCalledTimes(1);
  });

  it('should only remove TRACK type listeners and not any other types', () => {
    const trackCallbackSpy1 = vi.fn();
    const trackCallbackSpy2 = vi.fn();
    const activateCallbackSpy1 = vi.fn();
    const decisionCallbackSpy1 = vi.fn();
    const logEventCallbackSpy1 = vi.fn();
    const configUpdateCallbackSpy1 = vi.fn();
    // add 2 different listeners for TRACK
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.TRACK, trackCallbackSpy2);
    // add a listener for each notification type
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
    notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallbackSpy1
    );
    // remove only TRACK type
    notificationCenterInstance.clearNotificationListeners(NOTIFICATION_TYPES.TRACK);
    // trigger send notifications
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, {} as ActivateListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.DECISION, {} as DecisionListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.LOG_EVENT, {} as LogEventListenerPayload);
    notificationCenterInstance.sendNotifications(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      ({} as unknown) as OptimizelyConfigUpdateListenerPayload
    );
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.TRACK, {} as TrackListenerPayload);

    expect(trackCallbackSpy1).not.toHaveBeenCalled();
    expect(trackCallbackSpy2).not.toHaveBeenCalled();
    expect(activateCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(decisionCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(logEventCallbackSpy1).toHaveBeenCalledTimes(1);
    expect(configUpdateCallbackSpy1).toHaveBeenCalledTimes(1);
  });
});

describe('sendNotifications', () => {
  let logger: LoggerFacade;
  let notificationCenterInstance: DefaultNotificationCenter;

  beforeEach(() => {
    logger = getMockLogger();
    notificationCenterInstance = createNotificationCenter({ logger });
  });
  it('should call the listener callback with exact arguments', () => {
    const activateCallbackSpy1 = vi.fn();
    const decisionCallbackSpy1 = vi.fn();
    const logEventCallbackSpy1 = vi.fn();
    const configUpdateCallbackSpy1 = vi.fn();
    const trackCallbackSpy1 = vi.fn();
    // listener object data for each type
    const activateData = {
      experiment: {},
      userId: '',
      attributes: {},
      variation: {},
      logEvent: {},
    };
    const decisionData = {
      type: '',
      userId: 'use1',
      attributes: {},
      decisionInfo: {},
    };
    const logEventData = {
      url: '',
      httpVerb: '',
      params: {},
    };
    const configUpdateData = {};
    const trackData = {
      eventKey: '',
      userId: '',
      attributes: {},
      eventTags: {},
    };
    // add listeners
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.ACTIVATE, activateCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.DECISION, decisionCallbackSpy1);
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.LOG_EVENT, logEventCallbackSpy1);
    notificationCenterInstance.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      configUpdateCallbackSpy1
    );
    notificationCenterInstance.addNotificationListener(NOTIFICATION_TYPES.TRACK, trackCallbackSpy1);
    // send notifications
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, activateData as ActivateListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.DECISION, decisionData as DecisionListenerPayload);
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.LOG_EVENT, logEventData as LogEventListenerPayload);
    notificationCenterInstance.sendNotifications(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      (configUpdateData as unknown) as OptimizelyConfigUpdateListenerPayload
    );
    notificationCenterInstance.sendNotifications(NOTIFICATION_TYPES.TRACK, trackData as TrackListenerPayload);

    expect(activateCallbackSpy1).toHaveBeenCalledWith(activateData);
    expect(decisionCallbackSpy1).toHaveBeenCalledWith(decisionData);
    expect(logEventCallbackSpy1).toHaveBeenCalledWith(logEventData);
    expect(configUpdateCallbackSpy1).toHaveBeenCalledWith(configUpdateData);
    expect(trackCallbackSpy1).toHaveBeenCalledWith(trackData);
  });
});
