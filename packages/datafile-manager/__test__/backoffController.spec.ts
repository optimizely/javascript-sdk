/**
 * Copyright 2019-2020, Optimizely
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

import BackoffController from '../src/backoffController';

describe('backoffController', () => {
  describe('getDelay', () => {
    it('returns 0 from getDelay if there have been no errors', () => {
      const controller = new BackoffController();
      expect(controller.getDelay()).toBe(0);
    });

    it('increases the delay returned from getDelay (up to a maximum value) after each call to countError', () => {
      const controller = new BackoffController();
      controller.countError();
      expect(controller.getDelay()).toBeGreaterThanOrEqual(8000);
      expect(controller.getDelay()).toBeLessThan(9000);
      controller.countError();
      expect(controller.getDelay()).toBeGreaterThanOrEqual(16000);
      expect(controller.getDelay()).toBeLessThan(17000);
      controller.countError();
      expect(controller.getDelay()).toBeGreaterThanOrEqual(32000);
      expect(controller.getDelay()).toBeLessThan(33000);
      controller.countError();
      expect(controller.getDelay()).toBeGreaterThanOrEqual(64000);
      expect(controller.getDelay()).toBeLessThan(65000);
      controller.countError();
      expect(controller.getDelay()).toBeGreaterThanOrEqual(128000);
      expect(controller.getDelay()).toBeLessThan(129000);
      controller.countError();
      expect(controller.getDelay()).toBeGreaterThanOrEqual(256000);
      expect(controller.getDelay()).toBeLessThan(257000);
      controller.countError();
      expect(controller.getDelay()).toBeGreaterThanOrEqual(512000);
      expect(controller.getDelay()).toBeLessThan(513000);
      // Maximum reached - additional errors should not increase the delay further
      controller.countError();
      expect(controller.getDelay()).toBeGreaterThanOrEqual(512000);
      expect(controller.getDelay()).toBeLessThan(513000);
    });

    it('resets the error count when reset is called', () => {
      const controller = new BackoffController();
      controller.countError();
      expect(controller.getDelay()).toBeGreaterThan(0);
      controller.reset();
      expect(controller.getDelay()).toBe(0);
    });
  });
});
