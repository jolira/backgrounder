var backgrounder = require("../lib/backgrounder");
var worker = backgrounder.spawn(__dirname + "/multi-worker.js", {
    "children-count" : 5
});

var counter = 0;

for(var idx=0; idx<10; idx++) {
    worker.send({}, function(arg1, arg2, arg3) {
        console.log("Master: client called the callback with %s arguments:",
            arguments.length, arg1, arg2, arg3);
        if (++counter === 10) {
            worker.terminate();
        }
    });
}