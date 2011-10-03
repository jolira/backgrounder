var http = require('http');
var id = process.pid;

process.on('message', function(message, callback) {
    var options = {
      host: 'jolira.github.com',
      port: 80,
      path: '/backgrounder/'
    };

    http.get(options, function(res) {
        callback(id, "status-code:", res.statusCode);
    }).on('error', function(e) {
        callback("error:", e);
    });
});

console.log('Worker: Started %s!', id);
