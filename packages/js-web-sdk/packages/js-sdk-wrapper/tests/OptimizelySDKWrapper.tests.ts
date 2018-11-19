/// <reference path="../src/OptimizelySDK.d.ts" />

import { OptimizelySDKWrapper } from '../src/OptimizelySDKWrapper'
import { assert } from 'chai'
import * as sinon from 'sinon'
import { datafile } from './testData'

describe('OptimizelySDKWrapper blackbox tests', function() {
  var sandbox = sinon.sandbox.create()

  describe('instantiation options', function() {
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
        sandbox.spy(optimizely.instance, 'isFeatureEnabled')
        sandbox.spy(optimizely.instance, 'getFeatureVariableString')
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

      describe('isFeatureEnabled', function() {
        const featureKey = 'feature1'

        it('should allow isFeatureEnabled(featureKey)', function() {
          const result = optimizely.isFeatureEnabled(featureKey)

          sandbox.assert.calledOnce(optimizely.instance.isFeatureEnabled as sinon.SinonSpy)
          sandbox.assert.calledWithExactly(
            optimizely.instance.isFeatureEnabled as sinon.SinonSpy,
            featureKey,
            userId,
            {},
          )
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
    })
  })
})
