var _ = require("underscore");
var cp = require("child_process");
var events = require("events");
var util = require("util");
//
// Process a message from the child. Message supported are of type 'console', 'message', and 'idle'.
// 'idlle' messages decrement the message pending count of the child.
//
function processMessage(child, message) {
    if (message.type === 'console') {
        console.log(message.content);
    }
    else if (message.type === 'message') {
        child.emitter.emit(message.type, message.content);
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
// Send a message to the client (do the actual work: stringify, write to stdin, increment the pending counter)
//
function sendMessage(child, message) {
    var json = JSON.stringify(message);

    child.pending ++;
    child.process.stdin.write(json + '\n');
};
//
// Send a user-defined message to the client
//
Child.prototype.send = function(message) {
    sendMessage(this, {
        "type": "message",
        "content": message
    });
};
//
// Tell the client to (re-)configure itself
//
Child.prototype.config = function(config) {
    sendMessage(this, {
        "type": "config",
        "content": config
    });
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
module.exports.spawn = function(module) {
    return new Child(module);
};
