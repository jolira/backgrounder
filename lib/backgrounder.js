var cp = require("child_process");
var events = require("events");
var util = require("util");

function processMessage(emitter, message) {
    if (message.type === 'console') {
        console.log(message.content);
        return;
    }

    console.error("unexpected message %s", util.inspect(message));
}

function Child(mdl, module) {
  var self = this;

  this.buffer = "";
  this.emitter = new events.EventEmitter();
  this.process = cp.spawn('node', [mdl, module]);
  this.process.stdout.on('data', function(data) {
    self.buffer += data.toString();

    console.log("this.buffer: %s", self.buffer);

    if (self.buffer.substr(-1) === '\n') {
      var parsed = JSON.parse(self.buffer);
      self.buffer = "";

      processMessage(this.emitter, parsed);
    }

  })
  this.process.stderr.on('data', function(data) {
    var _data = data.toString();

    if (_data.substr(-1) === '\n') {
      _data = _data.substr(0, _data.length - 1);
    }

    console.error(_data);
  })
}

Child.prototype.on = function(event, listener) {
  this.emitter.on(event, listener);
};
Child.prototype.send = function() {
};

module.exports.spawn = function(module) {
    var mdl = __dirname + '/backgrounder-launcher.js';

    return new Child(mdl, module);
};
