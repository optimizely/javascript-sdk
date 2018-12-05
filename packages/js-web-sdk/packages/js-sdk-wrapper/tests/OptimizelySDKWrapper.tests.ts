/// <reference path="../src/OptimizelySDK.d.ts" />

import { OptimizelySDKWrapper, OptimizelySDKWrapperConfig } from '../src/OptimizelySDKWrapper'
import { assert } from 'chai'
import * as sinon from 'sinon'
import * as nock from 'nock'
import { datafile } from './testData'

/**
 * DRY function to test the public OptimizelySDKWrapper API, this is to ensure parity with existing
 * OptimizelySDK API, and to test different method signatures (where userId and attributes are provided)
 *
 * The `createOptimizelyFn` always expects an already initialized instance of OptimizelySDKWrapper
 *
 * The `createOptimizelyFn` is an async / promise-returning function since we need to do
 * `await optimizely.onReady()` before we can do testing.
 *
 * @param {string} userId
 * @param {() => Promise<OptimizelySDKWrapper>} createOptimizelyFn
 */
function testPublicApi(userId: string, createOptimizelyFn: () => Promise<OptimizelySDKWrapper>): void {
  let optimizely: OptimizelySDKWrapper
  const sandbox = sinon.sandbox.create()
  afterEach(function() {
    sandbox.reset()
  })

  beforeEach(async function() {
    optimizely = await createOptimizelyFn()
    sandbox.spy(optimizely.instance, 'activate')
    sandbox.spy(optimizely.instance, 'getVariation')
    sandbox.spy(optimizely.instance, 'isFeatureEnabled')
    sandbox.spy(optimizely.instance, 'getFeatureVariableString')
    sandbox.spy(optimizely.instance, 'getFeatureVariableDouble')
    sandbox.spy(optimizely.instance, 'getFeatureVariableInteger')
    sandbox.spy(optimizely.instance, 'getFeatureVariableBoolean')
    sandbox.spy(optimizely.instance, 'getEnabledFeatures')
    sandbox.spy(optimizely.instance, 'getForcedVariation')
    sandbox.spy(optimizely.instance, 'setForcedVariation')

    sandbox.stub(optimizely.instance, 'track')
  })

  describe('activate', function() {
    it('should allow activate(expKey)', function() {
      const testName = 'single_variation_abtest'
      const result = optimizely.activate(testName)

      sandbox.assert.calledOnce(optimizely.instance.activate as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(optimizely.instance.activate as sinon.SinonSpy, testName, userId, {})
      assert.equal(result, 'var1')
    })

    it('should allow activate(expKey, overrideUserId)', function() {
      const testName = 'single_variation_abtest'
      const overrideUserId = 'override'
      const result = optimizely.activate(testName, overrideUserId)

      sandbox.assert.calledOnce(optimizely.instance.activate as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(optimizely.instance.activate as sinon.SinonSpy, testName, overrideUserId, {})
      assert.equal(result, 'var1')
    })

    it('should allow activate(expKey, overrideUserId, overrideAttributes)', function() {
      const testName = 'single_variation_abtest'
      const overrideUserId = 'override'
      const overrideAttributes = {
        plan_type: 'bronze',
      }
      const result = optimizely.activate(testName, overrideUserId, overrideAttributes)

      sandbox.assert.calledOnce(optimizely.instance.activate as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.activate as sinon.SinonSpy,
        testName,
        overrideUserId,
        overrideAttributes,
      )
      assert.equal(result, 'var1')
    })
  })

  describe('getVariation', function() {
    it('should allow getVariation(expKey)', function() {
      const testName = 'single_variation_abtest'
      const result = optimizely.getVariation(testName)

      sandbox.assert.calledOnce(optimizely.instance.getVariation as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(optimizely.instance.getVariation as sinon.SinonSpy, testName, userId, {})
      assert.equal(result, 'var1')
    })

    it('should allow getVariation(expKey, overrideUserId)', function() {
      const testName = 'single_variation_abtest'
      const overrideUserId = 'override'
      const result = optimizely.getVariation(testName, overrideUserId)

      sandbox.assert.calledOnce(optimizely.instance.getVariation as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(optimizely.instance.getVariation as sinon.SinonSpy, testName, overrideUserId, {})
      assert.equal(result, 'var1')
    })

    it('should allow getVariation(expKey, overrideUserId, overrideAttributes)', function() {
      const testName = 'single_variation_abtest'
      const overrideUserId = 'override'
      const overrideAttributes = {
        plan_type: 'bronze',
      }
      const result = optimizely.getVariation(testName, overrideUserId, overrideAttributes)

      sandbox.assert.calledOnce(optimizely.instance.getVariation as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getVariation as sinon.SinonSpy,
        testName,
        overrideUserId,
        overrideAttributes,
      )
      assert.equal(result, 'var1')
    })
  })

  describe('isFeatureEnabled', function() {
    const featureKey = 'feature1'

    it('should allow isFeatureEnabled(featureKey)', function() {
      const result = optimizely.isFeatureEnabled(featureKey)

      sandbox.assert.calledOnce(optimizely.instance.isFeatureEnabled as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(optimizely.instance.isFeatureEnabled as sinon.SinonSpy, featureKey, userId, {})
      assert.equal(result, true)
    })

    it('should allow isFeatureEnabled(featureKey, overrideUserId)', function() {
      const overrideUserId = 'override'
      const result = optimizely.isFeatureEnabled(featureKey, overrideUserId)

      sandbox.assert.calledOnce(optimizely.instance.isFeatureEnabled as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.isFeatureEnabled as sinon.SinonSpy,
        featureKey,
        overrideUserId,
        {},
      )
      assert.equal(result, true)
    })

    it('should allow isFeatureEnabled(featureKey, overrideUserId, overrideAttributes)', function() {
      const overrideUserId = 'override'
      const overrideAttributes = { plan_type: 'bronze' }
      const result = optimizely.isFeatureEnabled(featureKey, overrideUserId, overrideAttributes)

      sandbox.assert.calledOnce(optimizely.instance.isFeatureEnabled as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.isFeatureEnabled as sinon.SinonSpy,
        featureKey,
        overrideUserId,
        overrideAttributes,
      )
      assert.equal(result, true)
    })
  })
  describe('getFeatureVariableString', function() {
    const featureKey = 'variable_test_feature'
    const variableKey = 'stringVar'
    const expected = 'value'

    it('should allow getFeatureVariableString(featureKey, variableKey)', function() {
      const result = optimizely.getFeatureVariableString(featureKey, variableKey)
      assert.equal(result, expected)
    })

    it('should allow getFeatureVariableString(featureKey, variableKey, overrideUserId)', function() {
      const overrideUserId = 'jon'
      const result = optimizely.getFeatureVariableString(featureKey, 'stringVar', overrideUserId)
      assert.equal(result, expected)

      sandbox.assert.calledOnce(optimizely.instance.getFeatureVariableString as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableString as sinon.SinonSpy,
        featureKey,
        variableKey,
        overrideUserId,
        {},
      )
    })

    it('should allow getFeatureVariableString(featureKey, variableKey, overrideUserId, overrideAttributes)', function() {
      const overrideUserId = 'jon'
      const overrideAttributes = {
        foo: 'bar',
      }
      const result = optimizely.getFeatureVariableString(featureKey, 'stringVar', overrideUserId, overrideAttributes)
      assert.equal(result, expected)

      sandbox.assert.calledOnce(optimizely.instance.getFeatureVariableString as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableString as sinon.SinonSpy,
        featureKey,
        variableKey,
        overrideUserId,
        overrideAttributes,
      )
    })
  })

  describe('getFeatureVariableBoolean', function() {
    const featureKey = 'variable_test_feature'
    const variableKey = 'booleanVar'
    const expected = true

    it('should allow getFeatureVariableBoolean(featureKey, variableKey)', function() {
      const result = optimizely.getFeatureVariableBoolean(featureKey, variableKey)
      assert.equal(result, expected)
    })

    it('should allow getFeatureVariableBoolean(featureKey, variableKey, overrideUserId)', function() {
      const overrideUserId = 'jon'
      const result = optimizely.getFeatureVariableBoolean(featureKey, variableKey, overrideUserId)
      assert.equal(result, expected)

      sandbox.assert.calledOnce(optimizely.instance.getFeatureVariableBoolean as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableBoolean as sinon.SinonSpy,
        featureKey,
        variableKey,
        overrideUserId,
        {},
      )
    })

    it('should allow getFeatureVariableBoolean(featureKey, variableKey, overrideUserId, overrideAttributes)', function() {
      const overrideUserId = 'jon'
      const overrideAttributes = {
        foo: 'bar',
      }
      const result = optimizely.getFeatureVariableBoolean(featureKey, variableKey, overrideUserId, overrideAttributes)
      assert.equal(result, expected)

      sandbox.assert.calledOnce(optimizely.instance.getFeatureVariableBoolean as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableBoolean as sinon.SinonSpy,
        featureKey,
        variableKey,
        overrideUserId,
        overrideAttributes,
      )
    })
  })

  describe('getFeatureVariableInteger', function() {
    const featureKey = 'variable_test_feature'
    const variableKey = 'integerVar'
    const expected = 10

    it('should allow getFeatureVariableInteger(featureKey, variableKey)', function() {
      const result = optimizely.getFeatureVariableInteger(featureKey, variableKey)
      assert.equal(result, expected)
    })

    it('should allow getFeatureVariableInteger(featureKey, variableKey, overrideUserId)', function() {
      const overrideUserId = 'jon'
      const result = optimizely.getFeatureVariableInteger(featureKey, variableKey, overrideUserId)
      assert.equal(result, expected)

      sandbox.assert.calledOnce(optimizely.instance.getFeatureVariableInteger as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableInteger as sinon.SinonSpy,
        featureKey,
        variableKey,
        overrideUserId,
        {},
      )
    })

    it('should allow getFeatureVariableInteger(featureKey, variableKey, overrideUserId, overrideAttributes)', function() {
      const overrideUserId = 'jon'
      const overrideAttributes = {
        foo: 'bar',
      }
      const result = optimizely.getFeatureVariableInteger(featureKey, variableKey, overrideUserId, overrideAttributes)
      assert.equal(result, expected)

      sandbox.assert.calledOnce(optimizely.instance.getFeatureVariableInteger as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableInteger as sinon.SinonSpy,
        featureKey,
        variableKey,
        overrideUserId,
        overrideAttributes,
      )
    })
  })

  describe('getFeatureVariableDouble', function() {
    const featureKey = 'variable_test_feature'
    const variableKey = 'doubleVar'
    const expected = 20

    it('should allow getFeatureVariableDouble(featureKey, variableKey)', function() {
      const result = optimizely.getFeatureVariableDouble(featureKey, variableKey)
      assert.equal(result, expected)
    })

    it('should allow getFeatureVariableDouble(featureKey, variableKey, overrideUserId)', function() {
      const overrideUserId = 'jon'
      const result = optimizely.getFeatureVariableDouble(featureKey, variableKey, overrideUserId)
      assert.equal(result, expected)

      sandbox.assert.calledOnce(optimizely.instance.getFeatureVariableDouble as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableDouble as sinon.SinonSpy,
        featureKey,
        variableKey,
        overrideUserId,
        {},
      )
    })

    it('should allow getFeatureVariableDouble(featureKey, variableKey, overrideUserId, overrideAttributes)', function() {
      const overrideUserId = 'jon'
      const overrideAttributes = {
        foo: 'bar',
      }
      const result = optimizely.getFeatureVariableDouble(featureKey, variableKey, overrideUserId, overrideAttributes)
      assert.equal(result, expected)

      sandbox.assert.calledOnce(optimizely.instance.getFeatureVariableDouble as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableDouble as sinon.SinonSpy,
        featureKey,
        variableKey,
        overrideUserId,
        overrideAttributes,
      )
    })
  })

  describe('getFeatureVariables', function() {
    const featureKey = 'feature1'

    it('should allow getFeatureVariables(featureKey)', function() {
      const result = optimizely.getFeatureVariables(featureKey)
      const expectedVariables = {
        content: 'content 1',
        header: 'Hi Jess!',
        variation: 'jess',
      }

      sandbox.assert.calledThrice(optimizely.instance.getFeatureVariableString as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableString as sinon.SinonSpy,
        featureKey,
        'variation',
        userId,
        {},
      )
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableString as sinon.SinonSpy,
        featureKey,
        'header',
        userId,
        {},
      )
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableString as sinon.SinonSpy,
        featureKey,
        'content',
        userId,
        {},
      )
      assert.deepEqual(result, expectedVariables)
    })

    it('should allow getFeatureVariables(featureKey, overrideUserId)', function() {
      const overrideUserId = 'override'
      const result = optimizely.getFeatureVariables(featureKey, overrideUserId)
      const expectedVariables = {
        content: 'content 2',
        header: 'Hi Jordan',
        variation: 'jordan',
      }

      sandbox.assert.calledThrice(optimizely.instance.getFeatureVariableString as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableString as sinon.SinonSpy,
        featureKey,
        'variation',
        overrideUserId,
        {},
      )
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableString as sinon.SinonSpy,
        featureKey,
        'header',
        overrideUserId,
        {},
      )
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableString as sinon.SinonSpy,
        featureKey,
        'content',
        overrideUserId,
        {},
      )
      assert.deepEqual(result, expectedVariables)
    })

    it('should allow getFeatureVariables(featureKey, overrideUserId, overrideAttributes)', function() {
      const overrideUserId = 'override'
      const overrideAttributes = {
        plan_type: 'bronze',
      }
      const result = optimizely.getFeatureVariables(featureKey, overrideUserId, overrideAttributes)
      const expectedVariables = {
        content: 'content 2',
        header: 'Hi Jordan',
        variation: 'jordan',
      }

      sandbox.assert.calledThrice(optimizely.instance.getFeatureVariableString as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableString as sinon.SinonSpy,
        featureKey,
        'variation',
        overrideUserId,
        overrideAttributes,
      )
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableString as sinon.SinonSpy,
        featureKey,
        'header',
        overrideUserId,
        overrideAttributes,
      )
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableString as sinon.SinonSpy,
        featureKey,
        'content',
        overrideUserId,
        overrideAttributes,
      )
      assert.deepEqual(result, expectedVariables)
    })
  })

  describe('getEnabledFeatures', function() {
    it('should allow getEnabledFeatures()', function() {
      const result = optimizely.getEnabledFeatures()
      sandbox.assert.calledOnce(optimizely.instance.getEnabledFeatures as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(optimizely.instance.getEnabledFeatures as sinon.SinonSpy, userId, {})
      assert.deepEqual(result, ['feature1', 'variable_test_feature'])
    })

    it('should allow getEnabledFeatures(overrideUserId)', function() {
      const overrideUserId = 'joe'
      const overrideAttributes = {
        plan_type: 'bronze',
      }
      const result = optimizely.getEnabledFeatures(overrideUserId)
      sandbox.assert.calledOnce(optimizely.instance.getEnabledFeatures as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(optimizely.instance.getEnabledFeatures as sinon.SinonSpy, overrideUserId, {})
      assert.deepEqual(result, ['feature1', 'variable_test_feature'])
    })

    it('should allow getEnabledFeatures(overrideUserId, overrideAttributes)', function() {
      const overrideUserId = 'joe'
      const overrideAttributes = { plan_type: 'bronze' }
      const result = optimizely.getEnabledFeatures(overrideUserId, overrideAttributes)
      sandbox.assert.calledOnce(optimizely.instance.getEnabledFeatures as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getEnabledFeatures as sinon.SinonSpy,
        overrideUserId,
        overrideAttributes,
      )
      assert.deepEqual(result, ['feature1', 'variable_test_feature'])
    })
  })

  describe('track', function() {
    const eventKey = 'event1'

    it('should allow track(eventKey)', function() {
      optimizely.track(eventKey)
      sandbox.assert.calledOnce(optimizely.instance.track as sinon.SinonStub)
      sandbox.assert.calledWithExactly(optimizely.instance.track as sinon.SinonSpy, eventKey, userId, {}, undefined)
    })

    it('should allow track(eventKey, eventTags)', function() {
      const eventTags = { revenue: 1 }
      optimizely.track(eventKey, eventTags)
      sandbox.assert.calledOnce(optimizely.instance.track as sinon.SinonStub)
      sandbox.assert.calledWithExactly(optimizely.instance.track as sinon.SinonSpy, eventKey, userId, {}, eventTags)
    })

    it('should allow track(eventKey, overrideUserId)', function() {
      const overrideUserId = 'joe'
      const result = optimizely.track(eventKey, overrideUserId)
      sandbox.assert.calledOnce(optimizely.instance.track as sinon.SinonStub)
      sandbox.assert.calledWithExactly(
        optimizely.instance.track as sinon.SinonSpy,
        eventKey,
        overrideUserId,
        {},
        undefined,
      )
    })

    it('should allow track(eventKey, overrideUserId, overrideAttributes)', function() {
      const overrideUserId = 'joe'
      const overrideAttributes = {
        plan_type: 'bronze',
      }
      optimizely.track(eventKey, overrideUserId, overrideAttributes)
      sandbox.assert.calledOnce(optimizely.instance.track as sinon.SinonStub)
      sandbox.assert.calledWithExactly(
        optimizely.instance.track as sinon.SinonSpy,
        eventKey,
        overrideUserId,
        overrideAttributes,
        undefined,
      )
    })

    it('should allow track(eventKey, overrideUserId, overrideAttributes, eventTags)', function() {
      const overrideUserId = 'joe'
      const overrideAttributes = {
        plan_type: 'bronze',
      }
      const eventTags = { revenue: 1 }
      optimizely.track(eventKey, overrideUserId, overrideAttributes, eventTags)
      sandbox.assert.calledOnce(optimizely.instance.track as sinon.SinonStub)
      sandbox.assert.calledWithExactly(
        optimizely.instance.track as sinon.SinonSpy,
        eventKey,
        overrideUserId,
        overrideAttributes,
        eventTags,
      )
    })
  })

  describe('getForcedVariation', function() {
    const experimentKey = 'abtest1'
    it('should allow getForcedVariation(experimentKey)', function() {
      const result = optimizely.getForcedVariation(experimentKey)
      sandbox.assert.calledOnce(optimizely.instance.getForcedVariation as sinon.SinonStub)
      sandbox.assert.calledWithExactly(optimizely.instance.getForcedVariation as sinon.SinonSpy, experimentKey, userId)

      assert.equal(result, null)
    })

    it('should allow getForcedVariation(experimentKey, overrideUserId)', function() {
      const overrideUserId = 'joe'
      const result = optimizely.getForcedVariation(experimentKey, overrideUserId)
      sandbox.assert.calledOnce(optimizely.instance.getForcedVariation as sinon.SinonStub)
      sandbox.assert.calledWithExactly(
        optimizely.instance.getForcedVariation as sinon.SinonSpy,
        experimentKey,
        overrideUserId,
      )

      assert.equal(result, null)
    })
  })

  describe('setForcedVariation', function() {
    const experimentKey = 'abtest1'
    const variationKey = 'var1'

    it('should allow setForcedVariation(experimentKey, variationKey)', function() {
      const result = optimizely.setForcedVariation(experimentKey, variationKey)
      sandbox.assert.calledOnce(optimizely.instance.setForcedVariation as sinon.SinonStub)
      sandbox.assert.calledWithExactly(
        optimizely.instance.setForcedVariation as sinon.SinonSpy,
        experimentKey,
        userId,
        variationKey,
      )

      assert.equal(result, true)

      const getForcedVariationResult = optimizely.getForcedVariation(experimentKey)
      assert.equal(getForcedVariationResult, variationKey)
    })

    it('should allow setForcedVariation(experimentKey, overrideUserId, variationKey)', function() {
      const overrideUserId = 'joe'
      const result = optimizely.setForcedVariation(experimentKey, overrideUserId, variationKey)
      sandbox.assert.calledOnce(optimizely.instance.setForcedVariation as sinon.SinonStub)
      sandbox.assert.calledWithExactly(
        optimizely.instance.setForcedVariation as sinon.SinonSpy,
        experimentKey,
        overrideUserId,
        variationKey,
      )

      assert.equal(result, true)

      const getForcedVariationResult = optimizely.getForcedVariation(experimentKey, overrideUserId)
      assert.equal(getForcedVariationResult, variationKey)
    })
  })
}

describe('OptimizelySDKWrapper blackbox tests', function() {
  const sandbox = sinon.sandbox.create()
  this.afterEach(function() {
    sandbox.reset()
  })

  const stubOptimizelyInstance = (optimizely: OptimizelySDKWrapper): void => {
    sandbox.spy(optimizely.instance, 'activate')
    sandbox.spy(optimizely.instance, 'getVariation')
    sandbox.spy(optimizely.instance, 'isFeatureEnabled')
    sandbox.spy(optimizely.instance, 'getFeatureVariableString')
    sandbox.spy(optimizely.instance, 'getEnabledFeatures')
    sandbox.spy(optimizely.instance, 'getForcedVariation')
    sandbox.spy(optimizely.instance, 'setForcedVariation')

    sandbox.stub(optimizely.instance, 'track')
  }

  describe('initializing a static Datafile with no userId', function() {
    it('instantiate successfully and be immediately initailized', function() {
      const optimizely = new OptimizelySDKWrapper({
        datafile,
      })
      assert.isTrue(optimizely.isInitialized)
      assert.deepEqual(optimizely.datafile, datafile)

      const result = optimizely.activate('single_variation_abtest', 'user1')
      assert.equal(result, 'var1')
    })
  })

  describe('initializing a static Datafile and userId', function() {
    const userId = 'bob'

    it('instantiate successfully and be immediately initailized', function() {
      const optimizely = new OptimizelySDKWrapper({ datafile, userId })
      assert.isTrue(optimizely.isInitialized)
      assert.deepEqual(optimizely.datafile, datafile)
    })

    testPublicApi(userId, async function() {
      return new OptimizelySDKWrapper({ datafile, userId })
    })
  })

  describe('initializing with `datafileUrl` and `userId`', function() {
    const userId = 'bob'

    const datafileUrlHost = 'https://cdn.optimizely.com'
    const datafileUrlPath = '/datafiles/test.json'
    const datafileUrl = `${datafileUrlHost}${datafileUrlPath}`

    describe('when requesting datafile responds 200', function() {
      this.beforeEach(function() {
        nock(datafileUrlHost)
          .get(datafileUrlPath)
          .reply(200, datafile)
      })

      it('should wait for datafile loaded and invoke onReady()', async function() {
        const optimizely: OptimizelySDKWrapper = new OptimizelySDKWrapper({
          datafileUrl,
          userId,
        })
        assert.isFalse(optimizely.isInitialized)
        await optimizely.onReady()
        assert.isTrue(optimizely.isInitialized)
      })

      describe('after the datafile has been loaded', function() {
        testPublicApi(userId, async function() {
          const optimizely: OptimizelySDKWrapper = new OptimizelySDKWrapper({
            datafileUrl,
            userId,
          })
          await optimizely.onReady()
          return optimizely
        })
      })
    })

    describe('when requesting datafile responds 400', function() {
      this.beforeEach(function() {
        nock(datafileUrlHost)
          .get(datafileUrlPath)
          .reply(400, datafile)
      })

      it('should wait for datafile loaded and invoke onReady()', async function() {
        const optimizely: OptimizelySDKWrapper = new OptimizelySDKWrapper({
          datafileUrl,
          userId,
        })
        assert.isFalse(optimizely.isInitialized)
        const result = await optimizely.onReady()
        assert.isFalse(result)
      })
    })

    describe('when requesting the datafile is delayed', function() {
      this.beforeEach(function() {
        nock(datafileUrlHost)
          .get(datafileUrlPath)
          .delay(100)
          .reply(200, datafile)
      })

      it('should race the datafile loading with onReady({ timeout }) option', async function() {
        const optimizely: OptimizelySDKWrapper = new OptimizelySDKWrapper({
          datafileUrl,
          userId,
        })
        assert.isFalse(optimizely.isInitialized)
        await optimizely.onReady({ timeout: 50 })
        assert.isFalse(optimizely.isInitialized)
        await optimizely.onReady()
        assert.isTrue(optimizely.isInitialized)
      })
    })
  })
})
