module.exports = function (grunt) {
    grunt.initConfig({
        karma: {
            unit: {
                configFile: 'karma.conf.js',
                singleRun: true,
                reporters: 'progress',
                runnerPort: 9998
            }
        }
    });

    require('load-grunt-tasks')(grunt);

    grunt.registerTask('default', ['karma']);
};
