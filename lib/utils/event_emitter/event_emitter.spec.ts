import { it, vi, expect } from 'vitest';

import { EventEmitter } from './event_emitter';
import exp from 'constants';

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

it('should remove listeners correctly', () => {
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

// it('should remove all listeners', () => {
//   const emitter = new EventEmitter();
//   const cb = jest.fn();
//   emitter.on('foo', cb);
//   emitter.on('foo', cb);
//   emitter.off('foo');
//   emitter.emit('foo');
//   expect(cb).not.toHaveBeenCalled();
// }
