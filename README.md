Backgrounder
====================================================

This is a simple wrapper around the [``child_process.spawn``](http://nodejs.org/docs/v0.4.12/api/all.html#child_process.spawn) call supported by Node.js.

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
```