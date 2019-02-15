var optly = require('../index.node');

var datafileStringExpDisabled = '{"version": "4", "rollouts": [], "typedAudiences": [], "anonymizeIP": false, "projectId": "13355390152", "variables": [], "featureFlags": [], "experiments": [], "audiences": [{"conditions": "[\\"or\\", {\\"match\\": \\"exact\\", \\"name\\": \\"$opt_dummy_attribute\\", \\"type\\": \\"custom_attribute\\", \\"value\\": \\"$opt_dummy_value\\"}]", "id": "$opt_dummy_audience", "name": "Optimizely-Generated Audience for Backwards Compatibility"}], "groups": [], "attributes": [{"id": "13354750384", "key": "my_attr"}], "botFiltering": false, "accountId": "4879520872", "events": [{"experimentIds": [], "id": "13348940610", "key": "my_evt"}], "revision": "62"}';

var managedInstance = optly.createInstance({
  datafile: datafileStringExpDisabled,
  sdkKey: '9LCprAQyd1bs1BBXZ3nVji',
  eventDispatcher: {
    dispatchEvent: function() {
    },
  },
  logger: {
    log: function(level, msg) {
      // console.log('--- ', msg);
    },
  },
});

console.log('instance is constructed');

managedInstance.onReady.then(function() {
  console.log('instance is ready');
  var variation = managedInstance.activate('my_exp', 'user1', {
    my_attr: 'x'
  });
  console.log('variation: ', variation);

  managedInstance.on('datafileUpdate', function() {
    console.log('datafile updated!');
    variation = managedInstance.activate('my_exp', 'user1', {
      my_attr: 'x'
    });
    console.log('variation: ', variation);
  });
});

var stdin = process.stdin;
stdin.setRawMode( true );
stdin.resume();
stdin.setEncoding( 'utf8' );
stdin.on( 'data', function( key ){
  // ctrl-c ( end of text )
  if ( key === '\u0003' ) {
    process.exit();
  }
  if (key === 's') {
    console.log('Stopping managed instance');
    managedInstance.close();
  }
});
