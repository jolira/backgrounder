var cp = require("child_process");

module.exports.spawn = function(module) {
    var mdl = __dirname + '/background-launcher.js';

    process = cp.spawn('node', [mdl, module]);
};