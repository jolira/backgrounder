var cp = require("child_process");

function Child(mdl, module) {
  this.process = cp.spawn('node', [mdl, module]);
  this.process.stdout.on('data', function(data) {
    console.log(data.toString());
  })
}

Child.prototype.on = function() {
};
Child.prototype.send = function() {
};

module.exports.spawn = function(module) {
    var mdl = __dirname + '/backgrounder-launcher.js';

    return new Child(mdl, module);
};