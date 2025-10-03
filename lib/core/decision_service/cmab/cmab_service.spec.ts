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

import { describe, it, expect, vi } from 'vitest';

import { DefaultCmabService } from './cmab_service';
import { getMockSyncCache } from '../../../tests/mock/mock_cache';
import { ProjectConfig } from '../../../project_config/project_config';
import { OptimizelyDecideOption, UserAttributes } from '../../../shared_types';
import OptimizelyUserContext from '../../../optimizely_user_context';
import { validate as uuidValidate } from 'uuid';
import { resolvablePromise } from '../../../utils/promise/resolvablePromise';
import { exhaustMicrotasks } from '../../../tests/testUtils';

const mockProjectConfig = (): ProjectConfig => ({
  experimentIdMap: {
    '1234': {
      id: '1234',
      key: 'cmab_1',
      cmab: {
        attributeIds: ['66', '77', '88'],
      }
    },
    '5678': {
      id: '5678',
      key: 'cmab_2',
      cmab: {
        attributeIds: ['66', '99'],
      }
    },
  },
  attributeIdMap: {
    '66': {
      id: '66',
      key: 'country',
    },
    '77': {
      id: '77',
      key: 'age',
    },
    '88': {
      id: '88',
      key: 'language',
    },
    '99': {
      id: '99',
      key: 'gender',
    },
  }
} as any);

const mockUserContext = (userId: string, attributes: UserAttributes): OptimizelyUserContext => new OptimizelyUserContext({
  userId,
  attributes,
} as any);

describe('DefaultCmabService', () => {
  it('should fetch and return the variation from cmabClient using correct parameters', async () => {
    const mockCmabClient = {
      fetchDecision: vi.fn().mockResolvedValue('123'),
    };

    const cmabService = new DefaultCmabService({
      cmabCache: getMockSyncCache(),
      cmabClient: mockCmabClient,
    });

    const projectConfig = mockProjectConfig();
    const userContext = mockUserContext('user123', {
      country: 'US',
      age: '25',
      gender: 'male',
    });

    const ruleId = '1234';
    const variation = await cmabService.getDecision(projectConfig, userContext, ruleId, {});

    expect(variation.variationId).toEqual('123');
    expect(uuidValidate(variation.cmabUuid)).toBe(true);

    expect(mockCmabClient.fetchDecision).toHaveBeenCalledOnce();
    const [ruleIdArg, userIdArg, attributesArg, cmabUuidArg] = mockCmabClient.fetchDecision.mock.calls[0];
    expect(ruleIdArg).toEqual(ruleId);
    expect(userIdArg).toEqual(userContext.getUserId());
    expect(attributesArg).toEqual({
      country: 'US',
      age: '25',
    });
  });

  it('should filter attributes based on experiment cmab attributeIds before fetching variation', async () => {
    const mockCmabClient = {
      fetchDecision: vi.fn().mockResolvedValue('123'),
    };

    const cmabService = new DefaultCmabService({
      cmabCache: getMockSyncCache(),
      cmabClient: mockCmabClient,
    });

    const projectConfig = mockProjectConfig();
    const userContext = mockUserContext('user123', {
      country: 'US',
      age: '25',
      language: 'en',
      gender: 'male'
    });

    await cmabService.getDecision(projectConfig, userContext, '1234', {});
    await cmabService.getDecision(projectConfig, userContext, '5678', {});

    expect(mockCmabClient.fetchDecision).toHaveBeenCalledTimes(2);
    expect(mockCmabClient.fetchDecision.mock.calls[0][2]).toEqual({
      country: 'US',
      age: '25',
      language: 'en',
    });
    expect(mockCmabClient.fetchDecision.mock.calls[1][2]).toEqual({
      country: 'US',
      gender: 'male'
    });
  });

  it('should cache the variation and return the same variation if relevant attributes have not changed', async () => {
    const mockCmabClient = {
      fetchDecision: vi.fn().mockResolvedValueOnce('123')
        .mockResolvedValueOnce('456')
        .mockResolvedValueOnce('789'),
    };

    const cmabService = new DefaultCmabService({
      cmabCache: getMockSyncCache(),
      cmabClient: mockCmabClient,
    });

    const projectConfig = mockProjectConfig();
    const userContext11 = mockUserContext('user123', {
      country: 'US',
      age: '25',
      language: 'en',
      gender: 'male'
    });

    const variation11 = await cmabService.getDecision(projectConfig, userContext11, '1234', {});

    const userContext12 = mockUserContext('user123', {
      country: 'US',
      age: '25',
      language: 'en',
      gender: 'female'
    });

    const variation12 = await cmabService.getDecision(projectConfig, userContext12, '1234', {});
    expect(variation11.variationId).toEqual('123');
    expect(variation12.variationId).toEqual('123');
    expect(variation11.cmabUuid).toEqual(variation12.cmabUuid);

    expect(mockCmabClient.fetchDecision).toHaveBeenCalledTimes(1);

    const userContext21 = mockUserContext('user456', {
      country: 'BD',
      age: '30',
    });

    const variation21 = await cmabService.getDecision(projectConfig, userContext21, '5678', {});

    const userContext22 = mockUserContext('user456', {
      country: 'BD',
      age: '35',
    });
    
    const variation22 = await cmabService.getDecision(projectConfig, userContext22, '5678', {});
    expect(variation21.variationId).toEqual('456');
    expect(variation22.variationId).toEqual('456');
    expect(variation21.cmabUuid).toEqual(variation22.cmabUuid);

    expect(mockCmabClient.fetchDecision).toHaveBeenCalledTimes(2);
  });

  it('should cache the variation and return the same variation if relevant attributes value have not changed but order changed', async () => {
    const mockCmabClient = {
      fetchDecision: vi.fn().mockResolvedValueOnce('123')
        .mockResolvedValueOnce('456')
        .mockResolvedValueOnce('789'),
    };

    const cmabService = new DefaultCmabService({
      cmabCache: getMockSyncCache(),
      cmabClient: mockCmabClient,
    });

    const projectConfig = mockProjectConfig();
    const userContext11 = mockUserContext('user123', {
      country: 'US',
      age: '25',
      language: 'en',
      gender: 'male'
    });

    const variation11 = await cmabService.getDecision(projectConfig, userContext11, '1234', {});

    const userContext12 = mockUserContext('user123', {
      gender: 'female',
      language: 'en',
      country: 'US',
      age: '25',
    });

    const variation12 = await cmabService.getDecision(projectConfig, userContext12, '1234', {});
    expect(variation11.variationId).toEqual('123');
    expect(variation12.variationId).toEqual('123');
    expect(variation11.cmabUuid).toEqual(variation12.cmabUuid);

    expect(mockCmabClient.fetchDecision).toHaveBeenCalledTimes(1);
  });

  it('should not mix up the cache between different experiments', async () => {
    const mockCmabClient = {
      fetchDecision: vi.fn().mockResolvedValueOnce('123')
        .mockResolvedValueOnce('456')
        .mockResolvedValueOnce('789'),
    };

    const cmabService = new DefaultCmabService({
      cmabCache: getMockSyncCache(),
      cmabClient: mockCmabClient,
    });

    const projectConfig = mockProjectConfig();
    const userContext = mockUserContext('user123', {
      country: 'US',
      age: '25',
    });

    const variation1 = await cmabService.getDecision(projectConfig, userContext, '1234', {});

    const variation2 = await cmabService.getDecision(projectConfig, userContext, '5678', {});

    expect(variation1.variationId).toEqual('123');
    expect(variation2.variationId).toEqual('456');
    expect(variation1.cmabUuid).not.toEqual(variation2.cmabUuid);
  });

  it('should not mix up the cache between different users', async () => {
    const mockCmabClient = {
      fetchDecision: vi.fn().mockResolvedValueOnce('123')
        .mockResolvedValueOnce('456')
        .mockResolvedValueOnce('789'),
    };

    const cmabService = new DefaultCmabService({
      cmabCache: getMockSyncCache(),
      cmabClient: mockCmabClient,
    });

    const projectConfig = mockProjectConfig();

    const userContext1 = mockUserContext('user123', {
      country: 'US',
      age: '25',
    });

    const userContext2 = mockUserContext('user456', {
      country: 'US',
      age: '25',
    });

    const variation1 = await cmabService.getDecision(projectConfig, userContext1, '1234', {});

    const variation2 = await cmabService.getDecision(projectConfig, userContext2, '1234', {});
    expect(variation1.variationId).toEqual('123');
    expect(variation2.variationId).toEqual('456');
    expect(variation1.cmabUuid).not.toEqual(variation2.cmabUuid);

    expect(mockCmabClient.fetchDecision).toHaveBeenCalledTimes(2);
  });

  it('should invalidate the cache and fetch a new variation if relevant attributes have changed', async () => {
    const mockCmabClient = {
      fetchDecision: vi.fn().mockResolvedValueOnce('123')
        .mockResolvedValueOnce('456'),
    };

    const cmabService = new DefaultCmabService({
      cmabCache: getMockSyncCache(),
      cmabClient: mockCmabClient,
    });

    const projectConfig = mockProjectConfig();
    const userContext1 = mockUserContext('user123', {
      country: 'US',
      age: '25',
      language: 'en',
      gender: 'male'
    });

    const variation1 = await cmabService.getDecision(projectConfig, userContext1, '1234', {});

    const userContext2 = mockUserContext('user123', {
      country: 'US',
      age: '50',
      language: 'en',
      gender: 'male'
    });

    const variation2 = await cmabService.getDecision(projectConfig, userContext2, '1234', {});
    expect(variation1.variationId).toEqual('123');
    expect(variation2.variationId).toEqual('456');
    expect(variation1.cmabUuid).not.toEqual(variation2.cmabUuid);

    expect(mockCmabClient.fetchDecision).toHaveBeenCalledTimes(2);
  });

  it('should ignore the cache and fetch variation if IGNORE_CMAB_CACHE option is provided', async () => {
    const mockCmabClient = {
      fetchDecision: vi.fn().mockResolvedValueOnce('123')
        .mockResolvedValueOnce('456'),
    };

    const cmabService = new DefaultCmabService({
      cmabCache: getMockSyncCache(),
      cmabClient: mockCmabClient,
    });

    const projectConfig = mockProjectConfig();
    const userContext = mockUserContext('user123', {
      country: 'US',
      age: '25',
      language: 'en',
      gender: 'male'
    });

    const variation1 = await cmabService.getDecision(projectConfig, userContext, '1234', {});

    const variation2 = await cmabService.getDecision(projectConfig, userContext, '1234', {
      [OptimizelyDecideOption.IGNORE_CMAB_CACHE]: true,
    });

    const variation3 = await cmabService.getDecision(projectConfig, userContext, '1234', {});

    expect(variation1.variationId).toEqual('123');
    expect(variation2.variationId).toEqual('456');
    expect(variation1.cmabUuid).not.toEqual(variation2.cmabUuid);

    expect(variation3.variationId).toEqual('123');
    expect(variation3.cmabUuid).toEqual(variation1.cmabUuid);

    expect(mockCmabClient.fetchDecision).toHaveBeenCalledTimes(2);
  });

  it('should reset the cache before fetching variation if RESET_CMAB_CACHE option is provided', async () => {
    const mockCmabClient = {
      fetchDecision: vi.fn().mockResolvedValueOnce('123')
        .mockResolvedValueOnce('456')
        .mockResolvedValueOnce('789')
        .mockResolvedValueOnce('101112'),
    };

    const cmabService = new DefaultCmabService({
      cmabCache: getMockSyncCache(),
      cmabClient: mockCmabClient,
    });

    const projectConfig = mockProjectConfig();
    const userContext1 = mockUserContext('user123', {
      country: 'US',
      age: '25'
    });

    const userContext2 = mockUserContext('user456', {
      country: 'US',
      age: '50'
    });

    const variation1 = await cmabService.getDecision(projectConfig, userContext1, '1234', {});
    expect(variation1.variationId).toEqual('123');

    const variation2 = await cmabService.getDecision(projectConfig, userContext2, '1234', {});
    expect(variation2.variationId).toEqual('456');

    const variation3 = await cmabService.getDecision(projectConfig, userContext1, '1234', {
      [OptimizelyDecideOption.RESET_CMAB_CACHE]: true,
    });

    expect(variation3.variationId).toEqual('789');

    const variation4 = await cmabService.getDecision(projectConfig, userContext2, '1234', {});
    expect(variation4.variationId).toEqual('101112');
  });

  it('should invalidate the cache and fetch a new variation if INVALIDATE_USER_CMAB_CACHE option is provided', async () => {
    const mockCmabClient = {
      fetchDecision: vi.fn().mockResolvedValueOnce('123')
        .mockResolvedValueOnce('456'),
    };

    const cmabService = new DefaultCmabService({
      cmabCache: getMockSyncCache(),
      cmabClient: mockCmabClient,
    });

    const projectConfig = mockProjectConfig();
    const userContext = mockUserContext('user123', {
      country: 'US',
      age: '25',
      language: 'en',
      gender: 'male'
    });

    const variation1 = await cmabService.getDecision(projectConfig, userContext, '1234', {});

    const variation2 = await cmabService.getDecision(projectConfig, userContext, '1234', {
      [OptimizelyDecideOption.INVALIDATE_USER_CMAB_CACHE]: true,
    });

    const variation3 = await cmabService.getDecision(projectConfig, userContext, '1234', {});

    expect(variation1.variationId).toEqual('123');
    expect(variation2.variationId).toEqual('456');
    expect(variation1.cmabUuid).not.toEqual(variation2.cmabUuid);
    expect(variation3.variationId).toEqual('456');
    expect(variation2.cmabUuid).toEqual(variation3.cmabUuid);

    expect(mockCmabClient.fetchDecision).toHaveBeenCalledTimes(2);
  });

  it('should serialize concurrent calls to getDecision with the same userId and ruleId', async () => {
    const nCall = 10;
    let currentVar = 123;
    const fetchPromises = Array.from({ length: nCall }, () => resolvablePromise());

    let callCount = 0;
    const mockCmabClient = {
      fetchDecision: vi.fn().mockImplementation(async () => {
        const variation = `${currentVar++}`;
        await fetchPromises[callCount++];
        return variation; 
      }),
    };

    const cmabService = new DefaultCmabService({
      cmabCache: getMockSyncCache(),
      cmabClient: mockCmabClient,
    });

    const projectConfig = mockProjectConfig();
    const userContext = mockUserContext('user123', {});

    const resultPromises = [];
    for (let i = 0; i < nCall; i++) {
      resultPromises.push(cmabService.getDecision(projectConfig, userContext, '1234', {}));
    }

    await exhaustMicrotasks();

    expect(mockCmabClient.fetchDecision).toHaveBeenCalledTimes(1);
    
    for(let i = 0; i < nCall; i++) {
      fetchPromises[i].resolve('');
      await exhaustMicrotasks();
      const result = await resultPromises[i];
      expect(result.variationId).toBe('123');
      expect(mockCmabClient.fetchDecision).toHaveBeenCalledTimes(1);
    }
  });

  it('should not serialize calls to getDecision with different userId or ruleId', async () => {
    let currentVar = 123;
    const mockCmabClient = {
      fetchDecision: vi.fn().mockImplementation(() => Promise.resolve(`${currentVar++}`)),
    };

    const cmabService = new DefaultCmabService({
      cmabCache: getMockSyncCache(),
      cmabClient: mockCmabClient,
    });

    const projectConfig = mockProjectConfig();
    const userContext1 = mockUserContext('user123', {});
    const userContext2 = mockUserContext('user456', {});

    const resultPromises = [];
    resultPromises.push(cmabService.getDecision(projectConfig, userContext1, '1234', {}));
    resultPromises.push(cmabService.getDecision(projectConfig, userContext1, '5678', {}));
    resultPromises.push(cmabService.getDecision(projectConfig, userContext2, '1234', {}));
    resultPromises.push(cmabService.getDecision(projectConfig, userContext2, '5678', {}));

    await exhaustMicrotasks();

    expect(mockCmabClient.fetchDecision).toHaveBeenCalledTimes(4);

    for(let i = 0; i < resultPromises.length; i++) {
      const result = await resultPromises[i];
      expect(result.variationId).toBe(`${123 + i}`);
    }
  });
});
