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

import { LoggerFacade } from "../../../logging/logger";
import { IOptimizelyUserContext } from "../../../optimizely_user_context";
import { ProjectConfig } from "../../../project_config/project_config"
import { OptimizelyDecideOption, UserAttributes } from "../../../shared_types"
import { Cache, CacheWithRemove } from "../../../utils/cache/cache";
import { CmabClient } from "./cmab_client";
import { v4 as uuidV4 } from 'uuid';
import murmurhash from "murmurhash";
import { DecideOptionsMap } from "..";

export type CmabDecision = {
  variationId: string,
  cmabUuid: string,
}
 
export interface CmabService {
  /**
  * Get variation id for the user
  * @param  {IOptimizelyUserContext}          userContext
  * @param  {string}                         ruleId 
  * @param  {OptimizelyDecideOption[]}       options
  * @return {Promise<CmabDecision>}          
  */
  getDecision(
    projectConfig: ProjectConfig,
    userContext: IOptimizelyUserContext,
    ruleId: string,
    options: DecideOptionsMap,
  ): Promise<CmabDecision>
}

export type CmabCacheValue = {
  attributesHash: string,
  variationId: string,
  cmabUuid: string,
}

export type CmabServiceOptions = {
  logger?: LoggerFacade;
  cmabCache: CacheWithRemove<CmabCacheValue>;
  cmabClient: CmabClient;
}

export class DefaultCmabService implements CmabService {
  private cmabCache: CacheWithRemove<CmabCacheValue>;
  private cmabClient: CmabClient;
  private logger?: LoggerFacade;

  constructor(options: CmabServiceOptions) {
    this.cmabCache = options.cmabCache;
    this.cmabClient = options.cmabClient;
    this.logger = options.logger;
  }

  async getDecision(
    projectConfig: ProjectConfig,
    userContext: IOptimizelyUserContext,
    ruleId: string,
    options: DecideOptionsMap,
  ): Promise<CmabDecision> {
    const filteredAttributes = this.filterAttributes(projectConfig, userContext, ruleId);

    if (options[OptimizelyDecideOption.IGNORE_CMAB_CACHE]) {
      return this.fetchDecision(ruleId, userContext.getUserId(), filteredAttributes);
    }

    if (options[OptimizelyDecideOption.RESET_CMAB_CACHE]) {
      this.cmabCache.reset();
    }

    const cacheKey = this.getCacheKey(userContext.getUserId(), ruleId);

    if (options[OptimizelyDecideOption.INVALIDATE_USER_CMAB_CACHE]) {
      this.cmabCache.remove(cacheKey);
    }

    const cachedValue = await this.cmabCache.lookup(cacheKey);

    const attributesJson = JSON.stringify(filteredAttributes, Object.keys(filteredAttributes).sort());
    const attributesHash = String(murmurhash.v3(attributesJson));

    if (cachedValue) {
      if (cachedValue.attributesHash === attributesHash) {
        return { variationId: cachedValue.variationId, cmabUuid: cachedValue.cmabUuid };
      } else {
        this.cmabCache.remove(cacheKey);
      }
    }

    const variation = await this.fetchDecision(ruleId, userContext.getUserId(), filteredAttributes);
    this.cmabCache.save(cacheKey, { 
      attributesHash,
      variationId: variation.variationId,
      cmabUuid: variation.cmabUuid,
    });

    return variation;
  }

  private async fetchDecision(
    ruleId: string,
    userId: string,
    attributes: UserAttributes,
  ): Promise<CmabDecision> {
    const cmabUuid = uuidV4();
    const variationId = await this.cmabClient.fetchDecision(ruleId, userId, attributes, cmabUuid);
    return { variationId, cmabUuid };
  }

  private filterAttributes(
    projectConfig: ProjectConfig,
    userContext: IOptimizelyUserContext,
    ruleId: string
  ): UserAttributes {
    const filteredAttributes: UserAttributes = {};
    const userAttributes = userContext.getAttributes();

    const experiment = projectConfig.experimentIdMap[ruleId];
    if (!experiment || !experiment.cmab) {
      return filteredAttributes;
    }

    const cmabAttributeIds = experiment.cmab.attributeIds;
    
    cmabAttributeIds.forEach((aid) => {
      const attribute = projectConfig.attributeIdMap[aid];
      
      if (userAttributes.hasOwnProperty(attribute.key)) {
        filteredAttributes[attribute.key] = userAttributes[attribute.key];
      }
    });

    return filteredAttributes;
  }

  private getCacheKey(userId: string, ruleId: string): string {
    const len = userId.length;
    return `${len}-${userId}-${ruleId}`;
  }
}
