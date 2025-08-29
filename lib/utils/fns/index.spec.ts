import { describe, it, expect } from 'vitest';

import { groupBy, objectEntries, objectValues, find, sprintf, keyBy, assignBy } from '.'

describe('utils', () => {
  describe('groupBy', () => {
    it('should group values by some key function', () => {
      const input = [
        { firstName: 'jordan', lastName: 'foo' },
        { firstName: 'jordan', lastName: 'bar' },
        { firstName: 'james', lastName: 'foxy' },
      ]
      const result = groupBy(input, item => item.firstName)

      expect(result).toEqual([
        [
          { firstName: 'jordan', lastName: 'foo' },
          { firstName: 'jordan', lastName: 'bar' },
        ],
        [{ firstName: 'james', lastName: 'foxy' }],
      ])
    })
  })

  describe('objectEntries', () => {
    it('should return object entries', () => {
      expect(objectEntries({ foo: 'bar', bar: 123 })).toEqual([['foo', 'bar'], ['bar', 123]])
    })
  })

  describe('objectValues', () => {
    it('should return object values', () => {
      expect(objectValues({ foo: 'bar', bar: 123 })).toEqual(['bar', 123])
    })
    // TODO test for enumerable properties only
  })

  describe('find', () => {
    it('should return the value if found in an array', () => {
      const input = [
        { firstName: 'jordan', lastName: 'foo' },
        { firstName: 'jordan', lastName: 'bar' },
        { firstName: 'james', lastName: 'foxy' },
      ]

      expect(find(input, item => item.firstName === 'jordan')).toEqual({
        firstName: 'jordan',
        lastName: 'foo',
      })
    })

    it('should return undefined if NOT found in an array', () => {
      const input = [
        { firstName: 'jordan', lastName: 'foo' },
        { firstName: 'jordan', lastName: 'bar' },
        { firstName: 'james', lastName: 'foxy' },
      ]

      expect(find(input, item => item.firstName === 'joe')).toBeUndefined()
    })
  })

  describe('keyBy', () => {
    it('return an object with keys generated from the key function', () => {
      const input = [
        { key: 'foo', firstName: 'jordan', lastName: 'foo' },
        { key: 'bar', firstName: 'jordan', lastName: 'bar' },
        { key: 'baz', firstName: 'james', lastName: 'foxy' },
      ]

      expect(keyBy(input, 'key')).toEqual({
        foo: { key: 'foo', firstName: 'jordan', lastName: 'foo' },
        bar: { key: 'bar', firstName: 'jordan', lastName: 'bar' },
        baz: { key: 'baz', firstName: 'james', lastName: 'foxy' },
      })
    })
  })

  describe('assignBy', () => {
    it('should assign array elements to an object using the specified key', () => {
      const input = [
        { key: 'foo', firstName: 'jordan', lastName: 'foo' },
        { key: 'bar', firstName: 'jordan', lastName: 'bar' },
        { key: 'baz', firstName: 'james', lastName: 'foxy' },
      ]
      const base = {}

      assignBy(input, 'key', base)

      expect(base).toEqual({
        foo: { key: 'foo', firstName: 'jordan', lastName: 'foo' },
        bar: { key: 'bar', firstName: 'jordan', lastName: 'bar' },
        baz: { key: 'baz', firstName: 'james', lastName: 'foxy' },
      })
    })

    it('should append to an existing object', () => {
      const input = [
        { key: 'foo', firstName: 'jordan', lastName: 'foo' },
        { key: 'bar', firstName: 'jordan', lastName: 'bar' },
      ]
      const base: any = { existing: 'value' }

      assignBy(input, 'key', base)

      expect(base).toEqual({
        existing: 'value',
        foo: { key: 'foo', firstName: 'jordan', lastName: 'foo' },
        bar: { key: 'bar', firstName: 'jordan', lastName: 'bar' },
      })
    })

    it('should handle empty array', () => {
      const base: any = { existing: 'value' }

      assignBy([], 'key', base)

      expect(base).toEqual({ existing: 'value' })
    })

    it('should handle null/undefined array', () => {
      const base: any = { existing: 'value' }

      assignBy(null as any, 'key', base)
      expect(base).toEqual({ existing: 'value' })

      assignBy(undefined as any, 'key', base)
      expect(base).toEqual({ existing: 'value' })
    })

    it('should override existing values with the same key', () => {
      const input = [
        { key: 'foo', firstName: 'jordan', lastName: 'updated' },
        { key: 'bar', firstName: 'james', lastName: 'new' },
      ]
      const base: any = {
        foo: { key: 'foo', firstName: 'john', lastName: 'original' },
        existing: 'value'
      }

      assignBy(input, 'key', base)

      expect(base).toEqual({
        existing: 'value',
        foo: { key: 'foo', firstName: 'jordan', lastName: 'updated' },
        bar: { key: 'bar', firstName: 'james', lastName: 'new' },
      })
    })
  })

  describe('sprintf', () => {
    it('sprintf(msg)', () => {
      expect(sprintf('this is my message')).toBe('this is my message')
    })

    it('sprintf(msg, arg1)', () => {
      expect(sprintf('hi %s', 'jordan')).toBe('hi jordan')
    })

    it('sprintf(msg, arg1, arg2)', () => {
      expect(sprintf('hi %s its %s', 'jordan', 'jon')).toBe('hi jordan its jon')
    })

    it('should print undefined if an argument is missing', () => {
      expect(sprintf('hi %s its %s', 'jordan')).toBe('hi jordan its undefined')
    })

    it('should evaluate a function', () => {
      expect(sprintf('hi %s its %s', 'jordan', () => 'a function')).toBe('hi jordan its a function')
    })

    it('should work with numbers', () => {
      expect(sprintf('hi %s', 123)).toBe('hi 123')
    })

    it('should not error when passed an object', () => {
      expect(sprintf('hi %s', { foo: 'bar' })).toBe('hi [object Object]')
    })
  })
})
