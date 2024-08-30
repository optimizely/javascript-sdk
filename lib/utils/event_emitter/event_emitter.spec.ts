import { it, vi, expect } from 'vitest';

import { EventEmitter } from './event_emitter';

it('should call all registered listeners on emit event', () => {
  const emitter = new EventEmitter<{ foo: number, bar: string }>();
  const fooListener1 = vi.fn();
  const fooListener2 = vi.fn();

  emitter.on('foo', fooListener1);
  emitter.on('foo', fooListener2);

  const barListener1 = vi.fn();
  const barListener2 = vi.fn();

  emitter.on('bar', barListener1);
  emitter.on('bar', barListener2);

  emitter.emit('foo', 1);
  expect(fooListener1).toHaveBeenCalledWith(1);
  expect(fooListener2).toHaveBeenCalledWith(1);
})

// it('should remove listeners', () => {
//   const emitter = new EventEmitter();
//   const cb = jest.fn();
//   emitter.on('foo', cb);
//   emitter.off('foo', cb);
//   emitter.emit('foo');
//   expect(cb).not.toHaveBeenCalled();
// })

// it('should remove all listeners', () => {
//   const emitter = new EventEmitter();
//   const cb = jest.fn();
//   emitter.on('foo', cb);
//   emitter.on('foo', cb);
//   emitter.off('foo');
//   emitter.emit('foo');
//   expect(cb).not.toHaveBeenCalled();
// }
