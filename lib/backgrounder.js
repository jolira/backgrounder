var _ = require("underscore");
var cp = require("child_process");
var events = require("events");
var util = require("util");
//
// Emmit a message or, if a callback was provided, call the callback
//
function emitMessage(child, message) {
    var id = message.id;

    if (!id) {
        child.emitter.emit(message.type, message.content);
        return;
    }

    var callback = child.callbacks[id];

    if (!callback) {
        console.error("more than one callabck for %s, igoring message %j", id, message);
        return;
    }

    delete child.callbacks[id];
    callback.apply(null, message.content);
}
//
// Process a message from the child. Message supported are of type 'console', 'message', and 'idle'.
// 'idlle' messages decrement the message pending count of the child.
//
function processMessage(child, message) {
    if (message.type === 'console') {
        console.log(message.content);
    }
    else if (message.type === 'message') {
        emitMessage(child, message);
    }
    else if (message.type === 'completed') {
        child.emitter.emit(message.type, message.content);
        if (0 === --child.pending) {
            child.emitter.emit('idle', message.content);
        }
    }
    else {
        console.error("unexpected message %s", util.inspect(message));
    }
}
//
// Send a message to the client (do the actual work: stringify, write to stdin, increment the pending counter)
//
function sendMessage(child, message, callback) {
    if (callback) {
        var id = ++ child.requestCount;
        child.callbacks[id] = callback;
        message.id = id;
    }

    var json = JSON.stringify(message);

    child.pending ++;
    child.process.stdin.write(json + '\n');
};
//
// Process the content of self.buffer. Find all message in the buffer and process the messages.
//
function processBuffer(self) {
    var messages = self.buffer.split('\n');
    self.buffer = "";
    _.each(messages, function(message){
        if (message.length > 0) {
            var parsed = JSON.parse(message);
            processMessage(self, parsed);
        }
    });
}
//
// Create a new child process passing the file to be executed by the launched process.
//
function Child(module) {
    var self = this;
    this.busy = false;
    this.buffer = "";
    this.pending = 0;
    this.callbacks = [];
    this.requestCount = 0;
    var path = __dirname + '/backgrounder-launcher.js';
    this.emitter = new events.EventEmitter();
    this.process = cp.spawn('node', [path, module]);
    this.process.stdout.on('data', function(data) {
        self.buffer += data.toString();
        if (self.buffer.substr(-1) === '\n') {
            processBuffer(self);
        }
    });
    this.process.stderr.on('data', function(data) {
        var _data = data.toString();
        if (_data.substr(-1) === '\n') {
            _data = _data.substr(0, _data.length - 1);
        }
        console.error(_data);
    });
}
//
// Allow users to register from messages from the client
//
Child.prototype.on = function(event, listener) {
    this.emitter.on(event, listener);
};
//
// Send a user-defined message to the client
//
Child.prototype.send = function(message, callback) {
    sendMessage(this, {
        "type": "message",
        "content": message
    }, callback);
};
//
// Tell the client to shut down
//
Child.prototype.terminate = function() {
    sendMessage(this, {
        "type": "terminate"
    });
};
// export the spwan method, which creates the client object.
module.exports.spawn = function(module, callback, config) {
    var child = new Child(module);

    if (!config) {
        if (callback) {
            callback(child);
        }
    }
    else {
        sendMessage(child, {
            "type": "config",
            "content": config
        }, function(){
            callback(child);
        });
    }
    return child;
};
