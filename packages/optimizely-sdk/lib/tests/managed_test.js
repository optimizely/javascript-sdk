var optly = require('../index.node');

var managedInstance = optly.createInstance({
  sdkKey: '9LCprAQyd1bs1BBXZ3nVji',
  eventDispatcher: {
    dispatchEvent: function() {
    },
  },
  logger: {
    log: function() {
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
