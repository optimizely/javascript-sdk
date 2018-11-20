/// <reference path="../src/OptimizelySDK.d.ts" />

import { OptimizelySDKWrapper } from '../src/OptimizelySDKWrapper'
import { assert } from 'chai'
import * as sinon from 'sinon'
import { datafile } from './testData'

describe('OptimizelySDKWrapper blackbox tests', function() {
  var sandbox = sinon.sandbox.create()

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
    let optimizely: OptimizelySDKWrapper
    let userId = 'bob'

    beforeEach(function() {
      optimizely = new OptimizelySDKWrapper({
        datafile,
        userId,
      })
      sandbox.spy(optimizely.instance, 'activate')
      sandbox.spy(optimizely.instance, 'getVariation')
      sandbox.spy(optimizely.instance, 'isFeatureEnabled')
      sandbox.spy(optimizely.instance, 'getFeatureVariableString')
      sandbox.spy(optimizely.instance, 'getEnabledFeatures')
      sandbox.spy(optimizely.instance, 'getForcedVariation')
      sandbox.spy(optimizely.instance, 'setForcedVariation')

      sandbox.stub(optimizely.instance, 'track')
    })

    it('instantiate successfully and be immediately initailized', function() {
      assert.isTrue(optimizely.isInitialized)
      assert.deepEqual(optimizely.datafile, datafile)
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
        sandbox.assert.calledWithExactly(
          optimizely.instance.getVariation as sinon.SinonSpy,
          testName,
          overrideUserId,
          {},
        )
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
        assert.deepEqual(result, ['feature1'])
      })

      it('should allow getEnabledFeatures(overrideUserId)', function() {
        const overrideUserId = 'joe'
        const overrideAttributes = {
          plan_type: 'bronze',
        }
        const result = optimizely.getEnabledFeatures(overrideUserId)
        sandbox.assert.calledOnce(optimizely.instance.getEnabledFeatures as sinon.SinonSpy)
        sandbox.assert.calledWithExactly(optimizely.instance.getEnabledFeatures as sinon.SinonSpy, overrideUserId, {})
        assert.deepEqual(result, ['feature1'])
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
        assert.deepEqual(result, ['feature1'])
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
        sandbox.assert.calledWithExactly(
          optimizely.instance.getForcedVariation as sinon.SinonSpy,
          experimentKey,
          userId,
        )

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
  })
})
