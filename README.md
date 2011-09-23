Backgrounder
====================================================

Yet another wrapper around the [``child_process.spawn``](http://nodejs.org/docs/v0.4.12/api/all.html#child_process.spawn) call supported by Node.js.

There are a lot of other, similar libraries for Node.js out there, that do similar things ([as this is a very common problem](http://stackoverflow.com/questions/3809165/long-running-computations-in-node-js)). This particular one fits my problem set, as it

* Allows for multiple backrounds works to be created.
* Uses "require" to manage the code in the sub-modules.
* Allows users to implement code that is compatible with the [``child_process.fork``](http://nodejs.org/docs/v0.5.6/api/all.html#child_process.fork) call available with v0.5.*.

Here is exampe for a master:

```
var util = require("util");
var backgrounder = require("backgrounder");
var worker = backgrounder.spawn("./worker");

worker.on("message", function(message) {
    console.log(util.inspect(message, false, 100));
});

worker.send({
    "title": "hello world!",
    "flag": true
});
```

This could be the code of the client:

```
var util = require("util");

console.log('Started the working');

process.on('message', function(message) {
    console.log('Worker received: %s', util.inspect(message, false, 100));

    process.send({
        "received": message
    });
});
```