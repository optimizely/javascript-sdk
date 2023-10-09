/**
 * Copyright 2023, Optimizely
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
import sendBeaconDispatcher, { Event } from '../lib/plugins/event_dispatcher/send_beacon_dispatcher';
import { anyString, anything, capture, instance, mock, reset, when } from 'ts-mockito';

describe('dispatchEvent', function() {
  const mockNavigator = mock<Navigator>();

  afterEach(function() {
    reset(mockNavigator);
  });

  it('should call sendBeacon with correct url, data and type', async () => {
    var eventParams = { testParam: 'testParamValue' };
    var eventObj: Event = {
      url: 'https://cdn.com/event',
      httpVerb: 'POST',
      params: eventParams,
    };

    when(mockNavigator.sendBeacon(anyString(), anything())).thenReturn(true);
    const navigator = instance(mockNavigator);
    if (!global.navigator) {
      global.navigator = navigator;
    }

    global.navigator.sendBeacon = navigator.sendBeacon;

    sendBeaconDispatcher.dispatchEvent(eventObj, () => {});

    const [url, data] = capture(mockNavigator.sendBeacon).last();
    const blob = data as Blob;

    const reader = new FileReader();
    reader.readAsBinaryString(blob);

    const sentParams = await new Promise((resolve) => {
      reader.onload = () => {``
        resolve(reader.result);
      };
    });


    expect(url).toEqual(eventObj.url);
    expect(blob.type).toEqual('application/json');
    expect(sentParams).toEqual(JSON.stringify(eventObj.params));
  });

  it('should call call callback with status 200 on sendBeacon success', (done) => {
    var eventParams = { testParam: 'testParamValue' };
    var eventObj: Event = {
      url: 'https://cdn.com/event',
      httpVerb: 'POST',
      params: eventParams,
    };

    when(mockNavigator.sendBeacon(anyString(), anything())).thenReturn(true);
    const navigator = instance(mockNavigator);
    global.navigator.sendBeacon = navigator.sendBeacon;

    sendBeaconDispatcher.dispatchEvent(eventObj, (res: { statusCode: number }) => {
      try {
        expect(res.statusCode).toEqual(200);
        done();
      } catch(err) {
        done(err);
      }
    });
  });

  it('should call call callback with status 200 on sendBeacon failure', (done) => {
    var eventParams = { testParam: 'testParamValue' };
    var eventObj: Event = {
      url: 'https://cdn.com/event',
      httpVerb: 'POST',
      params: eventParams,
    };

    when(mockNavigator.sendBeacon(anyString(), anything())).thenReturn(false);
    const navigator = instance(mockNavigator);
    global.navigator.sendBeacon = navigator.sendBeacon;

    sendBeaconDispatcher.dispatchEvent(eventObj, (res: { statusCode: number }) => {
      try {
        expect(res.statusCode).toEqual(500);
        done();
      } catch(err) {
        done(err);
      }
    });
  });
});
