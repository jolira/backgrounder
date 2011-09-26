var util = require("util");
var backgrounder = require("../lib/backgrounder");
//
// Spawn the worker in a backround proccess
//
var worker = backgrounder.spawn(__dirname + "/worker.js");
//
// For this demo, let's just print any message we are receiving from the worker
//
worker.on("message", function(message) {
    console.log(util.inspect(message, false, 100));
});
//
// Process messages that indicate that the workder has become idle. Both worker.config as well as
// worker.send messages result in "idle" messages from the worker when the processing of the messages
// is complete.
//
var counter = 0;
worker.on("idle", function(message) {
    if (0 === counter ++) {
        console.log("configuration completed");
        return;
    }

    worker.terminate();
});
//
// This is optional, but some workers need to be configured. This call sends a message, which triggers
// a "config" event in the client.
//
worker.config({
    "primaryDirective": "don't interfere",
    "overdrive": true
});
//
// Send a message to the
//
worker.send({
    "title": "hello world!",
    "flag": true
});