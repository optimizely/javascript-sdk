/// <reference types="jest" />
import { isValidEnum, groupBy, objectValues, find, keyBy } from '../src/utils'

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

  describe('objectValues', () => {
    it('should return object values', () => {
      expect(objectValues({ foo: 'bar', bar: 123 })).toEqual(['bar', 123])
    })
    // TODO test for enumerable properties only
  })

  describe('objectValues', () => {
    it('should return object values', () => {
      expect(objectValues({ foo: 'bar', bar: 123 })).toEqual(['bar', 123])
    })
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
})
