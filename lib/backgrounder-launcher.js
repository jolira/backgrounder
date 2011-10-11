var util = require('util');
var events = require("events");
var _ = require("underscore");
//
// Format a log message; this code is adopted from node.js code.
//
function format(f) {
    var i;
    if (typeof f !== 'string') {
        var objects = [];
        for (i = 0; i < arguments.length; i++) {
            objects.push(util.inspect(arguments[i]));
        }
        return objects.join(' ');
    }
    i = 1;
    var args = arguments;
    var str = String(f).replace(/%[sdj]/g, function(x) {
        switch (x) {
        case '%s':
            return String(args[i++]);
        case '%d':
            return Number(args[i++]);
        case '%j':
            return JSON.stringify(args[i++]);
        default:
            return x;
        }
    });
    for (var len = args.length, x = args[i]; i < len; x = args[++i]) {
        if (x === null || typeof x !== 'object') {
            str += ' ' + x;
        }
        else {
            str += ' ' + util.inspect(x);
        }
    }

    return str;
}
//
// Deal with uncaught exceptions by just printing it to stderr. This error will be forwarded to the parent
// process and printed there.
//
process.on('uncaughtException', function(err) {
  console.log(err.stack);
});
//
// Send a log message to the parent process by wrapping it into a JSON message of type "console".
// This type of message is unwrapped on the server and printed to stdout.
//
function log(message) {
    var json = JSON.stringify({
        "type": "console",
        "content": message
    });
    process.stdout.write(json + '\n');
}
//
// Change the console.log to a message to that calls the local log message, which wraps the message in JSON and
// sends them to the server to be written to stdout there.
//
console.log = function() {
    var message = format.apply(this, arguments);
    log(message);
};
//
// Change the console.dir to a message to that calls the local log message, which wraps the message in JSON and
// sends them to the server to be written to stdout there.
//
console.dir = function(object) {
    var message = util.inspect(object);
    log(message);
};
//
// Reimplement timer functionality
//
var times = {};
console.time = function(label) {
    times[label] = Date.now();
};
console.timeEnd = function(label) {
    var duration = Date.now() - times[label];
    console.log('%s: %dms', label, duration);
};
//
// Buffer for processing messages
//
var buffer = "";
//
// Our private event emitter
//
var emitter = new events.EventEmitter();
//
// retrieve a callback
//
function getCallback(id) {
    if (!id) {
        return undefined;
    }

    return function() {
        var args = [];

        for(var idx in arguments) {
          args.push(arguments[idx]);
        }
        process.send(args, id);
    }
}
//
// Process a message by sending it to all the listeners. If the message is a terminate message, we want
// to exit the process.
//
function processMessage(message) {
    var parsed = JSON.parse(message);
    var callback = getCallback(parsed.id);

    emitter.emit(parsed.type, parsed.content, callback);

    if ("terminate" === parsed.type) {
        process.nextTick(function () {
            process.exit(0);
        });
    }
}
//
// Process an array of messages
//
function processMessages(messages) {
    _.each(messages, function(message){
        if (message.length > 0) {
            try {
                processMessage(message);
            }
            finally {
                var json = JSON.stringify({
                    "type": "completed"
                });
                process.stdout.write(json + '\n');
            }
        }
    });
}
//
// Find the message in a buffer and process them
//
function processBuffer() {
    var messages = buffer.split('\n');
    buffer = "";

    processMessages(messages);
}
//
// Set up the input channel
//
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(data) {
    buffer += data.toString();
    if (buffer.substr(-1) === '\n') {
        processBuffer();
    }
});
//
// Allow users to register for our events using v0.5 facilities
//
var process_on = process.on;
process.on = function(message, listener) {
    if ("message" === message || "terminate" === message || "config" === message) {
        emitter.on(message, listener);
        return;
    }

    process_on.call(console, message, listener);
};
//
// Send a message to the parent using v0.5 facilities
//
process.send = function(message, id) {
    var msg = {
        "type": "message",
        "content": message
    };

    if (id) {
        msg.id = id;
    }

    var json = JSON.stringify(msg);
    process.stdout.write(json + '\n');
};
//
// Send a message to the parent that exist was called
//
var process_exit = process.exit;
process.exit = function(code) {
    var msg = {
        "type": "terminating",
        "code" : code
    };

    var json = JSON.stringify(msg);
    process.stdout.write(json + '\n');
    process.nextTick(function(){
      process_exit(code);
    });
}
console.info = console.log;

function getTitle(worker) {
  var pos = worker.lastIndexOf('/');
  return worker.substr(pos+1);
}
//
// Load the module the users wanted to load
//
var worker = process.argv[2];
var title = getTitle(worker);

process.title = title;
require(worker);
