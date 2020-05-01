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

import EventEmitter from '../src/eventEmitter';

describe('event_emitter', () => {
  describe('on', () => {
    let emitter: EventEmitter;
    beforeEach(() => {
      emitter = new EventEmitter();
    });

    it('can add a listener for the update event', () => {
      const listener = jest.fn();
      emitter.on('update', listener);
      emitter.emit('update', { datafile: 'abcd' });
      expect(listener).toBeCalledTimes(1);
    });

    it('passes the argument from emit to the listener', () => {
      const listener = jest.fn();
      emitter.on('update', listener);
      emitter.emit('update', { datafile: 'abcd' });
      expect(listener).toBeCalledWith({ datafile: 'abcd' });
    });

    it('returns a dispose function that removes the listener', () => {
      const listener = jest.fn();
      const disposer = emitter.on('update', listener);
      disposer();
      emitter.emit('update', { datafile: 'efgh' });
      expect(listener).toBeCalledTimes(0);
    });

    it('can add several listeners for the update event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();
      emitter.on('update', listener1);
      emitter.on('update', listener2);
      emitter.on('update', listener3);
      emitter.emit('update', { datafile: 'abcd' });
      expect(listener1).toBeCalledTimes(1);
      expect(listener2).toBeCalledTimes(1);
      expect(listener3).toBeCalledTimes(1);
    });

    it('can add several listeners and remove only some of them', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();
      const disposer1 = emitter.on('update', listener1);
      const disposer2 = emitter.on('update', listener2);
      emitter.on('update', listener3);
      emitter.emit('update', { datafile: 'abcd' });
      expect(listener1).toBeCalledTimes(1);
      expect(listener2).toBeCalledTimes(1);
      expect(listener3).toBeCalledTimes(1);
      disposer1();
      disposer2();
      emitter.emit('update', { datafile: 'efgh' });
      expect(listener1).toBeCalledTimes(1);
      expect(listener2).toBeCalledTimes(1);
      expect(listener3).toBeCalledTimes(2);
    });

    it('can add listeners for different events and remove only some of them', () => {
      const readyListener = jest.fn();
      const updateListener = jest.fn();
      const readyDisposer = emitter.on('ready', readyListener);
      const updateDisposer = emitter.on('update', updateListener);
      emitter.emit('ready');
      expect(readyListener).toBeCalledTimes(1);
      expect(updateListener).toBeCalledTimes(0);
      emitter.emit('update', { datafile: 'abcd' });
      expect(readyListener).toBeCalledTimes(1);
      expect(updateListener).toBeCalledTimes(1);
      readyDisposer();
      emitter.emit('ready');
      expect(readyListener).toBeCalledTimes(1);
      expect(updateListener).toBeCalledTimes(1);
      emitter.emit('update', { datafile: 'efgh' });
      expect(readyListener).toBeCalledTimes(1);
      expect(updateListener).toBeCalledTimes(2);
      updateDisposer();
      emitter.emit('update', { datafile: 'ijkl' });
      expect(readyListener).toBeCalledTimes(1);
      expect(updateListener).toBeCalledTimes(2);
    });

    it('can remove all listeners', () => {
      const readyListener = jest.fn();
      const updateListener = jest.fn();
      emitter.on('ready', readyListener);
      emitter.on('update', updateListener);
      emitter.removeAllListeners();
      emitter.emit('update', { datafile: 'abcd' });
      emitter.emit('ready');
      expect(readyListener).toBeCalledTimes(0);
      expect(updateListener).toBeCalledTimes(0);
    });
  });
});
