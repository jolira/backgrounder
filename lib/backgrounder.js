var _ = require("underscore");
var cp = require("child_process");
var events = require("events");
var util = require("util");
//
// Emit a message or, if a callback was provided, call the callback
//
function emitMessage(child, message) {
    var id = message.id;

    if (!id) {
        child.manager.emitter.emit(message.type, message.content);
        return;
    }

    var callback = child.callbacks[id];

    if (!callback) {
        console.error("callback already called for %s, igoring message %j", id, message);
        return;
    }

    delete child.callbacks[id];
    callback.apply(null, message.content);
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
}
//
// Pop the message of the queue
//
function popMessage(pending) {
    for(var idx in pending) {
        var first = pending[idx];

        delete pending[idx];

        return first;
    }

    return undefined;
}
//
// Inform listeneras that the process completed
//
function processCompleted(child, message) {
    var manager = child.manager;
    manager.emitter.emit(message.type, message.content);
    if (0 !== --child.pending) {
        return;
    }
    var next = popMessage(manager.pending);
    if (next) {
        sendMessage(child, next.message, next.callback);
    }
    else {
        child.manager.emitter.emit('idle', message.content);
    }
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
        processCompleted(child, message);
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
// Find the counter for the processes
//
function getCount(config) {
    if (!config) {
        return 1;
    }
    return config["children-count"] ? config["children-count"] : 1;
}
//
// Create a new child
//
function Child(manager, module, config, id) {
    var self = this;
    var path = __dirname + '/backgrounder-launcher.js';

    this.buffer = "";
    this.pending = 0;
    this.callbacks = [];
    this.requestCount = 0;
    this.manager = manager;
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
// Create a new child process passing the file to be executed by the launched process.
//
function Manager(module, config) {
    this.emitter = new events.EventEmitter();
    this.children = [];
    this.pending = [];

    var self = this;
    var count = getCount(config);

    for(var idx=0; idx<count; idx++) {
        var child = new Child(this, module, config, idx);

        this.children.push(child);
    }
}
//
// Allow users to register from messages from the client
//
Manager.prototype.on = function(event, listener) {
    this.emitter.on(event, listener);
};
//
// Pick a child that does not have any pending requests
//
function getAvailableChild(children) {
    for(var idx in children) {
        var child = children[idx];

        if (!child.pending) {
            return child;
        }
    }
    return undefined;
}
//
// Send a user-defined message to the client
//
Manager.prototype.send = function(message, callback) {
    var _message = {
        "type": "message",
        "content": message
    };

    var child = getAvailableChild(this.children);

    if (child) {
        sendMessage(child, _message, callback);
    }
    else {
        this.pending.push({
            "message" : _message,
            "callback" : callback
        });
    }
};
//
// Tell the client to shut down
//
Manager.prototype.terminate = function() {
    _.each(this.children, function(child){
        sendMessage(child, {
            "type": "terminate"
        });
    })
};
// export the spwan method, which creates the client object.
module.exports.spawn = function(module, config, callback) {
    var manager = new Manager(module, config);

    if (!config) {
        return manager;
    }
    var counter = manager.children.length;
    _.each(manager.children, function(child){
        sendMessage(child, {
            "type": "config",
            "content": config
        }, function(){
            if (-- counter === 0 && callback) {
                callback(manager);
            }
        });
    })

    return manager;
};
