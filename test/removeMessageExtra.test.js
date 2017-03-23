var lodash = require('lodash');
var fs = require('fs');
var message = fs.readFileSync('rawMessage', {encoding: 'utf8'});

// Remove quotes
message = message.replace(/(^\w.+:\r?\n)?(^>.*(\r?\n|$))+/gm, '');

// Remove signature
message = message.replace(/(\r?\n)+-- *\r?\n[^]+$/g, '');

// Remove forwarded message notice
message = message.replace(/(\r?\n)+(-+ *Forwarded message *-+)\r?\n(.+\n)+/gm, '');


var metadata = message.match(/_______________ *\r?\n(.+\r?\n?)+/g);
metadata = lodash.chain(metadata)
                .flatMapDeep(m => m.match(/[^\r\n]+/g))
                .map(m => m.split(/ *: */g))
                .filter(m => m.length >= 2)
                .keyBy('0')
                .mapValues('1')
                .value();

fs.writeFileSync('parsedMessage', message);
console.log(metadata);