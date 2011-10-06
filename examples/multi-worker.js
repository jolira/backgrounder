var http = require('http');
var id = process.pid;
var loaded = 0;

/**
 * There really is no configuration here, but it is essential that we are calling the callback functtion.
 * Failing to call the callback function will prevent the master from confinuing
 */
process.on('config', function(message, callback) {
    callback();
});

process.on('message', function(message, callback) {
    var options = {
      host: 'jolira.github.com',
      port: 80,
      path: '/backgrounder/'
    };

    http.get(options, function(res) {
        callback(id, "status-code:", res.statusCode, "loaded", ++loaded);
    }).on('error', function(e) {
        callback("error:", e);
    });
});

process.on('terminate', function(message, callback) {
    console.log("Worker: %s Loaded", id, ++loaded);
});

console.log('Worker: Started %s!', id);
