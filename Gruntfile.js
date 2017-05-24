module.exports = function (grunt) {
    grunt.initConfig({
        eslint: {
            target: []
        },
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

    grunt.registerTask('default', ['eslint', 'karma']);
};
