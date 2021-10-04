/**
 * Copyright 2021 Optimizely
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
 import { createForwardingEventProcessor } from './forwarding_event_processor';
 import * as buildEventV1 from '../../core/event_builder/build_event_v1';
  
 describe('lib/plugins/event_processor/forwarding_event_processor', function() {
  var sandbox = sinon.sandbox.create();
  var ep;  
  var dispatcherSpy;
  var sendNotificationsSpy;

  beforeEach(() => {
    var dispatcher = {
      dispatchEvent: () => {},
    };
    var notificationCenter = {
      sendNotifications: () => {},
    }
    dispatcherSpy = sandbox.spy(dispatcher, 'dispatchEvent');
    sendNotificationsSpy = sandbox.spy(notificationCenter, 'sendNotifications');
    sandbox.stub(buildEventV1, 'formatEvents').returns({ dummy: "event" });
    ep = createForwardingEventProcessor(dispatcher, notificationCenter);
    ep.start();
  });

  afterEach(() => {
    sandbox.restore();
  });
  
  it('should dispatch event immediately when process is called', () => {
    ep.process({ dummy: 'event' });
    sinon.assert.calledWithExactly(dispatcherSpy, { dummy: 'event' }, sinon.match.func);
    sinon.assert.calledOnce(sendNotificationsSpy);
  });

  it('should return a resolved promise when stop is called', (done) => {
    ep.stop().then(done);
  });  
 });
