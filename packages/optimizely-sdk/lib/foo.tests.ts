import { assert } from 'chai';
import { Foo } from './foo';

interface Whaddup {
  foo: number;
}

describe('newtstests', () => {
  it('works', () => {
    assert.isFalse(false);
  });

  it('foo has string', () => {
    const foo = new Foo();
    assert.isString(foo.bar);
  });
});
