process.on('message', function(message, callback) {
    console.log('Worker: "processing" ', message);

    callback("received", "this", message);
});

console.log('Worker: Started!');
