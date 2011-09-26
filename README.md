Backgrounder
====================================================

Yet another wrapper around the [``child_process.spawn``](http://nodejs.org/docs/v0.4.12/api/all.html#child_process.spawn) call supported by Node.js.

There are a lot of other, similar libraries for Node.js out there, that do similar things ([as this is a very common problem](http://stackoverflow.com/questions/3809165/long-running-computations-in-node-js)). This particular one fits my problem set, as it

* Allows for multiple backrounds works to be created.
* Allows users to implement code that is compatible with the [``child_process.fork``](http://nodejs.org/docs/v0.5.6/api/all.html#child_process.fork) call available with v0.5.*.
* Child processes can use ``console.log`` and other console function; the logs are printed by the main process.

Here is example for a master:

```
var backgrounder = require("backgrounder");
var worker = backgrounder.spawn(__dirname + "/worker.js");
worker.on("message", function(message) {
    console.log("Master: received message ", message);
});
var counter = 0;
worker.on("idle", function(message) {
    switch (counter ++) {
    case 0:
        console.log("Master: worker idle after configuration");
        worker.send({
            "title": "hello world!",
            "flag": true
        });
        return;
    case 1:
        console.log("Master: worker idle after messge, calling terminte...");
        worker.terminate();
        return;
    default:
        console.error("Master: unexpected idle message ", counter, message);
    }
});
worker.config({
    "primaryDirective": "don't interfere",
    "overdrive": true
});
```

Here is a sample for a worker that shows how to process messages from there master:

process.on('config', function(config) {
    console.log('Worker: received configuration ', config);
});
process.on('message', function(message) {
    console.log('Worker: echoing ', message);
    process.send({
        "Worker received": message
    });
});
process.on('terminate', function() {
    console.log('Worker: asked to terminate');
});
console.log('Worker: Started!');
```

The output when running the master looks like this:

```
jfk@graz:~/workspace/1/backgrounder$ node examples/master.js
Worker: Started!
Worker: received configuration  { primaryDirective: 'don\'t interfere',
  overdrive: true }
Master: worker idle after configuration
Worker: echoing  { title: 'hello world!', flag: true }
Master: received message  { 'Worker received': { title: 'hello world!', flag: true } }
Master: worker idle after messge, calling terminte...
Worker: asked to terminate
```
