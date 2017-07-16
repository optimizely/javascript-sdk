
class BaseStorageService {
  getItems() {
    return;
  }

  setItem(event) {
    return;
  }

  deleteItems(numItems) {
    return;
  }
}

class DefaultStorageService extends BaseStorageService {
  constructor() {
    super();
    this.EVENT_QUEUE = []; 
  }
  
  getItems(){
    return this.EVENT_QUEUE;  
  }
  
  setItem(event) {
    this.EVENT_QUEUE.push(event); 
  }
  
  deleteItems(numItems) {
   this.EVENT_QUEUE.splice(0, numItems); 
  }
}

var READYSTATE_COMPLETE = 4;
var IN_FLIGHT = false;

class BulkEventDispatcher {

  constructor(storageService) {
    if (!storageService) {
      this.storageService = new DefaultStorageService();
    } else {
      this.storageService = storageService;
    }

    // Poll storageService every 10 seconds
    setInterval(() => {
      flushQueue(this.storageService); 
    }, 10000);
  }

  dispatchEvent(eventObj, callback) {
    // write event to storage service
    var visitor = eventObj.params['visitors'][0]['visitor_id'];
    var attributes = eventObj.params['visitors'][0]['attributes'];
    var snapshot = eventObj.params['visitors'][0]['snapshots'][0];

    var item = {};
    item[visitor] = [attributes, snapshot]
    this.storageService.setItem(item);
    callback(eventObj)
  }
}

module.exports = BulkEventDispatcher;

  // Copy queue, built request, remove items from queue
  function flushQueue(storageService) {
    var events = storageService.getItems().slice();
    if (events.length === 0 || IN_FLIGHT) {
      return;
    }
    
    IN_FLIGHT = true;
    var numItems = events.length;
    var obj = buildRequestObject(events);
    makeRequest(storageService, obj, numItems);
  }

  function buildRequestObject(items) { 
    var user_map = {};
    var attributes_map = {};
    
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var key = Object.keys(item)[0];
        var attributes = item[key][0];
        var snapshot = item[key][1];
        if(user_map[key]) {
          user_map[key].push(snapshot);
        } else {
          user_map[key] = [snapshot];
          attributes_map[key] = attributes;
        }
    }
    
    var project_id = '5069330914';
    var account_id = '8495771143';

    var obj = {
      'visitors': [],
      'account_id': account_id,
      'client_name': 'javascript-sdk',
      'client_version': '1.4.3',
      'project_id': project_id,
    };

    for (var visitor in user_map) {
      var entry = {
        'visitor_id': visitor,
        'attributes': attributes_map[visitor],
        'snapshots': user_map[visitor]
      }
      obj['visitors'].push(entry)
    }
    return obj;
  }

  function makeRequest(storageService, requestObj, numItems) {
      var req = new XMLHttpRequest();
      var url= 'https://logx.optimizely.com/v1/events';
      req.open('POST', url, true);
      req.setRequestHeader('Content-Type', 'application/json');
      req.onreadystatechange = function() {
        if (req.readyState === READYSTATE_COMPLETE) { //if it fails, IN_FLIGHT = false, if it succeeds IN_FLIGHT = false and remove
          IN_FLIGHT = false;
          storageService.deleteItems(numItems);
          debugger;
        }
      };
      req.send(JSON.stringify(requestObj));
  }
