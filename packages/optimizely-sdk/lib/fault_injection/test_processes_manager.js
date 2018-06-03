var cp = require('child_process'),
    fs = require('fs'),
    faultInjector = require("./faultinjection_manager");

var spots = faultInjector.getAllExceptionSpots();
var currentSpotIndex = -1;

var runAllTestSpots = function () {
    // Rewrite results file with the CSV header row
    var headerRow = "Pass % , Fail%, Pass, Fail, Total, Spot"
    fs.writeFileSync("results.csv", "Pass % , Fail%, Pass, Fail, Total, Spot" + "\n");
    console.log(headerRow);
    runSuiteForSpot();
};

var runSuiteForSpot = function () {
    // return if all spots are done.
    if( ++currentSpotIndex >= spots.length ) return;

    // Keeping the child silent so it doesnt bombard the logs with the mocha messages.
    var child = cp.fork("lib/fault_injection/test_suite_runner.js", [], {silent: true});
    child.on('message', function (message) {
        console.log(message);
    });
    child.on('error', function (e) {
        console.log("error in child process");
    });
    child.on('disconnect', function () {
        // start next test suite run when the previous exits.
        runSuiteForSpot();
    });
    child.send({spot:spots[currentSpotIndex]});
};

runAllTestSpots();