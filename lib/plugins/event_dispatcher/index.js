var _ = require('lodash/core');
var es6Promise = require('es6-promise').Promise;

var POST_METHOD = 'POST';
var GET_METHOD = 'GET';

module.exports = {
  /**
   * Sample event dispatcher implementation for tracking impression and conversions
   * Users of the SDK can provide their own implementation
   * @param  {Object} eventObj
   * @return {Promise<Object>}
   */
  dispatchEvent: function(eventObj) {
    var url = eventObj.url;
    var params = eventObj.params;

    if (eventObj.httpVerb === POST_METHOD) {
      return new es6Promise(function(resolve, reject) {

        var req = new XMLHttpRequest();
        req.open(POST_METHOD, url, true);
        req.setRequestHeader('Content-Type', 'application/json');
        req.addEventListener('load', function (evt) {
          var responseObj = evt.target.responseText;
          resolve(responseObj);
        });
        req.send(JSON.stringify(params));
      });
    } else {
      return new es6Promise(function (resolve, reject) {
        // add param for cors headers to be sent by the log endpoint
        url += '?wxhr=true';
        if (params) {
          url += '&' + toQueryString(params);
        }

        var req = new XMLHttpRequest();
        req.open(GET_METHOD, url, true);
        req.addEventListener('load', function (evt) {
          var responseObj = JSON.parse(evt.target.responseText);
          resolve(responseObj);
        });
        req.send();
      });
    }
  },
};

var toQueryString = function(obj) {
  return _.map(obj, function(v, k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(v);
  }).join('&');
};
