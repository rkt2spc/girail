var fs = require('fs');
var size = 1024 * 1024 * 20; // 10MB
var dump = Array(size).fill('A');
fs.writeFileSync('../dump.txt', Buffer.from(dump));