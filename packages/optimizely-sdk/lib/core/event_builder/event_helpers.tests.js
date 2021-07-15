/**
 * Copyright 2019-2020, Optimizely
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

import fns from '../../utils/fns';
import * as projectConfig from '../project_config';
import * as decision from '../decision';
import { buildImpressionEvent, buildConversionEvent } from './event_helpers';

describe('lib/event_builder/event_helpers', function() {
  var configObj;

  beforeEach(function() {
    configObj = {
      accountId: 'accountId',
      projectId: 'projectId',
      revision: '69',
      anonymizeIP: true,
      botFiltering: true,
    };

    sinon.stub(projectConfig, 'getEventId');
    sinon.stub(projectConfig, 'getVariationIdFromExperimentIdAndVariationKey');
    sinon.stub(projectConfig, 'getLayerId');
    sinon.stub(projectConfig, 'getAttributeId');

    sinon.stub(decision, 'getExperimentId');

    sinon.stub(fns, 'uuid').returns('uuid');
    sinon.stub(fns, 'currentTimestamp').returns(100);
  });

  afterEach(function() {
    decision.getExperimentId.restore();

    projectConfig.getEventId.restore();
    projectConfig.getVariationIdFromExperimentIdAndVariationKey.restore();
    projectConfig.getLayerId.restore();
    projectConfig.getAttributeId.restore();

    fns.uuid.restore();
    fns.currentTimestamp.restore();
  });

  describe('buildImpressionEvent', function() {
    describe('when botFiltering and anonymizeIP are true', function() {
      it('should build an ImpressionEvent with the correct attributes', function() {
        var decisionObj = {
          experiment: {
            key: 'exp1',
            status: 'Running',
            forcedVariations: {},
            audienceIds: [],
            layerId: 'layer-id',
            trafficAllocation: [],
            variationKeyMap: {
              'variation': {
                key: 'var1',
                id: 'var1-id',
              }
            },
            id: 'exp1-id',
            variations: [{ key: 'var1', id: 'var1-id' }],
          },
          variation: {
            key: 'var1',
            id: 'var1-id',
          },
          decisionSource: 'experiment',
        }
        decision.getExperimentId.withArgs(decisionObj).returns('exp1-id');

        projectConfig.getVariationIdFromExperimentIdAndVariationKey
          .withArgs(configObj, 'exp1-id', 'var1')
          .returns('var1-id');
        projectConfig.getLayerId.withArgs(configObj, 'exp1-id').returns('layer-id');

        projectConfig.getAttributeId.withArgs(configObj, 'plan_type').returns('plan_type_id');


        var result = buildImpressionEvent({
          configObj: configObj,
          decisionObj: decisionObj,
          enabled: true,
          flagKey: 'flagkey1',
          userId: 'user1',
          userAttributes: {
            plan_type: 'bronze',
            invalid: 'value',
          },
          clientEngine: 'node',
          clientVersion: '3.0.11',
        });

        assert.deepEqual(result, {
          type: 'impression',
          timestamp: 100,
          uuid: 'uuid',
          context: {
            accountId: 'accountId',
            projectId: 'projectId',
            revision: '69',
            clientName: 'node',
            clientVersion: '3.0.11',
            anonymizeIP: true,
            botFiltering: true,
          },

          user: {
            id: 'user1',
            attributes: [
              {
                entityId: 'plan_type_id',
                key: 'plan_type',
                value: 'bronze',
              },
            ],
          },

          layer: {
            id: 'layer-id',
          },
          experiment: {
            id: 'exp1-id',
            key: 'exp1',
          },
          variation: {
            id: 'var1-id',
            key: 'var1',
          },

          ruleKey: "exp1",
          flagKey: 'flagkey1',
          ruleType: 'experiment',
          enabled: true,
        });
      });
    });

    describe('when botFiltering and anonymizeIP are undefined', function() {
      it('should create an ImpressionEvent with the correct attributes', function() {
        var decisionObj = {
          experiment: {
            key: 'exp1',
            status: 'Running',
            forcedVariations: {},
            audienceIds: [],
            layerId: '253442',
            trafficAllocation: [],
            variationKeyMap: {
              'variation': {
                key: 'var1',
                id: 'var1-id',
              }
            },
            id: '1237847778',
            variations: [{ key: 'var1', id: 'var1-id' }],
          },
          variation: {
            key: 'var1',
            id: 'var1-id',
          },
          decisionSource: 'experiment',
        }
        decision.getExperimentId.withArgs(decisionObj).returns('exp1-id');

        projectConfig.getVariationIdFromExperimentIdAndVariationKey
          .withArgs(configObj, 'exp1-id', 'var1')
          .returns('var1-id');
        projectConfig.getLayerId.withArgs(configObj, 'exp1-id').returns('layer-id');

        projectConfig.getAttributeId.withArgs(configObj, 'plan_type').returns('plan_type_id');

        delete configObj['anonymizeIP'];
        delete configObj['botFiltering'];

        var result = buildImpressionEvent({
          configObj: configObj,
          decisionObj: decisionObj,
          flagKey: 'flagkey1',
          enabled: false,
          userId: 'user1',
          userAttributes: {
            plan_type: 'bronze',
            invalid: 'value',
          },
          clientEngine: 'node',
          clientVersion: '3.0.11',
        });

        assert.deepEqual(result, {
          type: 'impression',
          timestamp: 100,
          uuid: 'uuid',
          context: {
            accountId: 'accountId',
            projectId: 'projectId',
            revision: '69',
            clientName: 'node',
            clientVersion: '3.0.11',
            anonymizeIP: false,
            botFiltering: undefined,
          },

          user: {
            id: 'user1',
            attributes: [
              {
                entityId: 'plan_type_id',
                key: 'plan_type',
                value: 'bronze',
              },
            ],
          },

          layer: {
            id: 'layer-id',
          },
          experiment: {
            id: 'exp1-id',
            key: 'exp1',
          },
          variation: {
            id: 'var1-id',
            key: 'var1',
          },

          ruleKey: "exp1",
          flagKey: 'flagkey1',
          ruleType: 'experiment',
          enabled: false,
        });
      });
    });
  });

  describe('buildConversionEvent', function() {
    describe('when botFiltering and anonymizeIP are true', function() {
      it('should build an ConversionEvent with the correct attributes', function() {
        projectConfig.getEventId.withArgs(configObj, 'event').returns('event-id');
        projectConfig.getAttributeId.withArgs(configObj, 'plan_type').returns('plan_type_id');

        var result = buildConversionEvent({
          configObj: configObj,
          eventKey: 'event',
          eventTags: {
            value: '123',
            revenue: 1000,
            tag1: 'value1',
          },
          userId: 'user1',
          userAttributes: {
            plan_type: 'bronze',
            invalid: 'value',
          },
          clientEngine: 'node',
          clientVersion: '3.0.11',
        });

        assert.deepEqual(result, {
          type: 'conversion',
          timestamp: 100,
          uuid: 'uuid',
          context: {
            accountId: 'accountId',
            projectId: 'projectId',
            revision: '69',
            clientName: 'node',
            clientVersion: '3.0.11',
            anonymizeIP: true,
            botFiltering: true,
          },

          user: {
            id: 'user1',
            attributes: [
              {
                entityId: 'plan_type_id',
                key: 'plan_type',
                value: 'bronze',
              },
            ],
          },

          event: {
            id: 'event-id',
            key: 'event',
          },

          revenue: 1000,
          value: 123,
          tags: {
            value: '123',
            revenue: 1000,
            tag1: 'value1',
          },
        });
      });
    });

    describe('when botFiltering and anonymizeIP are undefined', function() {
      it('should create an ImpressionEvent with the correct attributes', function() {
        projectConfig.getEventId.withArgs(configObj, 'event').returns('event-id');
        projectConfig.getAttributeId.withArgs(configObj, 'plan_type').returns('plan_type_id');

        delete configObj['anonymizeIP'];
        delete configObj['botFiltering'];

        var result = buildConversionEvent({
          configObj: configObj,
          eventKey: 'event',
          eventTags: {
            value: '123',
            revenue: 1000,
            tag1: 'value1',
          },
          userId: 'user1',
          userAttributes: {
            plan_type: 'bronze',
            invalid: 'value',
          },
          clientEngine: 'node',
          clientVersion: '3.0.11',
        });

        assert.deepEqual(result, {
          type: 'conversion',
          timestamp: 100,
          uuid: 'uuid',
          context: {
            accountId: 'accountId',
            projectId: 'projectId',
            revision: '69',
            clientName: 'node',
            clientVersion: '3.0.11',
            anonymizeIP: false,
            botFiltering: undefined,
          },

          user: {
            id: 'user1',
            attributes: [
              {
                entityId: 'plan_type_id',
                key: 'plan_type',
                value: 'bronze',
              },
            ],
          },

          event: {
            id: 'event-id',
            key: 'event',
          },

          revenue: 1000,
          value: 123,
          tags: {
            value: '123',
            revenue: 1000,
            tag1: 'value1',
          },
        });
      });
    });
  });
});
