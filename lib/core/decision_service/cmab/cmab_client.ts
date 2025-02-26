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

import { OptimizelyError } from "../../../error/optimizly_error";
import { CMAB_FETCH_FAILED, INVALID_CMAB_FETCH_RESPONSE } from "../../../message/error_message";
import { UserAttributes } from "../../../shared_types";
import { runWithRetry } from "../../../utils/executor/backoff_retry_runner";
import { sprintf } from "../../../utils/fns";
import { RequestHandler } from "../../../utils/http_request_handler/http";
import { isSuccessStatusCode } from "../../../utils/http_request_handler/http_util";
import { BackoffController } from "../../../utils/repeater/repeater";
import { Producer } from "../../../utils/type";

export interface CmabClient {
  fetchVariation(
    experimentId: string,
    userId: string,
    attributes: UserAttributes,
    cmabUuid: string,
  ): Promise<string>
}

const CMAB_PREDICTION_ENDPOINT = 'https://prediction.cmab.optimizely.com/predict/%s';

export type RetryConfig = {
  maxRetries: number,
  backoffProvider?: Producer<BackoffController>;
}

export type CmabClientConfig = {
  requestHandler: RequestHandler,
  retryConfig?: RetryConfig;
}

export class DefaultCmabClient implements CmabClient {
  private requestHandler: RequestHandler;
  private retryConfig?: RetryConfig;

  constructor(config: CmabClientConfig) {
    this.requestHandler = config.requestHandler;
    this.retryConfig = config.retryConfig;
  }

  async fetchVariation(
    experimentId: string,
    userId: string,
    attributes: UserAttributes,
    cmabUuid: string,
  ): Promise<string> {
    const url = sprintf(CMAB_PREDICTION_ENDPOINT, experimentId);

    const cmabAttributes = Object.keys(attributes).map((key) => ({
      id: key,
      value: attributes[key],
      type: 'custom_attribute',
    }));

    const body = {
      instances: [
        {
          visitorId: userId,
          experimentId,
          attributes: cmabAttributes,
          cmabUUID: cmabUuid,
        }
      ]
    }

    const variation = await (this.retryConfig ?
      runWithRetry(
        () => this.doFetch(url, JSON.stringify(body)),
        this.retryConfig.backoffProvider?.(),
        this.retryConfig.maxRetries,
      ).result : this.doFetch(url, JSON.stringify(body))
    );

    return variation;
  }

  private async doFetch(url: string, data: string): Promise<string> {
    const response = await this.requestHandler.makeRequest(
      url,
      { 'Content-Type': 'application/json' },
      'POST',
      data,
    ).responsePromise;

    if (!isSuccessStatusCode(response.statusCode)) {
      return Promise.reject(new OptimizelyError(CMAB_FETCH_FAILED, response.statusCode));
    }

    const body = JSON.parse(response.body);
    if (!this.validateResponse(body)) {
      return Promise.reject(new OptimizelyError(INVALID_CMAB_FETCH_RESPONSE));
    }

    return String(body.predictions[0].variation_id);
  }

  private validateResponse(body: any): boolean {
    return body.predictions && body.predictions.length > 0 && body.predictions[0].variation_id;
  }
}
