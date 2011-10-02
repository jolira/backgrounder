//
// Deal with configuration messages sent from the master
//
process.on('config', function(config) {
    console.log('Worker: received configuration ', config);
});
//
// Set up a message handler from messages sent from the master
//
process.on('message', function(message, callback) {
    console.log('Worker: echoing ', message);

    if (callback) {
        process.nextTick(function(){
            callback("received", "this", message);
        });
        return;
    }

    process.send({
        "Worker received": message
    });
});
//
// Set up a handler that lets the user know that we have been asked to terminate
//
process.on('terminate', function() {
    console.log('Worker: asked to terminate');
});
//
// Let the users know that we are started. Logs are forwarded to the parent process and printed there.
//
console.log('Worker: Started!');
