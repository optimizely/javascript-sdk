/// <reference path="../src/OptimizelySDK.d.ts" />
/// <reference types="mocha" />

import * as optimizelySDK from '@optimizely/optimizely-sdk'
import { OptimizelySDKWrapper, OptimizelySDKWrapperConfig } from '../src/OptimizelySDKWrapper'
import { assert } from 'chai'
import * as sinon from 'sinon'
import { datafile } from './testData'

function getControlledOutputSDKWrapper(config: OptimizelySDKWrapperConfig): OptimizelySDKWrapper {
  const controlledConfig = {
    ...config,
    eventDispatcher: {
      dispatchEvent() {
      },
    },
    logger: {
      log() {
      },
    },
  }
  return new OptimizelySDKWrapper(controlledConfig)
}

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
  const sandbox = sinon.createSandbox()
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
    it('should allow activate(expKey, overrideUserId)', function() {
      const testName = 'single_variation_abtest'
      const overrideUserId = 'override'
      const result = optimizely.activate(testName, overrideUserId)

      sandbox.assert.calledOnce(optimizely.instance.activate as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(optimizely.instance.activate as sinon.SinonSpy, testName, overrideUserId, undefined)
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
    it('should allow getVariation(expKey, overrideUserId)', function() {
      const testName = 'single_variation_abtest'
      const overrideUserId = 'override'
      const result = optimizely.getVariation(testName, overrideUserId)

      sandbox.assert.calledOnce(optimizely.instance.getVariation as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(optimizely.instance.getVariation as sinon.SinonSpy, testName, overrideUserId, undefined)
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


    it('should allow isFeatureEnabled(featureKey, overrideUserId)', function() {
      const overrideUserId = 'override'
      const result = optimizely.isFeatureEnabled(featureKey, overrideUserId)

      sandbox.assert.calledOnce(optimizely.instance.isFeatureEnabled as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(
        optimizely.instance.isFeatureEnabled as sinon.SinonSpy,
        featureKey,
        overrideUserId,
        undefined,
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
        undefined,
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
        undefined,
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
        undefined,
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
        undefined,
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
        undefined,
      )
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableString as sinon.SinonSpy,
        featureKey,
        'header',
        overrideUserId,
        undefined,
      )
      sandbox.assert.calledWithExactly(
        optimizely.instance.getFeatureVariableString as sinon.SinonSpy,
        featureKey,
        'content',
        overrideUserId,
        undefined,
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
    it('should allow getEnabledFeatures(overrideUserId)', function() {
      const overrideUserId = 'joe'
      const overrideAttributes = {
        plan_type: 'bronze',
      }
      const result = optimizely.getEnabledFeatures(overrideUserId)
      sandbox.assert.calledOnce(optimizely.instance.getEnabledFeatures as sinon.SinonSpy)
      sandbox.assert.calledWithExactly(optimizely.instance.getEnabledFeatures as sinon.SinonSpy, overrideUserId,undefined)
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

    it('should allow track(eventKey, overrideUserId)', function() {
      const overrideUserId = 'joe'
      const result = optimizely.track(eventKey, overrideUserId)
      sandbox.assert.calledOnce(optimizely.instance.track as sinon.SinonStub)
      sandbox.assert.calledWithExactly(
        optimizely.instance.track as sinon.SinonSpy,
        eventKey,
        overrideUserId,
        undefined,
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
  const sandbox = sinon.createSandbox()
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


  describe('when passing config to instantiation', function() {
    this.beforeEach(function() {
      sandbox.stub(optimizelySDK, 'createInstance')
    })

    this.afterEach(function() {
      (optimizelySDK.createInstance as sinon.SinonStub).restore()
    })

    it('should pass through instantiation options to the client', function() {
      const errorHandler = {}
      const eventDispatcher = {}
      const logger = {}
      const skipJSONValidation = true

      const optimizely: OptimizelySDKWrapper = new OptimizelySDKWrapper({
        datafile,
        errorHandler,
        eventDispatcher,
        logger,
        skipJSONValidation
      });

      sinon.assert.calledWith(optimizelySDK.createInstance as sinon.SinonStub, {
        datafile,
        errorHandler,
        eventDispatcher,
        logger,
        skipJSONValidation
      })
    })
  })


  describe('initializing a static Datafile with no userId', function() {
    it('instantiate successfully and be immediately initailized', function() {
      const optimizely = getControlledOutputSDKWrapper({
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
      const optimizely = getControlledOutputSDKWrapper({ datafile, userId })
      assert.isTrue(optimizely.isInitialized)
      assert.deepEqual(optimizely.datafile, datafile)
    })

    testPublicApi(userId, async function() {
      return getControlledOutputSDKWrapper({ datafile, userId })
    })
  })

  interface DatafileRequestStubs {
    restore: () => void
    requests: sinon.SinonFakeXMLHttpRequest[]
  }

  describe('initializing with `datafileUrl` and `userId`', function() {
    const userId = 'bob'

    const sdkKey = 'test'
    const datafileUrlHost = 'https://cdn.optimizely.com'
    const datafileUrlPath = `/datafiles/${sdkKey}.json`
    const datafileUrl = `${datafileUrlHost}${datafileUrlPath}`

    function setupDatafileRequestStubs(): DatafileRequestStubs {
      const xhr = sinon.useFakeXMLHttpRequest()
      const requests: sinon.SinonFakeXMLHttpRequest[] = []
      xhr.onCreate = (req) => requests.push(req)
      // Ignore localStorage caching
      // TODO: Tests for local storage caching
      // TODO: Why doesn't this work with the existing sandbox
      const localStorageStub = sinon.stub(window.localStorage, 'getItem').returns(null)
      return {
        requests,
        restore() {
          xhr.restore()
          localStorageStub.restore()
        }
      }
    }

    describe('when requesting datafile responds 200', function() {
      let datafileStubs: DatafileRequestStubs;
      this.beforeEach(function() {
        datafileStubs = setupDatafileRequestStubs();
      })

      this.afterEach(function() {
        datafileStubs.restore();
      })

      it('should wait for datafile loaded and invoke onReady()', async function() {
        const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
          sdkKey,
          userId,
        })
        assert.isFalse(optimizely.isInitialized)
        assert.equal(datafileStubs.requests.length, 1);
        datafileStubs.requests[0].respond(200, {}, JSON.stringify(datafile));
        await optimizely.onReady()
        assert.isTrue(optimizely.isInitialized)
      })

      describe('after the datafile has been loaded', function() {
        testPublicApi(userId, async function() {
          const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
            sdkKey,
            userId,
          })
          assert.equal(datafileStubs.requests.length, 1);
          datafileStubs.requests[0].respond(200, {}, JSON.stringify(datafile));
          await optimizely.onReady()
          return optimizely
        })
      })
    })

    describe('when requesting datafile responds 400', function() {
      let datafileStubs: DatafileRequestStubs;
      this.beforeEach(function() {
        datafileStubs = setupDatafileRequestStubs()
      })

      this.afterEach(function() {
        datafileStubs.restore();
      })

      it('should wait for datafile loaded and invoke onReady()', async function() {
        const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
          sdkKey,
          userId,
        })
        assert.isFalse(optimizely.isInitialized)
        assert.equal(datafileStubs.requests.length, 1)
        datafileStubs.requests[0].respond(400, {}, JSON.stringify(datafile))
        const result = await optimizely.onReady()
        assert.isFalse(result)
      })
    })

    describe('when requesting the datafile is delayed', function() {
      let datafileStubs: DatafileRequestStubs
      let responseTimeoutId: number
      this.beforeEach(function() {
        datafileStubs = setupDatafileRequestStubs()
        responseTimeoutId = window.setTimeout(() => {
          datafileStubs.requests[0].respond(200, {}, JSON.stringify(datafile))
        }, 50)
      })

      this.afterEach(function() {
        datafileStubs.restore();
        window.clearTimeout(responseTimeoutId);
      })

      it('should race the datafile loading with onReady({ timeout }) option', async function() {
        const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
          sdkKey,
          userId,
        })
        assert.isFalse(optimizely.isInitialized)
        await optimizely.onReady({ timeout: 10 })
        assert.isFalse(optimizely.isInitialized)
        await optimizely.onReady()
        assert.isTrue(optimizely.isInitialized)
      })

      it('should race the datafile loading with onReady({ timeout: 0 }) option', async function() {
        const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
          sdkKey,
          userId,
        })
        assert.isFalse(optimizely.isInitialized)
        await optimizely.onReady({ timeout: 0 })
        assert.isFalse(optimizely.isInitialized)
        await optimizely.onReady()
        assert.isTrue(optimizely.isInitialized)
      })

      it('should return the result of isInitialized in the promise when failing to load in time', function(done) {
        const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
          sdkKey,
          userId,
        })
        assert.isFalse(optimizely.isInitialized)
        optimizely.onReady({ timeout: 0 }).then(result => {
          assert.isFalse(result)
          done()
        })
      })

      it('should return the result of isInitialized in the promise when succeeding to load in time', function(done) {
        const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
          sdkKey,
          userId,
        })
        assert.isFalse(optimizely.isInitialized)
        optimizely.onReady({ timeout: 100 }).then(result => {
          assert.isTrue(result)
          done()
        })
      })

      it('should properly initialize if the datafile loads faster', async function() {
        const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
          sdkKey,
          userId,
        })
        assert.isFalse(optimizely.isInitialized)
        await optimizely.onReady({ timeout: 150 })
        assert.isTrue(optimizely.isInitialized)
      })


      describe("when the client isn't initialized", function() {
        const expKey = 'single_variation_test'
        const featureKey = 'feature1'
        it('activate/getVariation should return null', function() {
          const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
            sdkKey,
            userId,
          })

          assert.isFalse(optimizely.isInitialized)
          assert.isNull(optimizely.activate(expKey, userId))
          assert.isNull(optimizely.getVariation(expKey, userId))
        })

        it('isFeatureEnabled should return false', function() {
          const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
            sdkKey,
            userId,
          })

          assert.isFalse(optimizely.isInitialized)
          assert.isFalse(optimizely.isFeatureEnabled(featureKey, userId))
        })

        it('getFeatureVariables should return {}', function() {
          const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
            sdkKey,
            userId,
          })

          assert.isFalse(optimizely.isInitialized)
          assert.deepEqual({}, optimizely.getFeatureVariables(featureKey, userId))
        })

        it('getFeatureVariableX should return null', function() {
          const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
            sdkKey,
            userId,
          })

          assert.isFalse(optimizely.isInitialized)
          assert.isNull(optimizely.getFeatureVariableString('variable_test_feature', 'stringVar', userId))
          assert.isNull(optimizely.getFeatureVariableBoolean('variable_test_feature', 'booleanVar', userId))
          assert.isNull(optimizely.getFeatureVariableInteger('variable_test_feature', 'integerVar', userId))
          assert.isNull(optimizely.getFeatureVariableDouble('variable_test_feature', 'doubleVar', userId))
        })

        it('getEnabled features should return []', function() {
          const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
            sdkKey,
            userId,
          })

          assert.isFalse(optimizely.isInitialized)
          assert.deepEqual([], optimizely.getEnabledFeatures('jordan'))
        })

        it('should queue up track calls and flush them when initialized', async function() {
          const optimizely: OptimizelySDKWrapper = getControlledOutputSDKWrapper({
            sdkKey,
            userId,
          })


          optimizely.track('event1', 'jordan')
          optimizely.track('event2', 'jordan', {
            tag1: 'value1',
          })

          sandbox.stub(optimizely, 'track')

          await optimizely.onReady()

          sinon.assert.calledTwice(optimizely.track as sinon.SinonStub)
        })
      })
    })
  })

  describe('when passing invalid config', function() {
    describe('when not passing datafile, SDKUrl or UNSTABLE_datafileLoader', function() {
      it('should throw an error', function() {
        assert.throw(() => {
          const optimizely: OptimizelySDKWrapper = new OptimizelySDKWrapper()
        })
      })
    })
  })

  describe('passing in custom ResourceLoaders', function() {

  })
})
