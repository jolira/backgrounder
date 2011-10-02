var backgrounder = require("../lib/backgrounder");

backgrounder.spawn(__dirname + "/simple-worker.js", function(worker){
    worker.send({
        "company": "jolira"
    }, function(arg1, arg2, arg3) {
        console.log("Master: client called the callback with %s arguments:",
            arguments.length, arg1, arg2, arg3);
        worker.terminate();
    });
});
