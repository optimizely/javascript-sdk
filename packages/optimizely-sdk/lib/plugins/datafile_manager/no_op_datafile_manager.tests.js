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
 import { assert } from 'chai';
 import { createNoOpDatafileManager } from './no_op_datafile_manager'; 
  
 describe('lib/plugins/datafile_manager/no_op_datafile_manager', function() { 
  var dfm = createNoOpDatafileManager();
  
  beforeEach(() => {
    dfm.start();
  });
  
  it('should return empty string when get is called', () => {
    assert.equal(dfm.get(), '');
  });

  it('should return a resolved promise when onReady is called', (done) => {
    dfm.onReady().then(done);
  });

  it('should return a resolved promise when stop is called', (done) => {
    dfm.stop().then(done);
  });

  it('should return an empty function when event listener is added', () => {    
    assert.equal(typeof(dfm.on('dummyEvent', () => {}, '')), 'function');
  });
 });
 