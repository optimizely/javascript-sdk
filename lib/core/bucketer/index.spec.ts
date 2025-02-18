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
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sprintf } from '../../utils/fns';
import projectConfig, { ProjectConfig } from '../../project_config/project_config';
import { getTestProjectConfig } from '../../tests/test_data';
import { INVALID_BUCKETING_ID, INVALID_GROUP_ID } from 'error_message';
import * as bucketer from './';
import * as bucketValueGenerator from './bucket_value_generator';

import {
  USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
  USER_NOT_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
  USER_NOT_IN_ANY_EXPERIMENT,
  USER_ASSIGNED_TO_EXPERIMENT_BUCKET,
} from '.';
import { BucketerParams } from '../../shared_types';
import { OptimizelyError } from '../../error/optimizly_error';
import { getMockLogger } from '../../tests/mock/mock_logger';
import { LoggerFacade } from '../../logging/logger';

const testData = getTestProjectConfig();

function cloneDeep<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return (value.map(cloneDeep) as unknown) as T;
  }

  const copy: Record<string, unknown> = {};

  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      copy[key] = cloneDeep((value as Record<string, unknown>)[key]);
    }
  }

  return copy as T;
}

const setLogSpy = (logger: LoggerFacade) => {
  vi.spyOn(logger, 'info');
  vi.spyOn(logger, 'debug');
  vi.spyOn(logger, 'warn');
  vi.spyOn(logger, 'error');
};

describe('excluding groups', () => {
  let configObj;
  const mockLogger = getMockLogger();
  let bucketerParams: BucketerParams;

  beforeEach(() => {
    setLogSpy(mockLogger);
    configObj = projectConfig.createProjectConfig(cloneDeep(testData));

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    bucketerParams = {
      experimentId: configObj.experiments[0].id,
      experimentKey: configObj.experiments[0].key,
      trafficAllocationConfig: configObj.experiments[0].trafficAllocation,
      variationIdMap: configObj.variationIdMap,
      experimentIdMap: configObj.experimentIdMap,
      groupIdMap: configObj.groupIdMap,
      logger: mockLogger,
    };

    vi.spyOn(bucketValueGenerator, '_generateBucketValue')
      .mockReturnValueOnce(50)
      .mockReturnValueOnce(50000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return decision response with correct variation ID when provided bucket value', async () => {
    const bucketerParamsTest1 = cloneDeep(bucketerParams);
    bucketerParamsTest1.userId = 'ppid1';
    const decisionResponse = bucketer.bucket(bucketerParamsTest1);

    expect(decisionResponse.result).toBe('111128');
    expect(mockLogger.debug).toHaveBeenCalledWith(USER_ASSIGNED_TO_EXPERIMENT_BUCKET, expect.any(Number), 'ppid1');

    const bucketerParamsTest2 = cloneDeep(bucketerParams);
    bucketerParamsTest2.userId = 'ppid2';
    const decisionResponse2 = bucketer.bucket(bucketerParamsTest2);

    expect(decisionResponse2.result).toBeNull();
    expect(mockLogger.debug).toHaveBeenCalledWith(USER_ASSIGNED_TO_EXPERIMENT_BUCKET, expect.any(Number), 'ppid2');
  });
});

describe('including groups: random', () => {
  let configObj: ProjectConfig;
  const mockLogger = getMockLogger();
  let bucketerParams: BucketerParams;

  beforeEach(() => {
    setLogSpy(mockLogger);
    configObj = projectConfig.createProjectConfig(cloneDeep(testData));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    bucketerParams = {
      experimentId: configObj.experiments[4].id,
      experimentKey: configObj.experiments[4].key,
      trafficAllocationConfig: configObj.experiments[4].trafficAllocation,
      variationIdMap: configObj.variationIdMap,
      experimentIdMap: configObj.experimentIdMap,
      groupIdMap: configObj.groupIdMap,
      logger: mockLogger,
      userId: 'testUser',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return decision response with the proper variation for a user in a grouped experiment', () => {
    vi.spyOn(bucketValueGenerator, '_generateBucketValue')
      .mockReturnValueOnce(50)
      .mockReturnValueOnce(50);

    const decisionResponse = bucketer.bucket(bucketerParams);

    expect(decisionResponse.result).toBe('551');
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    expect(mockLogger.debug).toHaveBeenCalledWith(USER_ASSIGNED_TO_EXPERIMENT_BUCKET, expect.any(Number), 'testUser');
    expect(mockLogger.info).toHaveBeenCalledWith(
      USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
      'testUser',
      'groupExperiment1',
      '666'
    );
  });

  it('should return decision response with variation null when a user is bucketed into a different grouped experiment than the one speicfied', () => {
    vi.spyOn(bucketValueGenerator, '_generateBucketValue').mockReturnValue(5000);

    const decisionResponse = bucketer.bucket(bucketerParams);

    expect(decisionResponse.result).toBeNull();
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(USER_ASSIGNED_TO_EXPERIMENT_BUCKET, expect.any(Number), 'testUser');
    expect(mockLogger.info).toHaveBeenCalledWith(
      USER_NOT_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
      'testUser',
      'groupExperiment1',
      '666'
    );
  });

  it('should return decision response with variation null when a user is not bucketed into any experiments in the random group', () => {
    vi.spyOn(bucketValueGenerator, '_generateBucketValue').mockReturnValue(50000);

    const decisionResponse = bucketer.bucket(bucketerParams);

    expect(decisionResponse.result).toBeNull();
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(USER_ASSIGNED_TO_EXPERIMENT_BUCKET, expect.any(Number), 'testUser');
    expect(mockLogger.info).toHaveBeenCalledWith(USER_NOT_IN_ANY_EXPERIMENT, 'testUser', '666');
  });

  it('should return decision response with variation null when a user is bucketed into traffic space of deleted experiment within a random group', () => {
    vi.spyOn(bucketValueGenerator, '_generateBucketValue').mockReturnValueOnce(9000);

    const decisionResponse = bucketer.bucket(bucketerParams);

    expect(decisionResponse.result).toBeNull();
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(USER_ASSIGNED_TO_EXPERIMENT_BUCKET, expect.any(Number), 'testUser');
    expect(mockLogger.info).toHaveBeenCalledWith(USER_NOT_IN_ANY_EXPERIMENT, 'testUser', '666');
  });

  it('should throw an error if group ID is not in the datafile', () => {
    const bucketerParamsWithInvalidGroupId = cloneDeep(bucketerParams);
    bucketerParamsWithInvalidGroupId.experimentIdMap[configObj.experiments[4].id].groupId = '6969';

    expect(() => bucketer.bucket(bucketerParamsWithInvalidGroupId)).toThrowError(
      new OptimizelyError(INVALID_GROUP_ID, '6969')
    );
  });
});

describe('including groups: overlapping', () => {
  let configObj: ProjectConfig;
  const mockLogger = getMockLogger();
  let bucketerParams: BucketerParams;

  beforeEach(() => {
    setLogSpy(mockLogger);
    configObj = projectConfig.createProjectConfig(cloneDeep(testData));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    bucketerParams = {
      experimentId: configObj.experiments[6].id,
      experimentKey: configObj.experiments[6].key,
      trafficAllocationConfig: configObj.experiments[6].trafficAllocation,
      variationIdMap: configObj.variationIdMap,
      experimentIdMap: configObj.experimentIdMap,
      groupIdMap: configObj.groupIdMap,
      logger: mockLogger,
      userId: 'testUser',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return decision response with variation when a user falls into an experiment within an overlapping group', () => {
    vi.spyOn(bucketValueGenerator, '_generateBucketValue').mockReturnValueOnce(0);    

    const decisionResponse = bucketer.bucket(bucketerParams);

    expect(decisionResponse.result).toBe('553');
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(USER_ASSIGNED_TO_EXPERIMENT_BUCKET, expect.any(Number), 'testUser');
  });

  it('should return decision response with variation null when a user does not fall into an experiment within an overlapping group', () => {
    vi.spyOn(bucketValueGenerator, '_generateBucketValue').mockReturnValueOnce(3000);
    const decisionResponse = bucketer.bucket(bucketerParams);

    expect(decisionResponse.result).toBeNull();
  });
});

describe('bucket value falls into empty traffic allocation ranges', () => {
  let configObj: ProjectConfig;
  const mockLogger = getMockLogger();
  let bucketerParams: BucketerParams;

  beforeEach(() => {
    setLogSpy(mockLogger);
    configObj = projectConfig.createProjectConfig(cloneDeep(testData));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    bucketerParams = {
      experimentId: configObj.experiments[0].id,
      experimentKey: configObj.experiments[0].key,
      trafficAllocationConfig: [
        {
          entityId: '',
          endOfRange: 5000,
        },
        {
          entityId: '',
          endOfRange: 10000,
        },
      ],
      variationIdMap: configObj.variationIdMap,
      experimentIdMap: configObj.experimentIdMap,
      groupIdMap: configObj.groupIdMap,
      logger: mockLogger,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return decision response with variation null', () => {
    const bucketerParamsTest1 = cloneDeep(bucketerParams);
    bucketerParamsTest1.userId = 'ppid1';
    const decisionResponse = bucketer.bucket(bucketerParamsTest1);

    expect(decisionResponse.result).toBeNull();
  });

  it('should not log an invalid variation ID warning', () => {
    bucketer.bucket(bucketerParams);

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});

describe('traffic allocation has invalid variation ids', () => {
  let configObj: ProjectConfig;
  const mockLogger = getMockLogger();
  let bucketerParams: BucketerParams;

  beforeEach(() => {
    setLogSpy(mockLogger);
    configObj = projectConfig.createProjectConfig(cloneDeep(testData));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    bucketerParams = {
      experimentId: configObj.experiments[0].id,
      experimentKey: configObj.experiments[0].key,
      trafficAllocationConfig: [
        {
          entityId: '-1',
          endOfRange: 5000,
        },
        {
          entityId: '-2',
          endOfRange: 10000,
        },
      ],
      variationIdMap: configObj.variationIdMap,
      experimentIdMap: configObj.experimentIdMap,
      groupIdMap: configObj.groupIdMap,
      logger: mockLogger,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return decision response with variation null', () => {
    const bucketerParamsTest1 = cloneDeep(bucketerParams);
    bucketerParamsTest1.userId = 'ppid1';
    const decisionResponse = bucketer.bucket(bucketerParamsTest1);

    expect(decisionResponse.result).toBeNull();
  });
});

describe('_generateBucketValue', () => {
  it('should return a bucket value for different inputs', () => {
    const experimentId = 1886780721;
    const bucketingKey1 = sprintf('%s%s', 'ppid1', experimentId);
    const bucketingKey2 = sprintf('%s%s', 'ppid2', experimentId);
    const bucketingKey3 = sprintf('%s%s', 'ppid2', 1886780722);
    const bucketingKey4 = sprintf('%s%s', 'ppid3', experimentId);

    expect(bucketValueGenerator._generateBucketValue(bucketingKey1)).toBe(5254);
    expect(bucketValueGenerator._generateBucketValue(bucketingKey2)).toBe(4299);
    expect(bucketValueGenerator._generateBucketValue(bucketingKey3)).toBe(2434);
    expect(bucketValueGenerator._generateBucketValue(bucketingKey4)).toBe(5439);
  });

  it('should return an error if it cannot generate the hash value', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(() => bucketValueGenerator._generateBucketValue(null)).toThrowError(
      new OptimizelyError(INVALID_BUCKETING_ID)
    );
  });
});

describe('testBucketWithBucketingId', () => {
  let bucketerParams: BucketerParams;

  beforeEach(() => {
    const configObj = projectConfig.createProjectConfig(cloneDeep(testData));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    bucketerParams = {
      trafficAllocationConfig: configObj.experiments[0].trafficAllocation,
      variationIdMap: configObj.variationIdMap,
      experimentIdMap: configObj.experimentIdMap,
      groupIdMap: configObj.groupIdMap,
    };
  });

  it('check that a non null bucketingId buckets a variation different than the one expected with userId', () => {
    const bucketerParams1 = cloneDeep(bucketerParams);
    bucketerParams1['userId'] = 'testBucketingIdControl';
    bucketerParams1['bucketingId'] = '123456789';
    bucketerParams1['experimentKey'] = 'testExperiment';
    bucketerParams1['experimentId'] = '111127';

    expect(bucketer.bucket(bucketerParams1).result).toBe('111129');
  });

  it('check that a null bucketing ID defaults to bucketing with the userId', () => {
    const bucketerParams2 = cloneDeep(bucketerParams);
    bucketerParams2['userId'] = 'testBucketingIdControl';
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    bucketerParams2['bucketingId'] = null;
    bucketerParams2['experimentKey'] = 'testExperiment';
    bucketerParams2['experimentId'] = '111127';

    expect(bucketer.bucket(bucketerParams2).result).toBe('111128');
  });

  it('check that bucketing works with an experiment in group', () => {
    const bucketerParams4 = cloneDeep(bucketerParams);
    bucketerParams4['userId'] = 'testBucketingIdControl';
    bucketerParams4['bucketingId'] = '123456789';
    bucketerParams4['experimentKey'] = 'groupExperiment2';
    bucketerParams4['experimentId'] = '443';

    expect(bucketer.bucket(bucketerParams4).result).toBe('111128');
  });
});
