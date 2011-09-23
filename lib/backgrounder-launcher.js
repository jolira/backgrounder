var out = JSON.stringify({"type":"console", "content" : "started!!!"});

console.error(out);
process.stdout.write(out + '\n');
