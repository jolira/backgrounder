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
var times = {};
console.time = function(label) {
    times[label] = Date.now();
};
console.timeEnd = function(label) {
    var duration = Date.now() - times[label];
    console.log('%s: %dms', label, duration);
};
var buffer = "";
var emitter = new events.EventEmitter();

function processMessage(message) {
    var parsed = JSON.parse(message);

    emitter.emit(parsed.type, parsed.content);

    if ("terminate" === parsed.type) {
        process.exit(0);
    }
}

function processMessages(messages) {
    _.each(messages, function(message){
        if (message.length > 0) {
            try {
                processMessage(message);
            }
            finally {
                var json = JSON.stringify({
                    "type": "idle",
                    "content" : message
                });
                process.stdout.write(json + '\n');
            }
        }
    });
}

function processBuffer() {
    var messages = buffer.split('\n');
    buffer = "";

    processMessages(messages);
}
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(data) {
    buffer += data.toString();
    if (buffer.substr(-1) === '\n') {
        processBuffer();
    }
});
var process_on = process.on;
process.on = function(message, listener) {
    if ("message" === message || "terminate" === message || "config" === message) {
        emitter.on(message, listener);
        return;
    }

    process_on.call(console, message, listener);
};
process.send = function(message) {
    var json = JSON.stringify({
        "type": "message",
        "content": message
    });
    process.stdout.write(json + '\n');
};
console.info = console.log;
var module = process.argv[2];
require(module);