var _ = require("underscore");
var cp = require("child_process");
var events = require("events");
var util = require("util");

function processMessage(child, message) {
    if (message.type === 'console') {
        console.log(message.content);
    }
    else if (message.type === 'message') {
        child.emitter.emit('message', message.content);
    }
    else if (message.type === 'idle') {
        child.emitter.emit('idle');
        child.busy = true;
    }
    else {
        console.error("unexpected message %s", util.inspect(message));
    }
}

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

function Child(mdl, module) {
    var self = this;
    this.busy = false;
    this.buffer = "";
    this.emitter = new events.EventEmitter();
    this.process = cp.spawn('node', [mdl, module]);
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
Child.prototype.on = function(event, listener) {
    this.emitter.on(event, listener);
};
Child.prototype.send = function(message) {
    var json = JSON.stringify({
        "type": "message",
        "content": message
    });
    this.busy = true;
    this.process.stdin.write(json + '\n');
};
Child.prototype.config = function(config) {
    var json = JSON.stringify({
        "type": "config",
        "content": config
    });
    this.busy = true;
    this.process.stdin.write(json + '\n');
};
Child.prototype.terminate = function() {
    var json = JSON.stringify({
        "type": "terminate"
    });
    this.busy = true;
    this.process.stdin.write(json + '\n');
};
module.exports.spawn = function(module) {
    var mdl = __dirname + '/backgrounder-launcher.js';
    return new Child(mdl, module);
};
