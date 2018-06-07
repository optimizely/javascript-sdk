module.exports = function (grunt) {
    grunt.initConfig({
        jsdoc2md: {
            api: {
                src: ['lib/index.node.js', 'lib/index.browser.js', 'lib/optimizely/*.js', 'lib/types.js'],
                dest: 'api.md',
            },
        },
        karma: {
            unit: {
                configFile: 'karma.bs.conf.js',
                singleRun: true,
                reporters: 'progress',
                runnerPort: 9998
            }
        }
    });

    require('load-grunt-tasks')(grunt);

    grunt.registerTask('doc', ['jsdoc2md']);
    grunt.registerTask('default', ['karma']);
};
