var _ = require("underscore");
var cp = require("child_process");
var events = require("events");
var util = require("util");
//
// Pick a child that does not have any pending requests
//
function getAvailableChild(manager) {
    for(var idx = manager.lastUsed+1; idx < manager.children.length; idx++) {
        var child = manager.children[idx];

        if (child && !child.pending) {
            return manager.lastUsed = idx;
        }
    }

    for(var idx = .0; idx < manager.children.length; idx++) {
        var child = manager.children[idx];

        if (child && !child.pending) {
            return manager.lastUsed = idx;
        }
    }

    return manager.lastUsed = -1;
}
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
function sendMessage(manager, id, message, callback) {
    var child = manager.children[id];

    if (!child) {
        console.error("child is undefined", id, message);
        return;
    }

    if (callback) {
        var id = ++ child.requestCount;
        child.callbacks[id] = callback;
        message.id = id;
    }

    var json = JSON.stringify(message);

    child.pending ++;

    try {
        child.process.stdin.write(json + '\n');
    }
    catch (e) {
      child.restart();
      sendMessage(manager, id, message, callback);
    }
}
//
// Return the first index on the queue
//
function firstPendingMessage(manager) {
    for(var idx in manager.pending) {
        return idx;
    }

    manager.pending = [];

    return undefined;
}
//
// If there is a pending message, send it with the next available child
//
function sendPendingMessage(manager, content) {
    var idx = firstPendingMessage(manager);

    if (!idx) {
        manager.emitter.emit('idle', content);
        return;
    }

    var childIdx = getAvailableChild(manager);

    if (childIdx == -1) {
        return; // no client available
    }

    var pending = manager.pending[idx];
    delete manager.pending[idx];
    sendMessage(manager, childIdx, pending.message, pending.callback);
}
//
// Inform listeneras that the process completed
//
function processCompleted(child, message) {
    var id = child.id;
    var manager = child.manager;
    manager.emitter.emit(message.type, message.content);
    if (0 !== --child.pending) {
        return;
    }
    process.nextTick(function() {
        sendPendingMessage(child.manager, message.content);
    });
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
    else if (message.type === 'terminating') {
        child.restart();
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
function Child(manager, module) {
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
// start or restart a child
//
function startChild(manager, module, config, idx, callback) {
    var starter = function(callback) {
        if (this) {
            if (manager.terminated) {
                if (manager.children[idx] == this) {
                    delete manager.children[idx];
                }
                return;
            }
            if (manager.children[idx] && manager.children[idx] != this) {
                return;
            }
        }
        var child = new Child(manager, module);
        child.restart = config["auto-restart"] ? starter : function() {
            if (manager.children[idx] == child) {
                delete manager.children[idx];
            }
        };
        manager.children[idx] = child;
        child.process.stdin.on('close', function(code, signal) {
            child.restart();
        });
        var _config = config || {};
        sendMessage(manager, idx, {
            "clientID" : idx,
            "type": "config",
            "content": _config
         }, function(){
            if (callback) {
                callback.apply(null, arguments);
            }
        });
        return child;
    };
    starter(callback);
}
//
// Start a manager
//
function startManager(module, manager, config, callback) {
    var count = getCount(config);
    manager.children = [];

    for(var idx=0; idx<count; idx++) {
        startChild(manager, module, config || {}, idx, callback);
    }
}
//
// Create a new child process passing the file to be executed by the launched process.
//
function Manager(module) {
    this.emitter = new events.EventEmitter();
    this.pending = [];
    this.lastUsed = -1;
}
//
// Allow users to register from messages from the client
//
Manager.prototype.on = function(event, listener) {
    this.emitter.on(event, listener);
};
//
// Send a user-defined message to the client
//
Manager.prototype.send = function(message, callback) {
    var _message = {
        "type": "message",
        "content": message
    };

    var idx = getAvailableChild(this);

    if (idx != -1) {
        sendMessage(this, idx, _message, callback);
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
    var self = this;
    this.terminated = true;
    _.each(this.children, function(child, idx){
        sendMessage(self, idx, {
            "type": "terminate"
        });
    })
};
// export the spwan method, which creates the client object.
module.exports.spawn = function(module, config, callback) {
    var manager = new Manager(module, config);
    var counter = 0;

    startManager(module, manager, config, function(child){
        if (++ counter >= manager.children.length) {
            if (callback) {
                callback(manager);
            }
        }
    });

    return manager;
};
