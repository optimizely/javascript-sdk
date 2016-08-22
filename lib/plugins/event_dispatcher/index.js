var _ = require('lodash/core');
var bluebird = require('bluebird');

module.exports = {
  /**
   * Sample event dispatcher implementation for tracking impression and conversions
   * Users of the SDK can provide their own implementation
   * @param  {string} url
   * @param  {Object} params
   * @return {Promise<Object>}
   */
  dispatchEvent: function(url, params) {
    return new bluebird(function(resolve, reject) {
      // add param for cors headers to be sent by the log endpoint
      url += '?wxhr=true';
      if (params) {
        url += '&' + toQueryString(params);
      }

      var req = new XMLHttpRequest();
      req.open('GET', url, true);
      req.addEventListener('load', function(evt) {
        var responseObj = JSON.parse(evt.target.responseText);
        resolve(responseObj);
      });
      req.send();
    });
  },
};

var toQueryString = function(obj) {
  return _.map(obj, function(v, k){
    return encodeURIComponent(k) + '=' + encodeURIComponent(v);
  }).join('&');
};
