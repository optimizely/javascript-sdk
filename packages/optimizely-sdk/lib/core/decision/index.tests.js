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
import { assert } from 'chai';
import { rolloutDecisionObj, featureTestDecisionObj } from '../../tests/test_data';
import * as decision from './';

describe('lib/core/decision', function() {
  describe('getExperimentKey method', function() {
    it('should return empty string when experiment is null', function() {
      var experimentKey = decision.getExperimentKey(rolloutDecisionObj);
      assert.strictEqual(experimentKey, '');
    });

    it('should return empty string when experiment is not defined', function() {
      var experimentKey = decision.getExperimentKey({});
      assert.strictEqual(experimentKey, '');
    });

    it('should return experiment key when experiment is defined', function() {
      var experimentKey = decision.getExperimentKey(featureTestDecisionObj);
      assert.strictEqual(experimentKey, 'testing_my_feature');
    });
  });

  describe('getExperimentId method', function() {
    it('should return null when experiment is null', function() {
      var experimentId = decision.getExperimentId(rolloutDecisionObj);
      assert.strictEqual(experimentId, null);
    });

    it('should return null when experiment is not defined', function() {
      var experimentId = decision.getExperimentId({});
      assert.strictEqual(experimentId, null);
    });

    it('should return experiment id when experiment is defined', function() {
      var experimentId = decision.getExperimentId(featureTestDecisionObj);
      assert.strictEqual(experimentId, '594098');
    });
  });

  describe('getVariationKey method', function() {
    it('should return empty string when variation is null', function() {
      var variationKey = decision.getVariationKey(rolloutDecisionObj);
      assert.strictEqual(variationKey, '');
    });

    it('should return empty string when variation is not defined', function() {
      var variationKey = decision.getVariationKey({});
      assert.strictEqual(variationKey, '');
    });

    it('should return variation key when variation is defined', function() {
      var variationKey = decision.getVariationKey(featureTestDecisionObj);
      assert.strictEqual(variationKey, 'variation');
    });
  });

  describe('getFeatureEnabledFromVariation method', function() {
    it('should return false when variation is null', function() {
      var featureEnabled = decision.getFeatureEnabledFromVariation(rolloutDecisionObj);
      assert.strictEqual(featureEnabled, false);
    });

    it('should return false when variation is not defined', function() {
      var featureEnabled = decision.getFeatureEnabledFromVariation({});
      assert.strictEqual(featureEnabled, false);
    });

    it('should return featureEnabled boolean when variation is defined', function() {
      var featureEnabled = decision.getFeatureEnabledFromVariation(featureTestDecisionObj);
      assert.strictEqual(featureEnabled, true);
    });
  }); 
})
