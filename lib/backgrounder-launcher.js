var util = require('util');
var events = require("events");

function format(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(util.inspect(arguments[i]));
    }
    return objects.join(' ');
  }


  var i = 1;
  var args = arguments;
  var str = String(f).replace(/%[sdj]/g, function(x) {
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for (var len = args.length, x = args[i]; i < len; x = args[++i]) {
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + util.inspect(x);
    }
  }
  return str;
}

function log(message) {
  var _message = {"type": "console", "content" : message};
  var json = JSON.stringify(_message);

  process.stdout.write(json + '\n');
}

console.log = function() {
  var message = format.apply(this, arguments);

  log(message);
};

console.dir = function(object) {
  var message = util.inspect(object);

  log(message);
};

var times = {};
console.time = function(label) {
  times[label] = Date.now();
};


console.timeEnd = function(label) {
  var duration = Date.now() - times[label]

  console.log('%s: %dms', label, duration);
};

var buffer = "";
var emitter = new events.EventEmitter();

process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(data) {
  buffer += data.toString();

  if (buffer.substr(-1) === '\n') {
    var parsed = JSON.parse(buffer);
    buffer = "";

    emitter.emit("message", parsed);
  }
})

process.on = function(message, listener) {
  emitter.on(message, listener);
}

process.send = function(message) {
  var json = JSON.stringify({"type":"message", "content" : message});

  process.stdout.write(json + '\n');
}

console.info = console.log;

var module = process.argv[2];

require(module);
