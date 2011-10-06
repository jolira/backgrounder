var backgrounder = require("../lib/backgrounder");
var worker = backgrounder.spawn(__dirname + "/multi-worker.js", {
    "children-count" : 5
}, function(){
    console.log("Master: Config finished,");
    var counter = 0;

    for(var idx=0; idx<100; idx++) {
        worker.send({}, function(arg1, arg2, arg3, arg4, arg5) {
            console.log("Master: client called the callback with %s arguments:",
                arguments.length, arg1, arg2, arg3, arg4, arg5);
            if (++counter === 100) {
                worker.terminate();
            }
        });
}});

