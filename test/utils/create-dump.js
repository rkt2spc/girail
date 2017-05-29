const fs = require('fs');
const size = 1024 * 1024 * 20; // 10MB
const dump = Array(size).fill('A');
fs.writeFileSync('../dump.txt', Buffer.from(dump));
