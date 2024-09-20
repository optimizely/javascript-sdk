/**
 * Copyright 2024 Optimizely
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

import { it, vi, expect } from 'vitest';

import { EventEmitter } from './event_emitter';

it('should call all registered listeners correctly on emit event', () => {
  const emitter = new EventEmitter<{ foo: number, bar: string, baz: boolean}>();
  const fooListener1 = vi.fn();
  const fooListener2 = vi.fn();

  emitter.on('foo', fooListener1);
  emitter.on('foo', fooListener2);

  const barListener1 = vi.fn();
  const barListener2 = vi.fn();

  emitter.on('bar', barListener1);
  emitter.on('bar', barListener2);

  const bazListener = vi.fn();
  emitter.on('baz', bazListener);

  emitter.emit('foo', 1);
  emitter.emit('bar', 'hello');

  expect(fooListener1).toHaveBeenCalledOnce();
  expect(fooListener1).toHaveBeenCalledWith(1);
  expect(fooListener2).toHaveBeenCalledOnce();
  expect(fooListener2).toHaveBeenCalledWith(1);
  expect(barListener1).toHaveBeenCalledOnce();
  expect(barListener1).toHaveBeenCalledWith('hello');
  expect(barListener2).toHaveBeenCalledOnce();
  expect(barListener2).toHaveBeenCalledWith('hello');

  expect(bazListener).not.toHaveBeenCalled();
});

it('should remove listeners correctly when the function returned from on is called', () => {
  const emitter = new EventEmitter<{ foo: number, bar: string }>();
  const fooListener1 = vi.fn();
  const fooListener2 = vi.fn();

  const dispose = emitter.on('foo', fooListener1);
  emitter.on('foo', fooListener2);

  const barListener1 = vi.fn();
  const barListener2 = vi.fn();

  emitter.on('bar', barListener1);
  emitter.on('bar', barListener2);

  dispose();
  emitter.emit('foo', 1);
  emitter.emit('bar', 'hello');

  expect(fooListener1).not.toHaveBeenCalled();
  expect(fooListener2).toHaveBeenCalledOnce();
  expect(fooListener2).toHaveBeenCalledWith(1);
  expect(barListener1).toHaveBeenCalledWith('hello');
  expect(barListener1).toHaveBeenCalledWith('hello');
})

it('should remove all listeners when removeAllListeners() is called', () => {
  const emitter = new EventEmitter<{ foo: number, bar: string, baz: boolean}>();
  const fooListener1 = vi.fn();
  const fooListener2 = vi.fn();

  emitter.on('foo', fooListener1);
  emitter.on('foo', fooListener2);

  const barListener1 = vi.fn();
  const barListener2 = vi.fn();

  emitter.on('bar', barListener1);
  emitter.on('bar', barListener2);

  emitter.removeAllListeners();

  emitter.emit('foo', 1);
  emitter.emit('bar', 'hello');

  expect(fooListener1).not.toHaveBeenCalled();
  expect(fooListener2).not.toHaveBeenCalled();
  expect(barListener1).not.toHaveBeenCalled();
  expect(barListener2).not.toHaveBeenCalled();
});
