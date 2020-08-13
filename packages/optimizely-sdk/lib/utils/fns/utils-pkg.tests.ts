/**
 * Copyright 2020, Optimizely
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
/// <reference types="jest" />
import { isValidEnum, groupBy, objectEntries, objectValues, find, keyBy, sprintf } from './utils-pkg'

describe('utils', () => {
  describe('isValidEnum', () => {
    enum myEnum {
      FOO = 0,
      BAR = 1,
    }

    it('should return false when not valid', () => {
      expect(isValidEnum(myEnum, 2)).toBe(false)
    })

    it('should return true when valid', () => {
      expect(isValidEnum(myEnum, 1)).toBe(true)
      expect(isValidEnum(myEnum, myEnum.FOO)).toBe(true)
    })
  })

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

      expect(keyBy(input, item => item.key)).toEqual({
        foo: { key: 'foo', firstName: 'jordan', lastName: 'foo' },
        bar: { key: 'bar', firstName: 'jordan', lastName: 'bar' },
        baz: { key: 'baz', firstName: 'james', lastName: 'foxy' },
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
