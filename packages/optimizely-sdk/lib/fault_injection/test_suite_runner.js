var Mocha = require('mocha'),
    recursive = require("recursive-readdir"),
    fs = require("fs"),
    faultInjector = require("./faultinjection_manager");

// When we throw exceptions on some spots, it crashes a few tests, therefore all tests dont run
// Hardcoding the total number of tests so that results dont mislead in percentage.
// TODO: make it dynamic by taking the value of first test suite run which does not throw any exception.
var totalTests = 369;

function runTestSuite(spotName) {

    faultInjector.setActiveInjectionSpot(spotName);

    var mocha = new Mocha();

    recursive("lib", function (err, files) {

        files.forEach(function (file) {
            if (file.substr(-9) === '.tests.js') {
                mocha.addFile(file);
            }
        });

        var passCount = 0, failCount = 0, testCount = 0;

        var runner = mocha.run();
        runner.addListener('pass', function () { passCount++; });
        runner.addListener('fail', function () { failCount++; });
        runner.addListener('test', function () { testCount++; });

        runner.addListener('end', function () {
            var passPercentage = Math.round((passCount/totalTests) * 10000) / 100;
            var failPercentage = Math.round((failCount/totalTests) * 10000) / 100;
            var resultRow = passPercentage + ","
                            + failPercentage + ","
                            + passCount + ","
                            + failCount + ","
                            + testCount + ","
                            + spotName;
            fs.appendFileSync("results.csv", resultRow + "\n");
            process.send(resultRow);
            process.exit();
        });
    });
}

process.on('message', function (message) {
    runTestSuite(message.spot);
});