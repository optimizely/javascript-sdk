/// <reference types="jest" />

import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk'
import { createUserWrapper } from './createUserWrapper'

describe('createUserWrapper', () => {
  let MockedOptimizelySDKWrapper: jest.Mock<OptimizelySDKWrapper>

  beforeEach(() => {
    MockedOptimizelySDKWrapper = jest.fn(() => {
      return ({
        activate: jest.fn().mockReturnValue('var1'),
        getVariation: jest.fn().mockReturnValue('var1'),
        isFeatureEnabled: jest.fn().mockReturnValue(true),
        getFeatureVariables: jest.fn().mockReturnValue({ foo: 'bar' }),
        getFeatureVariableInteger: jest.fn().mockReturnValue(42),
        getFeatureVariableString: jest.fn().mockReturnValue('result'),
        getFeatureVariableBoolean: jest.fn().mockReturnValue(true),
        getFeatureVariableDouble: jest.fn().mockReturnValue(69),
        track: jest.fn(),
      } as unknown) as OptimizelySDKWrapper
    })
  })

  describe('activate', () => {
    it('should proxy without UserAttributes', () => {
      const userId = 'james'
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
      })

      const result = wrapper.activate('exp')
      expect(result).toBe('var1')
      expect(instance.activate).toHaveBeenCalledWith('exp', userId, {})
    })

    it('should proxy with UserAttributes', () => {
      const userId = 'james'
      const userAttributes = {
        plan: 'bronze',
      }
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
        userAttributes,
      })

      const result = wrapper.activate('exp')
      expect(result).toBe('var1')
      expect(instance.activate).toHaveBeenCalledWith('exp', userId, userAttributes)
    })
  })

  describe('getVariation', () => {
    it('should proxy without UserAttributes', () => {
      const userId = 'james'
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
      })

      const result = wrapper.getVariation('exp')
      expect(result).toBe('var1')
      expect(instance.getVariation).toHaveBeenCalledWith('exp', userId, {})
    })

    it('should proxy with UserAttributes', () => {
      const userId = 'james'
      const userAttributes = {
        plan: 'bronze',
      }
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
        userAttributes,
      })

      const result = wrapper.getVariation('exp')
      expect(result).toBe('var1')
      expect(instance.getVariation).toHaveBeenCalledWith('exp', userId, userAttributes)
    })
  })

  describe('isFeatureEnabled', () => {
    it('should proxy without UserAttributes', () => {
      const userId = 'james'
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
      })

      const result = wrapper.isFeatureEnabled('feature1')
      expect(result).toBe(true)
      expect(instance.isFeatureEnabled).toHaveBeenCalledWith('feature1', userId, {})
    })

    it('should proxy with UserAttributes', () => {
      const userId = 'james'
      const userAttributes = {
        plan: 'bronze',
      }
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
        userAttributes,
      })

      const result = wrapper.isFeatureEnabled('feature1')
      expect(result).toBe(true)
      expect(instance.isFeatureEnabled).toHaveBeenCalledWith(
        'feature1',
        userId,
        userAttributes,
      )
    })
  })

  describe('getFeatureVariables', () => {
    it('should proxy without UserAttributes', () => {
      const userId = 'james'
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
      })

      const result = wrapper.getFeatureVariables('featureKey')
      expect(result).toEqual({ foo: 'bar' })
      expect(instance.getFeatureVariables).toHaveBeenCalledWith('featureKey', userId, {})
    })

    it('should proxy with UserAttributes', () => {
      const userId = 'james'
      const userAttributes = {
        plan: 'bronze',
      }
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
        userAttributes,
      })

      const result = wrapper.getFeatureVariables('featureKey')
      expect(result).toEqual({ foo: 'bar' })
      expect(instance.getFeatureVariables).toHaveBeenCalledWith(
        'featureKey',
        userId,
        userAttributes,
      )
    })
  })

  describe('getFeatureVariableString', () => {
    it('should proxy without UserAttributes', () => {
      const userId = 'james'
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
      })

      const result = wrapper.getFeatureVariableString('featureKey', 'variableKey')
      expect(result).toBe('result')
      expect(instance.getFeatureVariableString).toHaveBeenCalledWith(
        'featureKey',
        'variableKey',
        userId,
        {},
      )
    })

    it('should proxy with UserAttributes', () => {
      const userId = 'james'
      const userAttributes = {
        plan: 'bronze',
      }
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
        userAttributes,
      })

      const result = wrapper.getFeatureVariableString('featureKey', 'variableKey')
      expect(result).toBe('result')
      expect(instance.getFeatureVariableString).toHaveBeenCalledWith(
        'featureKey',
        'variableKey',
        userId,
        userAttributes,
      )
    })
  })

  describe('getFeatureVariableBoolean', () => {
    it('should proxy without UserAttributes', () => {
      const userId = 'james'
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
      })

      const result = wrapper.getFeatureVariableBoolean('featureKey', 'variableKey')
      expect(result).toBe(true)
      expect(instance.getFeatureVariableBoolean).toHaveBeenCalledWith(
        'featureKey',
        'variableKey',
        userId,
        {},
      )
    })

    it('should proxy with UserAttributes', () => {
      const userId = 'james'
      const userAttributes = {
        plan: 'bronze',
      }
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
        userAttributes,
      })

      const result = wrapper.getFeatureVariableBoolean('featureKey', 'variableKey')
      expect(result).toBe(true)
      expect(instance.getFeatureVariableBoolean).toHaveBeenCalledWith(
        'featureKey',
        'variableKey',
        userId,
        userAttributes,
      )
    })
  })

  describe('getFeatureVariableDouble', () => {
    it('should proxy without UserAttributes', () => {
      const userId = 'james'
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
      })

      const result = wrapper.getFeatureVariableDouble('featureKey', 'variableKey')
      expect(result).toBe(69)
      expect(instance.getFeatureVariableDouble).toHaveBeenCalledWith(
        'featureKey',
        'variableKey',
        userId,
        {},
      )
    })

    it('should proxy with UserAttributes', () => {
      const userId = 'james'
      const userAttributes = {
        plan: 'bronze',
      }
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
        userAttributes,
      })

      const result = wrapper.getFeatureVariableDouble('featureKey', 'variableKey')
      expect(result).toBe(69)
      expect(instance.getFeatureVariableDouble).toHaveBeenCalledWith(
        'featureKey',
        'variableKey',
        userId,
        userAttributes,
      )
    })
  })

  describe('getFeatureVariableInteger', () => {
    it('should proxy without UserAttributes', () => {
      const userId = 'james'
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
      })

      const result = wrapper.getFeatureVariableInteger('featureKey', 'variableKey')
      expect(result).toBe(42)
      expect(instance.getFeatureVariableInteger).toHaveBeenCalledWith(
        'featureKey',
        'variableKey',
        userId,
        {},
      )
    })

    it('should proxy with UserAttributes', () => {
      const userId = 'james'
      const userAttributes = {
        plan: 'bronze',
      }
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
        userAttributes,
      })

      const result = wrapper.getFeatureVariableInteger('featureKey', 'variableKey')
      expect(result).toBe(42)
      expect(instance.getFeatureVariableInteger).toHaveBeenCalledWith(
        'featureKey',
        'variableKey',
        userId,
        userAttributes,
      )
    })
  })

  describe('track', () => {
    it('should proxy without userAttributes', () => {
      const userId = 'james'
      const instance = new MockedOptimizelySDKWrapper()
      const wrapper = createUserWrapper({
        instance,
        userId,
      })

      wrapper.track('eventKey')
      expect(instance.track).toHaveBeenCalledWith('eventKey', userId, {}, undefined)
    })

    it('should proxy with userAttributes', () => {
      const userId = 'james'
      const instance = new MockedOptimizelySDKWrapper()
      const userAttributes = { plan: 'bronze' }
      const wrapper = createUserWrapper({
        instance,
        userId,
        userAttributes,
      })

      wrapper.track('eventKey')
      expect(instance.track).toHaveBeenCalledWith(
        'eventKey',
        userId,
        userAttributes,
        undefined,
      )
    })

    it('should proxy with userAttributes and eventTags', () => {
      const userId = 'james'
      const instance = new MockedOptimizelySDKWrapper()
      const userAttributes = { plan: 'bronze' }
      const eventTags = { value: 123 }
      const wrapper = createUserWrapper({
        instance,
        userId,
        userAttributes,
      })

      wrapper.track('eventKey', undefined, undefined, eventTags)
      expect(instance.track).toHaveBeenCalledWith(
        'eventKey',
        userId,
        userAttributes,
        eventTags,
      )
    })

    it('should proxy with overrided userId and userAttributes', () => {
      const userId = 'james'
      const instance = new MockedOptimizelySDKWrapper()
      const eventTags = { value: 123 }
      const wrapper = createUserWrapper({
        instance,
        userId,
      })

      wrapper.track('eventKey', 'otheruser', { foo: 'bar' })
      expect(instance.track).toHaveBeenCalledWith(
        'eventKey',
        'otheruser',
        { foo: 'bar' },
        undefined,
      )
    })

    it('should proxy with just eventTags in the 2nd argument', () => {
      const userId = 'james'
      const instance = new MockedOptimizelySDKWrapper()
      const eventTags = { value: 123 }
      const wrapper = createUserWrapper({
        instance,
        userId,
      })

      wrapper.track('eventKey', eventTags)
      expect(instance.track).toHaveBeenCalledWith('eventKey', userId, {}, eventTags)
    })
  })
})
