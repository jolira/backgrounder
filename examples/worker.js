var util = require("util");
console.log('Started the worker');
process.on('message', function(message) {
    console.log('Worker received: %s', util.inspect(message, false, 100));
    process.send({
        "received": message
    });
});