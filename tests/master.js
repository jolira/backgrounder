var util = require("util");
var backgrounder = require("../lib/backgrounder");
var worker = backgrounder.spawn("./worker");

worker.on("message", function(message) {
    console.log(util.inspect(message, false, 100));
});

worker.send({
    "title": "hello world!",
    "flag": true
});
