/**
 * Copyright 2016, 2018-2020, 2022, Optimizely
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
import sinon from 'sinon';
import { assert } from 'chai';
import { sprintf } from '../../utils/fns';
import { getLogger } from '../../modules/logging';

import AudienceEvaluator, { createAudienceEvaluator } from './index';
import * as conditionTreeEvaluator from '../condition_tree_evaluator';
import * as customAttributeConditionEvaluator from '../custom_attribute_condition_evaluator';

var buildLogMessageFromArgs = args => sprintf(args[1], ...args.splice(2));
var mockLogger = getLogger();

var getMockUserContext = (attributes, segments) => ({
  getAttributes: () => ({ ... (attributes || {})}),
  isQualifiedFor: segment => segments.indexOf(segment) > -1
});

var chromeUserAudience = {
  conditions: [
    'and',
    {
      name: 'browser_type',
      value: 'chrome',
      type: 'custom_attribute',
    },
  ],
};
var iphoneUserAudience = {
  conditions: [
    'and',
    {
      name: 'device_model',
      value: 'iphone',
      type: 'custom_attribute',
    },
  ],
};
var specialConditionTypeAudience = {
  conditions: [
    'and',
    {
      match: 'interest_level',
      value: 'special',
      type: 'special_condition_type',
    },
  ],
};
var conditionsPassingWithNoAttrs = [
  'not',
  {
    match: 'exists',
    name: 'input_value',
    type: 'custom_attribute',
  },
];
var conditionsPassingWithNoAttrsAudience = {
  conditions: conditionsPassingWithNoAttrs,
};
var audiencesById = new Map([
  ['0', chromeUserAudience],
  ['1', iphoneUserAudience],
  ['2', conditionsPassingWithNoAttrsAudience],
  ['3', specialConditionTypeAudience],
]);

describe('lib/core/audience_evaluator', function() {
  var audienceEvaluator;

  beforeEach(function() {
    sinon.stub(mockLogger, 'log');
  });

  afterEach(function() {
    mockLogger.log.restore();
  });

  describe('APIs', function() {
    context('with default condition evaluator', function() {
      beforeEach(function() {
        audienceEvaluator = createAudienceEvaluator();
      });
      describe('evaluate', function() {
        it('should return true if there are no audiences', function() {
          assert.isTrue(audienceEvaluator.evaluate([], audiencesById, getMockUserContext({})));
        });

        it('should return false if there are audiences but no attributes', function() {
          assert.isFalse(audienceEvaluator.evaluate(['0'], audiencesById, getMockUserContext({})));
        });

        it('should return true if any of the audience conditions are met', function() {
          var iphoneUsers = {
            device_model: 'iphone',
          };

          var chromeUsers = {
            browser_type: 'chrome',
          };

          var iphoneChromeUsers = {
            browser_type: 'chrome',
            device_model: 'iphone',
          };

          assert.isTrue(audienceEvaluator.evaluate(['0', '1'], audiencesById, getMockUserContext(iphoneUsers)));
          assert.isTrue(audienceEvaluator.evaluate(['0', '1'], audiencesById, getMockUserContext(chromeUsers)));
          assert.isTrue(audienceEvaluator.evaluate(['0', '1'], audiencesById, getMockUserContext(iphoneChromeUsers)));
        });

        it('should return false if none of the audience conditions are met', function() {
          var nexusUsers = {
            device_model: 'nexus5',
          };

          var safariUsers = {
            browser_type: 'safari',
          };

          var nexusSafariUsers = {
            browser_type: 'safari',
            device_model: 'nexus5',
          };

          assert.isFalse(audienceEvaluator.evaluate(['0', '1'], audiencesById, getMockUserContext(nexusUsers)));
          assert.isFalse(audienceEvaluator.evaluate(['0', '1'], audiencesById, getMockUserContext(safariUsers)));
          assert.isFalse(audienceEvaluator.evaluate(['0', '1'], audiencesById, getMockUserContext(nexusSafariUsers)));
        });

        it('should return true if no attributes are passed and the audience conditions evaluate to true in the absence of attributes', function() {
          assert.isTrue(audienceEvaluator.evaluate(['2'], audiencesById, getMockUserContext({})));
        });

        describe('complex audience conditions', function() {
          it('should return true if any of the audiences in an "OR" condition pass', function() {
            var result = audienceEvaluator.evaluate(['or', '0', '1'], audiencesById, getMockUserContext({ browser_type: 'chrome' }));
            assert.isTrue(result);
          });

          it('should return true if all of the audiences in an "AND" condition pass', function() {
            var result = audienceEvaluator.evaluate(['and', '0', '1'], audiencesById, getMockUserContext({
              browser_type: 'chrome',
              device_model: 'iphone',
            }));
            assert.isTrue(result);
          });

          it('should return true if the audience in a "NOT" condition does not pass', function() {
            var result = audienceEvaluator.evaluate(['not', '1'], audiencesById, getMockUserContext({ device_model: 'android' }));
            assert.isTrue(result);
          });
        });

        describe('integration with dependencies', function() {
          var sandbox = sinon.sandbox.create();

          beforeEach(function() {
            sandbox.stub(conditionTreeEvaluator, 'evaluate');
            sandbox.stub(customAttributeConditionEvaluator, 'evaluate');
          });

          afterEach(function() {
            sandbox.restore();
          });

          it('returns true if conditionTreeEvaluator.evaluate returns true', function() {
            conditionTreeEvaluator.evaluate.returns(true);
            var result = audienceEvaluator.evaluate(['or', '0', '1'], audiencesById, getMockUserContext({ browser_type: 'chrome' }));
            assert.isTrue(result);
          });

          it('returns false if conditionTreeEvaluator.evaluate returns false', function() {
            conditionTreeEvaluator.evaluate.returns(false);
            var result = audienceEvaluator.evaluate(['or', '0', '1'], audiencesById, getMockUserContext({ browser_type: 'safari' }));
            assert.isFalse(result);
          });

          it('returns false if conditionTreeEvaluator.evaluate returns null', function() {
            conditionTreeEvaluator.evaluate.returns(null);
            var result = audienceEvaluator.evaluate(['or', '0', '1'], audiencesById, getMockUserContext({ state: 'California' }));
            assert.isFalse(result);
          });

          it('calls customAttributeConditionEvaluator.evaluate in the leaf evaluator for audience conditions', function() {
            conditionTreeEvaluator.evaluate.callsFake(function(conditions, leafEvaluator) {
              return leafEvaluator(conditions[1]);
            });
            customAttributeConditionEvaluator.evaluate.returns(false);
            var userAttributes = { device_model: 'android' };
            var user = getMockUserContext(userAttributes);
            var result = audienceEvaluator.evaluate(['or', '1'], audiencesById, user);
            sinon.assert.calledOnce(customAttributeConditionEvaluator.evaluate);
            sinon.assert.calledWithExactly(
              customAttributeConditionEvaluator.evaluate,
              iphoneUserAudience.conditions[1],
              user,
            );
            assert.isFalse(result);
          });
        });

        describe('Audience evaluation logging', function() {
          var sandbox = sinon.sandbox.create();

          beforeEach(function() {
            sandbox.stub(conditionTreeEvaluator, 'evaluate');
            sandbox.stub(customAttributeConditionEvaluator, 'evaluate');
          });

          afterEach(function() {
            sandbox.restore();
          });

          it('logs correctly when conditionTreeEvaluator.evaluate returns null', function() {
            conditionTreeEvaluator.evaluate.callsFake(function(conditions, leafEvaluator) {
              return leafEvaluator(conditions[1]);
            });
            customAttributeConditionEvaluator.evaluate.returns(null);
            var userAttributes = { device_model: 5.5 };
            var user = getMockUserContext(userAttributes);
            var result = audienceEvaluator.evaluate(['or', '1'], audiencesById, user);
            sinon.assert.calledOnce(customAttributeConditionEvaluator.evaluate);
            sinon.assert.calledWithExactly(
              customAttributeConditionEvaluator.evaluate,
              iphoneUserAudience.conditions[1],
              user
            );
            assert.isFalse(result);
            assert.strictEqual(2, mockLogger.log.callCount);
            assert.strictEqual(
              buildLogMessageFromArgs(mockLogger.log.args[0]),
              'AUDIENCE_EVALUATOR: Starting to evaluate audience "1" with conditions: ["and",{"name":"device_model","value":"iphone","type":"custom_attribute"}].'
            );
            assert.strictEqual(buildLogMessageFromArgs(mockLogger.log.args[1]), 'AUDIENCE_EVALUATOR: Audience "1" evaluated to UNKNOWN.');
          });

          it('logs correctly when conditionTreeEvaluator.evaluate returns true', function() {
            conditionTreeEvaluator.evaluate.callsFake(function(conditions, leafEvaluator) {
              return leafEvaluator(conditions[1]);
            });
            customAttributeConditionEvaluator.evaluate.returns(true);
            var userAttributes = { device_model: 'iphone' };
            var user = getMockUserContext(userAttributes);
            var result = audienceEvaluator.evaluate(['or', '1'], audiencesById, user);
            sinon.assert.calledOnce(customAttributeConditionEvaluator.evaluate);
            sinon.assert.calledWithExactly(
              customAttributeConditionEvaluator.evaluate,
              iphoneUserAudience.conditions[1],
              user,
            );
            assert.isTrue(result);
            assert.strictEqual(2, mockLogger.log.callCount);
            assert.strictEqual(
              buildLogMessageFromArgs(mockLogger.log.args[0]),
              'AUDIENCE_EVALUATOR: Starting to evaluate audience "1" with conditions: ["and",{"name":"device_model","value":"iphone","type":"custom_attribute"}].'
            );
            assert.strictEqual(buildLogMessageFromArgs(mockLogger.log.args[1]), 'AUDIENCE_EVALUATOR: Audience "1" evaluated to TRUE.');
          });

          it('logs correctly when conditionTreeEvaluator.evaluate returns false', function() {
            conditionTreeEvaluator.evaluate.callsFake(function(conditions, leafEvaluator) {
              return leafEvaluator(conditions[1]);
            });
            customAttributeConditionEvaluator.evaluate.returns(false);
            var userAttributes = { device_model: 'android' };
            var user = getMockUserContext(userAttributes);
            var result = audienceEvaluator.evaluate(['or', '1'], audiencesById, user);
            sinon.assert.calledOnce(customAttributeConditionEvaluator.evaluate);
            sinon.assert.calledWithExactly(
              customAttributeConditionEvaluator.evaluate,
              iphoneUserAudience.conditions[1],
              user,
            );
            assert.isFalse(result);
            assert.strictEqual(2, mockLogger.log.callCount);
            assert.strictEqual(
              buildLogMessageFromArgs(mockLogger.log.args[0]),
              'AUDIENCE_EVALUATOR: Starting to evaluate audience "1" with conditions: ["and",{"name":"device_model","value":"iphone","type":"custom_attribute"}].'
            );
            assert.strictEqual(buildLogMessageFromArgs(mockLogger.log.args[1]), 'AUDIENCE_EVALUATOR: Audience "1" evaluated to FALSE.');
          });
        });
      });
    });

    context('with additional custom condition evaluator', function() {
      describe('when passing a valid additional evaluator', function() {
        beforeEach(function() {
          const mockEnvironment = {
            special: true,
          };
          audienceEvaluator = createAudienceEvaluator({
            special_condition_type: {
              evaluate: function(condition, user) {
                const result = mockEnvironment[condition.value] && user.getAttributes()[condition.match] > 0;
                return result;
              },
            },
          });
        });

        it('should evaluate an audience properly using the custom condition evaluator', function() {
          assert.isFalse(audienceEvaluator.evaluate(['3'], audiencesById, getMockUserContext({ interest_level: 0 })));
          assert.isTrue(audienceEvaluator.evaluate(['3'], audiencesById, getMockUserContext({ interest_level: 1 })));
        });
      });

      describe('when passing an invalid additional evaluator', function() {
        beforeEach(function() {
          audienceEvaluator = createAudienceEvaluator({
            custom_attribute: {
              evaluate: function() {
                return false;
              },
            },
          });
        });

        it('should not be able to overwrite built in `custom_attribute` evaluator', function() {
          assert.isTrue(
            audienceEvaluator.evaluate(['0'], audiencesById, getMockUserContext({
              browser_type: 'chrome',
            }))
          );
        });
      });
    });

    context('with odp segment evaluator', function() {
      describe('Single ODP Audience', () => {
        const singleAudience = {
          "conditions": [
            "and",
            {
                "value": "odp-segment-1",
                "type": "third_party_dimension",
                "name": "odp.audiences",
                "match": "qualified"
            }
          ]
        };
        const audiencesById = {
          0: singleAudience,
        }
        const audience = new AudienceEvaluator();
        
        it('should evaluate to true if segment is found', () => {
          assert.isTrue(audience.evaluate(['or', '0'], audiencesById, getMockUserContext({}, ['odp-segment-1'])));
        });
        
        it('should evaluate to false if segment is not found', () => {
          assert.isFalse(audience.evaluate(['or', '0'], audiencesById, getMockUserContext({}, ['odp-segment-2'])));
        });

        it('should evaluate to false if not segments are provided', () => {
          assert.isFalse(audience.evaluate(['or', '0'], audiencesById, getMockUserContext({})));
        });
      });

      describe('Multiple ODP conditions in one Audience', () => {
        const singleAudience = {
          "conditions": [
            "and",
            {
              "value": "odp-segment-1",
              "type": "third_party_dimension",
              "name": "odp.audiences",
              "match": "qualified"
            },
            {
              "value": "odp-segment-2",
              "type": "third_party_dimension",
              "name": "odp.audiences",
              "match": "qualified"
            },
            [
              "or",
              {
                "value": "odp-segment-3",
                "type": "third_party_dimension",
                "name": "odp.audiences",
                "match": "qualified"
              },
              {
                "value": "odp-segment-4",
                "type": "third_party_dimension",
                "name": "odp.audiences",
                "match": "qualified"
              },
            ]
          ]
        };
        const audiencesById = {
          0: singleAudience,
        }
        const audience = new AudienceEvaluator();
        
        it('should evaluate correctly based on the given segments', () => {
          assert.isTrue(audience.evaluate(['or', '0'], audiencesById, getMockUserContext({}, ['odp-segment-1', 'odp-segment-2', 'odp-segment-3'])));
          assert.isTrue(audience.evaluate(['or', '0'], audiencesById, getMockUserContext({}, ['odp-segment-1', 'odp-segment-2', 'odp-segment-4'])));
          assert.isTrue(audience.evaluate(['or', '0'], audiencesById, getMockUserContext({}, ['odp-segment-1', 'odp-segment-2', 'odp-segment-3', 'odp-segment-4'])));
          assert.isFalse(audience.evaluate(['or', '0'], audiencesById, getMockUserContext({}, ['odp-segment-1', 'odp-segment-3', 'odp-segment-4'])));
          assert.isFalse(audience.evaluate(['or', '0'], audiencesById, getMockUserContext({}, ['odp-segment-2', 'odp-segment-3', 'odp-segment-4'])));
        });
      });

      describe('Multiple ODP conditions in multiple Audience', () => {
        const audience1And2 = {
          "conditions": [
            "and",
            {
              "value": "odp-segment-1",
              "type": "third_party_dimension",
              "name": "odp.audiences",
              "match": "qualified"
            },
            {
              "value": "odp-segment-2",
              "type": "third_party_dimension",
              "name": "odp.audiences",
              "match": "qualified"
            }
          ]
        };

        const audience3And4 = {
          "conditions": [
            "and",
            {
              "value": "odp-segment-3",
              "type": "third_party_dimension",
              "name": "odp.audiences",
              "match": "qualified"
            },
            {
              "value": "odp-segment-4",
              "type": "third_party_dimension",
              "name": "odp.audiences",
              "match": "qualified"
            }
          ]
        };

        const audience5And6 = {
          "conditions": [
            "or",
            {
              "value": "odp-segment-5",
              "type": "third_party_dimension",
              "name": "odp.audiences",
              "match": "qualified"
            },
            {
              "value": "odp-segment-6",
              "type": "third_party_dimension",
              "name": "odp.audiences",
              "match": "qualified"
            }
          ]
        };
        const audiencesById = {
          0: audience1And2,
          1: audience3And4,
          2: audience5And6
        }
        const audience = new AudienceEvaluator();
        
        it('should evaluate correctly based on the given segments', () => {
          assert.isTrue(
            audience.evaluate(
              ['or', '0', '1', '2'],
              audiencesById,
              getMockUserContext({},['odp-segment-1', 'odp-segment-2'])
            )
          );
          assert.isFalse(
            audience.evaluate(
              ['and', '0', '1', '2'],
              audiencesById,
              getMockUserContext({}, ['odp-segment-1', 'odp-segment-2'])
            )
          );
          assert.isTrue(
            audience.evaluate(
              ['and', '0', '1', '2'],
              audiencesById,
              getMockUserContext({}, ['odp-segment-1', 'odp-segment-2', 'odp-segment-3', 'odp-segment-4', 'odp-segment-6'])
            )
          );
          assert.isTrue(
            audience.evaluate(
              ['and', '0', '1',['not', '2']],
              audiencesById,
              getMockUserContext({}, ['odp-segment-1', 'odp-segment-2', 'odp-segment-3', 'odp-segment-4'])
            )
          );
        });
      });
    });

    context('with multiple types of evaluators', function() {
      const audience1And2 = {
        "conditions": [
          "and",
          {
            "value": "odp-segment-1",
            "type": "third_party_dimension",
            "name": "odp.audiences",
            "match": "qualified"
          },
          {
            "value": "odp-segment-2",
            "type": "third_party_dimension",
            "name": "odp.audiences",
            "match": "qualified"
          }
        ]
      };
      const audience3Or4 = {
        "conditions": [
          "or",
          {
            "value": "odp-segment-3",
            "type": "third_party_dimension",
            "name": "odp.audiences",
            "match": "qualified"
          },
          {
            "value": "odp-segment-4",
            "type": "third_party_dimension",
            "name": "odp.audiences",
            "match": "qualified"
          }
        ]
      };

      const audiencesById = {
        0: audience1And2,
        1: audience3Or4,
        2: chromeUserAudience,
      }
      
      const audience = new AudienceEvaluator();

      it('should evaluate correctly based on the given segments', () => {
        assert.isFalse(
          audience.evaluate(
            ['and', '0', '1', '2'],
            audiencesById,
            getMockUserContext({ browser_type: 'not_chrome' },
              ['odp-segment-1', 'odp-segment-2', 'odp-segment-4'])
          )
        );
        assert.isTrue(
          audience.evaluate(
            ['and', '0', '1', '2'],
            audiencesById,
            getMockUserContext({ browser_type: 'chrome' },
              ['odp-segment-1', 'odp-segment-2', 'odp-segment-4'])
          )
        );
      });
    });
  });
});
