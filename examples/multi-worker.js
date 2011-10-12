var http = require('http');
var loaded = 0;

/**
 * There really is no configuration here, but it is essential that we are calling the callback functtion.
 * Failing to call the callback function will prevent the master from confinuing
 */
process.on('config', function(message, callback) {
    console.log('Worker: Configured %s!', process.id);
    callback();
});

process.on('message', function(message, callback) {
    var options = {
      host: 'jolira.github.com',
      port: 80,
      path: '/backgrounder/'
    };

    http.get(options, function(res) {
        callback(process.id, "status-code:", res.statusCode, "loaded", ++loaded);
    }).on('error', function(e) {
        callback("error:", e);
    });
});

process.on('terminate', function(message, callback) {
    console.log("Worker: %s Loaded", process.id, ++loaded);
});
