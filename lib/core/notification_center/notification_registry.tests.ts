/**
 * Copyright 2023-2024, Optimizely
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

import { expect } from 'chai';
import { NotificationRegistry } from './notification_registry';

describe('Notification Registry', () => {
  it('Returns null notification center when SDK Key is null', () => {
    const notificationCenter = NotificationRegistry.getNotificationCenter();
    expect(notificationCenter).to.be.undefined;
  });

  it('Returns the same notification center when SDK Keys are the same and not null', () => {
    const sdkKey = 'testSDKKey';
    const notificationCenterA = NotificationRegistry.getNotificationCenter(sdkKey);
    const notificationCenterB = NotificationRegistry.getNotificationCenter(sdkKey);
    expect(notificationCenterA).to.eql(notificationCenterB);
  });

  it('Returns different notification centers when SDK Keys are not the same', () => {
    const sdkKeyA = 'testSDKKeyA';
    const sdkKeyB = 'testSDKKeyB';
    const notificationCenterA = NotificationRegistry.getNotificationCenter(sdkKeyA);
    const notificationCenterB = NotificationRegistry.getNotificationCenter(sdkKeyB);
    expect(notificationCenterA).to.not.eql(notificationCenterB);
  });

  it('Removes old notification centers from the registry when removeNotificationCenter is called on the registry', () => {
    const sdkKey = 'testSDKKey';
    const notificationCenterA = NotificationRegistry.getNotificationCenter(sdkKey);
    NotificationRegistry.removeNotificationCenter(sdkKey);

    const notificationCenterB = NotificationRegistry.getNotificationCenter(sdkKey);

    expect(notificationCenterA).to.not.eql(notificationCenterB);
  });

  it('Does not throw an error when calling removeNotificationCenter with a null SDK Key', () => {
    const sdkKey = 'testSDKKey';
    const notificationCenterA = NotificationRegistry.getNotificationCenter(sdkKey);
    NotificationRegistry.removeNotificationCenter();

    const notificationCenterB = NotificationRegistry.getNotificationCenter(sdkKey);

    expect(notificationCenterA).to.eql(notificationCenterB);
  });
});
