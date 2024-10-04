/**
 * Copyright 2023-2024, Optimizely
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
import { describe, beforeEach, it, expect, vi, MockInstance } from 'vitest';

import sendBeaconDispatcher, { Event } from '../lib/plugins/event_dispatcher/send_beacon_dispatcher';

describe('dispatchEvent', function() {
  let sendBeaconSpy:  MockInstance<typeof navigator.sendBeacon>;

  beforeEach(() => {
    sendBeaconSpy = vi.fn();
    navigator.sendBeacon = sendBeaconSpy as any;
  });

  it('should call sendBeacon with correct url, data and type', async () => {
    var eventParams = { testParam: 'testParamValue' };
    var eventObj: Event = {
      url: 'https://cdn.com/event',
      httpVerb: 'POST',
      params: eventParams,
    };

    sendBeaconSpy.mockReturnValue(true);

    sendBeaconDispatcher.dispatchEvent(eventObj)

    const [url, data] = sendBeaconSpy.mock.calls[0];
    const blob = data as Blob;

    const reader = new FileReader();
    reader.readAsBinaryString(blob);

    const sentParams = await new Promise((resolve) => {
      reader.onload = () => {
        resolve(reader.result);
      };
    });


    expect(url).toEqual(eventObj.url);
    expect(blob.type).toEqual('application/json');
    expect(sentParams).toEqual(JSON.stringify(eventObj.params));
  });

  it('should resolve the response on sendBeacon success', async () => {
    const eventParams = { testParam: 'testParamValue' };
    const eventObj: Event = {
      url: 'https://cdn.com/event',
      httpVerb: 'POST',
      params: eventParams,
    };

    sendBeaconSpy.mockReturnValue(true);
    await expect(sendBeaconDispatcher.dispatchEvent(eventObj)).resolves.not.toThrow();
  });

  it('should reject the response on sendBeacon success', async () => {
    const eventParams = { testParam: 'testParamValue' };
    const eventObj: Event = {
      url: 'https://cdn.com/event',
      httpVerb: 'POST',
      params: eventParams,
    };

    sendBeaconSpy.mockReturnValue(false);
    await expect(sendBeaconDispatcher.dispatchEvent(eventObj)).rejects.toThrow();
  });
});
