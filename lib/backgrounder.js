var cp = require("child_process");

module.exports.spawn = function(module) {
    var mdl = __dirname + '/backgrounder-launcher.js';
    console.log(mdl);
    var _process = cp.spawn('node', [mdl, module]);
    console.log(require('util').inspect(_process, false, 10));

    return {
        "on" : function() {
        },
        "send" : function() {
        }
    };
};