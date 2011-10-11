var backgrounder = require("../lib/backgrounder");
var worker = backgrounder.spawn(__dirname + "/restarting-multi-worker.js", {
    "children-count" : 5,
    "auto-restart" : true
}, function(){
    console.log("Master: Config finished,");
    var counter = 0;

    var sender = function() {
        for(var idx=0; idx<5; idx++) {
            worker.send({}, function(arg1, arg2, arg3, arg4, arg5) {
                console.log("Master: client called the callback with %s arguments:",
                    arguments.length, arg1, arg2, arg3, arg4, arg5);
                if (++counter === 100) {
                    worker.terminate();
                } else {
                    sender();
                }

            });
        }
    };
    sender();
});

