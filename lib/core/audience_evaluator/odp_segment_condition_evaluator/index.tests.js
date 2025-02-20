/****************************************************************************
 * Copyright 2022, Optimizely, Inc. and contributors                   *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/
import sinon from 'sinon';
import { assert } from 'chai';
import { sprintf } from '../../../utils/fns';

import { LOG_LEVEL } from '../../../utils/enums';
import * as odpSegmentEvalutor from './';
import { UNKNOWN_MATCH_TYPE } from 'error_message';

var odpSegment1Condition = {
  "value": "odp-segment-1",
  "type": "third_party_dimension",
  "name": "odp.audiences",
  "match": "qualified"
};

var getMockUserContext = (attributes, segments) => ({
  getAttributes: () => ({ ... (attributes || {})}),
  isQualifiedFor: segment => segments.indexOf(segment) > -1
});

var createLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => createLogger(),
})

describe('lib/core/audience_evaluator/odp_segment_condition_evaluator', function() {
  const mockLogger = createLogger();
  const { evaluate } = odpSegmentEvalutor.getEvaluator(mockLogger);

  beforeEach(function() {
    sinon.stub(mockLogger, 'warn');
    sinon.stub(mockLogger, 'error');
  });

  afterEach(function() {
    mockLogger.warn.restore();
    mockLogger.error.restore();
  });

  it('should return true when segment qualifies and known match type is provided', () =>  {
    assert.isTrue(evaluate(odpSegment1Condition, getMockUserContext({}, ['odp-segment-1'])));
  });

  it('should return false when segment does not qualify and known match type is provided', () =>  {
    assert.isFalse(evaluate(odpSegment1Condition, getMockUserContext({}, ['odp-segment-2'])));
  })

  it('should return null when segment qualifies but unknown match type is provided', () =>  {
    const invalidOdpMatchCondition = {
      ... odpSegment1Condition,
      "match": 'unknown',
    };
    assert.isNull(evaluate(invalidOdpMatchCondition, getMockUserContext({}, ['odp-segment-1'])));
    sinon.assert.calledOnce(mockLogger.warn);
    assert.strictEqual(mockLogger.warn.args[0][0], UNKNOWN_MATCH_TYPE);
    assert.strictEqual(mockLogger.warn.args[0][1], JSON.stringify(invalidOdpMatchCondition));
  });
});
