var http = require('http');
var id = Math.random()*10000000000000000;

process.on('message', function(message, callback) {
    var options = {
      host: 'www.google.com',
      port: 80,
      path: '/index.html'
    };

    http.get(options, function(res) {
        callback(id, "status-code:", res.statusCode);
    }).on('error', function(e) {
        callback("error:", e);
    });
});

console.log('Worker: Started %s!', id);
