/**
 * Copyright 2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, it, expect  } from 'vitest';
import { rolloutDecisionObj, featureTestDecisionObj } from '../../tests/test_data';
import * as decision from './';

describe('getExperimentKey method', () => {
  it('should return empty string when experiment is null', () => {
    const experimentKey = decision.getExperimentKey(rolloutDecisionObj);

    expect(experimentKey).toEqual('');
  });

  it('should return empty string when experiment is not defined', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const experimentKey = decision.getExperimentKey({});

    expect(experimentKey).toEqual('');
  });

  it('should return experiment key when experiment is defined', () => {
    const experimentKey = decision.getExperimentKey(featureTestDecisionObj);

    expect(experimentKey).toEqual('testing_my_feature');
  });
});

describe('getExperimentId method', () => {
  it('should return null when experiment is null', () => {
    const experimentId = decision.getExperimentId(rolloutDecisionObj);

    expect(experimentId).toEqual(null);
  });

  it('should return null when experiment is not defined', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const experimentId = decision.getExperimentId({});

    expect(experimentId).toEqual(null);
  });

  it('should return experiment id when experiment is defined', () => {
    const experimentId = decision.getExperimentId(featureTestDecisionObj);

    expect(experimentId).toEqual('594098');
  });

  describe('getVariationKey method', ()=> {
    it('should return empty string when variation is null', () => {
      const variationKey = decision.getVariationKey(rolloutDecisionObj);

      expect(variationKey).toEqual('');
    });

    it('should return empty string when variation is not defined', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const variationKey = decision.getVariationKey({});

      expect(variationKey).toEqual('');
    });

    it('should return variation key when variation is defined', () => {
      const variationKey = decision.getVariationKey(featureTestDecisionObj);

      expect(variationKey).toEqual('variation');
    });
  });

  describe('getVariationId method', () => {
    it('should return null when variation is null', () => {
      const variationId = decision.getVariationId(rolloutDecisionObj);

      expect(variationId).toEqual(null);
    });

    it('should return null when variation is not defined', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const variationId = decision.getVariationId({});

      expect(variationId).toEqual(null);
    });

    it('should return variation id when variation is defined', () => {
      const variationId = decision.getVariationId(featureTestDecisionObj);

      expect(variationId).toEqual('594096');
    });
  });

  describe('getFeatureEnabledFromVariation method', () => {
    it('should return false when variation is null', () => {
      const featureEnabled = decision.getFeatureEnabledFromVariation(rolloutDecisionObj);

      expect(featureEnabled).toEqual(false);
    });

    it('should return false when variation is not defined', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const featureEnabled = decision.getFeatureEnabledFromVariation({});

      expect(featureEnabled).toEqual(false);
    });

    it('should return featureEnabled boolean when variation is defined', () => {
      const featureEnabled = decision.getFeatureEnabledFromVariation(featureTestDecisionObj);

      expect(featureEnabled).toEqual(true);
    });
  });
});
