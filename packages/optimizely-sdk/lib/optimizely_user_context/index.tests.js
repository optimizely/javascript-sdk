/****************************************************************************
 * Copyright 2020, Optimizely, Inc. and contributors                        *
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
import { assert } from 'chai';
import sinon from 'sinon';
import OptimizelyUserContext from './';

describe('lib/optimizely_user_context', function() {
  describe('APIs', function() {
    var fakeOptimizely;
    var userId = 'tester';
    var options = 'fakeOption';
    describe('#setAttribute', function() {
      fakeOptimizely = {
        decide: sinon.stub().returns({})
      }
      it('should set attributes when provided at instantiation of OptimizelyUserContext', function() {
        var userId = 'user1';
        var attributes = { test_attribute: 'test_value' };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
          attributes
        });
        user.setAttribute('k1', {'hello': 'there'});
        user.setAttribute('k2', true);
        user.setAttribute('k3', 100);
        user.setAttribute('k4', 3.5);
        assert.deepEqual(user.getOptimizely(), fakeOptimizely);
        assert.deepEqual(user.getUserId(), userId);

        var newAttributes = user.getAttributes();
        assert.deepEqual(newAttributes['test_attribute'], 'test_value');
        assert.deepEqual(newAttributes['k1'], {'hello': 'there'});
        assert.deepEqual(newAttributes['k2'], true);
        assert.deepEqual(newAttributes['k3'], 100);
        assert.deepEqual(newAttributes['k4'], 3.5);
      });

      it('should set attributes when none provided at instantiation of OptimizelyUserContext', function() {
        var userId = 'user2';
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        user.setAttribute('k1', {'hello': 'there'});
        user.setAttribute('k2', true);
        user.setAttribute('k3', 100);
        user.setAttribute('k4', 3.5);
        assert.deepEqual(user.getOptimizely(), fakeOptimizely);
        assert.deepEqual(user.getUserId(), userId);

        var newAttributes = user.getAttributes();
        assert.deepEqual(newAttributes['k1'], {'hello': 'there'});
        assert.deepEqual(newAttributes['k2'], true);
        assert.deepEqual(newAttributes['k3'], 100);
        assert.deepEqual(newAttributes['k4'], 3.5);
      });

      it('should override existing attributes', function() {
        var userId = 'user3';
        var attributes = { test_attribute: 'test_value' };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
          attributes,
        });
        user.setAttribute('k1', {'hello': 'there'});
        user.setAttribute('test_attribute', 'overwritten_value');
        assert.deepEqual(user.getOptimizely(), fakeOptimizely);
        assert.deepEqual(user.getUserId(), userId);

        var newAttributes = user.getAttributes();
        assert.deepEqual(newAttributes['k1'], {'hello': 'there'});
        assert.deepEqual(newAttributes['test_attribute'], 'overwritten_value');
        assert.deepEqual(Object.keys(newAttributes).length, 2);
      });

      it('should allow to set attributes with value of null', function() {
        var userId = 'user4';
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        user.setAttribute('null_attribute', null);
        assert.deepEqual(user.getOptimizely(), fakeOptimizely);
        assert.deepEqual(user.getUserId(), userId);

        var newAttributes = user.getAttributes();
        assert.deepEqual(newAttributes['null_attribute'], null);
      });

      it('should set attributes by value in constructor', function() {
        var userId = 'user1';
        var attributes = { initial_attribute: 'initial_value' };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
          attributes,
        });
        attributes["attribute2"] = 100;
        assert.deepEqual(user.getAttributes(), { initial_attribute: 'initial_value' });
        user.setAttribute("attribute3", "hello");
        assert.deepEqual(attributes, { initial_attribute: 'initial_value', 'attribute2': 100});
      });

      it('should not change user attributes if returned by getAttributes object is updated', function() {
        var userId = 'user1';
        var attributes = { initial_attribute: 'initial_value' };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
          attributes,
        });
        var attributes2 = user.getAttributes();
        attributes2['new_attribute'] = { "value": 100 };
        assert.deepEqual(user.getAttributes(), attributes);
        var expectedAttributes = {
          initial_attribute: 'initial_value',
          new_attribute: { "value": 100 }
        }
        assert.deepEqual(attributes2, expectedAttributes);
      });
    });

    describe('#decide', function() {
      it('should return an expected decision object', function() {
        var flagKey = 'feature_1';
        var fakeDecision = {
          variationKey: 'variation_with_traffic',
          enabled: true,
          variables: {},
          ruleKey: 'exp_no_audience',
          flagKey: flagKey,
          userContext: 'fakeUserContext',
          reasons: [],
        };
        fakeOptimizely = {
          decide: sinon.stub().returns(fakeDecision)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        var decision = user.decide(flagKey, options);
        sinon.assert.calledWithExactly(
          fakeOptimizely.decide,
          user,
          flagKey,
          options
        );
        assert.deepEqual(decision, fakeDecision);
      });
    });

    describe('#decideForKeys', function() {
      it('should return an expected decision results object', function() {
        var flagKey1 = 'feature_1';
        var flagKey2 = 'feature_2';
        var fakeDecisionMap = {
          flagKey1:
            {
              variationKey: '18257766532',
              enabled: true,
              variables: {},
              ruleKey: '18322080788',
              flagKey: flagKey1,
              userContext: 'fakeUserContext',
              reasons: [],
            },
          flagKey2:
            {
              variationKey: 'variation_with_traffic',
              enabled: true,
              variables: {},
              ruleKey: 'exp_no_audience',
              flagKey: flagKey2,
              userContext: 'fakeUserContext',
              reasons: [],
            },
        };
        fakeOptimizely = {
          decideForKeys: sinon.stub().returns(fakeDecisionMap)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        var decisionMap = user.decideForKeys([ flagKey1, flagKey2 ], options);
        sinon.assert.calledWithExactly(
          fakeOptimizely.decideForKeys,
          user,
          [ flagKey1, flagKey2 ],
          options
        );
        assert.deepEqual(decisionMap, fakeDecisionMap);
      });
    });

    describe('#decideAll', function() {
      it('should return an expected decision results object', function() {
        var flagKey1 = 'feature_1';
        var flagKey2 = 'feature_2';
        var flagKey3 = 'feature_3';
        var fakeDecisionMap = {
          flagKey1:
            {
              variationKey: '18257766532',
              enabled: true,
              variables: {},
              ruleKey: '18322080788',
              flagKey: flagKey1,
              userContext: 'fakeUserContext',
              reasons: [],
            },
          flagKey2:
            {
              variationKey: 'variation_with_traffic',
              enabled: true,
              variables: {},
              ruleKey: 'exp_no_audience',
              flagKey: flagKey2,
              userContext: 'fakeUserContext',
              reasons: [],
            },
          flagKey3:
          {
            variationKey: '',
            enabled: false,
            variables: {},
            ruleKey: '',
            flagKey: flagKey3,
            userContext: user,
            reasons: [],
          },
        };
        fakeOptimizely = {
          decideAll: sinon.stub().returns(fakeDecisionMap)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        var decisionMap = user.decideAll(options);
        sinon.assert.calledWithExactly(
          fakeOptimizely.decideAll,
          user,
          options
        );
        assert.deepEqual(decisionMap, fakeDecisionMap);
      });
    });

    describe('#trackEvent', function() {
      it('should call track from optimizely client', function() {
        fakeOptimizely = {
          track: sinon.stub()
        };
        var eventName = 'myEvent';
        var eventTags = { 'eventTag1': 1000 }
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        user.trackEvent(eventName, eventTags);
        sinon.assert.calledWithExactly(
          fakeOptimizely.track,
          eventName,
          user.getUserId(),
          user.getAttributes(),
          eventTags,
        );
      });
    });
  });
});
