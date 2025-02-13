/**
 * Copyright 2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { afterEach, describe, it, vi, expect } from 'vitest';
import * as odpSegmentEvalutor from '.';
import { UNKNOWN_MATCH_TYPE } from '../../../message/error_message';
import { IOptimizelyUserContext } from '../../../optimizely_user_context';
import { OptimizelyDecideOption, OptimizelyDecision } from '../../../shared_types';
import { getMockLogger } from '../../../tests/mock/mock_logger';

const odpSegment1Condition = {
  "value": "odp-segment-1",
  "type": "third_party_dimension",
  "name": "odp.audiences",
  "match": "qualified"
};

const getMockUserContext = (attributes?: unknown, segments?: string[]): IOptimizelyUserContext => ({
  getAttributes: () => ({ ...(attributes || {}) }),
  isQualifiedFor: segment => segments ? segments.indexOf(segment) > -1 : false,
  qualifiedSegments: segments || [],
  getUserId: () => 'mockUserId',
  setAttribute: (key: string, value: any) => {},

  decide: (key: string, options?: OptimizelyDecideOption[]): OptimizelyDecision => ({
    variationKey: 'mockVariationKey',
    enabled: true,
    variables: { mockVariable: 'mockValue' },
    ruleKey: 'mockRuleKey',
    reasons: ['mockReason'],
    flagKey: 'flagKey',
    userContext: getMockUserContext()
  }),
}) as IOptimizelyUserContext;


describe('lib/core/audience_evaluator/odp_segment_condition_evaluator', function() {
  const mockLogger = getMockLogger();
  const { evaluate } = odpSegmentEvalutor.getEvaluator(mockLogger);

  afterEach(function() {
    vi.restoreAllMocks();
  });

  it('should return true when segment qualifies and known match type is provided', () =>  {
    expect(evaluate(odpSegment1Condition, getMockUserContext({}, ['odp-segment-1']))).toBe(true);
  });

  it('should return false when segment does not qualify and known match type is provided', () =>  {
    expect(evaluate(odpSegment1Condition, getMockUserContext({}, ['odp-segment-2']))).toBe(false);
  })

  it('should return null when segment qualifies but unknown match type is provided', () =>  {
    const invalidOdpMatchCondition = {
      ... odpSegment1Condition,
      "match": 'unknown',
    };
    expect(evaluate(invalidOdpMatchCondition, getMockUserContext({}, ['odp-segment-1']))).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(UNKNOWN_MATCH_TYPE, JSON.stringify(invalidOdpMatchCondition));
  });
});
