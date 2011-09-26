var util = require("util");

process.on('message', function(message) {
    console.log('Worker received a message from the master and is sending it back: ', message);
    process.send({
        "client received": message
    });
});
process.on('config', function(config) {
    console.log('Worker received the following configuration from the master: ', config);
});
process.on('terminate', function() {
    console.log('Worker received a request to termine from the master');
});
//
// Let the users know that we are started. Logs are forwarded to the parent process and printed there.
//
console.log('Started the worker');
