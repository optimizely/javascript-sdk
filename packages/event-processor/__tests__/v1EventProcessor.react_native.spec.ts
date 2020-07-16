/**
 * Copyright 2020, Optimizely
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
/// <reference types="jest" />

describe('LogTierV1EventProcessorReactNative', () => {

  describe('VERIFYING EXISTING EVENT PROCESSOR TESTS ON REACT NATIVE EVENT PROCESSOR', () => {
    // Copy all the existing browser/node event processor test here and modify them to work.
    // They wont work as they are because we have changed a lot of functions to asyn for react native EP.
  })  

  describe('Sequence', () => {
    it('should dispatch pending events in correct sequence', () => {
      // Add Pending events to the store and that try dispatching them and check the sequence
    })
    it('should dispatch new event after pending events', () => {
      // Add pending events to the store and 
    })
  })

  describe('Retry Pending Events', () => {
    describe('App start', () => {
      it('should dispatch all the pending events in correct order', () => {
        // store some events in the store.
        // call start
        // verify if all dispatched
        // verify they dispatched in correct order
      })

      it('should process all the events left in buffer when the app closed last time', () => {
        // add events to buffer store
        // call start
        // wait for the flush interval
        // verify correct event was dispatched based on the buffer
      })

      it('should dispatch pending events first and then process events in buffer store', () => {
        
      })
    })
    
    describe('When a new event is dispatched', () => {
      it('should dispatch all the pending events first', () => {

      })

      it('should dispatch pending events and new event in correct order', () => {
        
      })

      it('should skip dispatching subsequent events if an event fails to dispatch', () => {
        
      })
    })

    describe('When internet connection is restored', () => {
      it('should dispatch all the pending events in correct order when internet connection is restored', () => {

      })

      it('should not dispatch duplicate events if internet is lost and restored twice in a short interval', () => {

      })
    })
  })

  describe('Race Conditions', () => {
    it('should not dispatch pending events twice if retyring is triggered simultenously from internet connection and new event', () => {
      
    })

    it('should dispatch pending events in correct order if retyring is triggered from multiple sources simultenously', () => {

    })
  })

  describe('stop', () => {
    // Add tests to make sure stop behaves correctly
  })
})
