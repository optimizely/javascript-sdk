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
import OptimizelyUserContext from "../../../optimizely_user_context"
import { ProjectConfig } from "../../../project_config/project_config"
import { OptimizelyDecideOption, UserAttributes } from "../../../shared_types"
import { Cache } from "../../../utils/cache/cache";
import { CmabClient } from "./cmab_client";
import { v4 as uuidV4 } from 'uuid';
import murmurhash from "murmurhash";

export type CmabDecision = {
  variationId: string,
  cmabUuid: string,
}
 
export interface CmabService {
  /**
  * Get variation id for the user
  * @param  {OptimizelyUserContext}          userContext
  * @param  {string}                         experimentId 
  * @param  {OptimizelyDecideOption[]}       options
  * @return {Promise<CmabDecision>}          
  */
  getDecision(
    projectConfig: ProjectConfig,
    userContext: OptimizelyUserContext,
    experimentId: string,
    options: OptimizelyDecideOption[]
  ): Promise<CmabDecision>
}

export type CmabCacheValue = {
  attributesHash: string,
  variationId: string,
  cmabUuid: string,
}

export type CmabServiceOptions = {
  logger?: LoggerFacade;
  cmabCache: Cache<CmabCacheValue>;
  cmabClient: CmabClient;
}

export class DefaultCmabService implements CmabService {
  private cmabCache: Cache<CmabCacheValue>;
  private cmabClient: CmabClient;
  private logger?: LoggerFacade;

  constructor(options: CmabServiceOptions) {
    this.cmabCache = options.cmabCache;
    this.cmabClient = options.cmabClient;
    this.logger = options.logger;
  }

  async getDecision(
    projectConfig: ProjectConfig,
    userContext: OptimizelyUserContext,
    ruleId: string,
    options: OptimizelyDecideOption[]
  ): Promise<CmabDecision> {
    const filteredAttributes = this.filterAttributes(projectConfig, userContext, ruleId);

    if (options.includes(OptimizelyDecideOption.IGNORE_CMAB_CACHE)) {
      return this.fetchVariation(ruleId, userContext.getUserId(), filteredAttributes);
    }

    if (options.includes(OptimizelyDecideOption.RESET_CMAB_CACHE)) {
      this.cmabCache.clear();
    }

    const cacheKey = this.getCacheKey(userContext.getUserId(), ruleId);

    if (options.includes(OptimizelyDecideOption.INVALIDATE_USER_CMAB_CACHE)) {
      this.cmabCache.remove(cacheKey);
    }

    const cachedValue = await this.cmabCache.get(cacheKey);
    const attributesHash = String(murmurhash.v3(JSON.stringify(filteredAttributes)));

    if (cachedValue) {
      if (cachedValue.attributesHash === attributesHash) {
        return { variationId: cachedValue.variationId, cmabUuid: cachedValue.cmabUuid };
      } else {
        this.cmabCache.remove(cacheKey);
      }
    }

    const variation = await this.fetchVariation(ruleId, userContext.getUserId(), filteredAttributes);
    this.cmabCache.set(cacheKey, { 
      attributesHash,
      variationId: variation.variationId,
      cmabUuid: variation.cmabUuid,
    });

    return variation;
  }

  private async fetchVariation(
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
    userContext: OptimizelyUserContext,
    ruleId: string
  ): UserAttributes {
    const filteredAttributes: UserAttributes = {};
    const attributes = userContext.getAttributes();

    const experiment = projectConfig.experimentIdMap[ruleId];
    if (!experiment || !experiment.cmab) {
      return filteredAttributes;
    }

    const cmabAttributeIds = experiment.cmab.attributeIds;

    Object.keys(attributes).forEach((key) => {
      const attributeId = projectConfig.attributeKeyMap[key].id;
      if (cmabAttributeIds.includes(attributeId)) {
        filteredAttributes[key] = attributes[key];
      }
    });

    return filteredAttributes;
  }

  private getCacheKey(userId: string, ruleId: string): string {
    const len = userId.length;
    return `${len}-${userId}-${ruleId}`;
  }
}
