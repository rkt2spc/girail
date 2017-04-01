var winston = require('winston');
var UnrecoverableError = require('./lib/errors/UnrecoverableError');

var logger = new winston.Logger({
    transports: [
        new winston.transports.Console({ level: 'info', colorize: true, prettyPrint: true }),
        new winston.transports.File({
            level: 'info',
            name: 'warn-file-logger',
            filename: 'test.log.json',
            colorize: true,
            prettyPrint: true
        }),
    ]
});

var err = new UnrecoverableError({
    message: 'GG Wellplay',
    src: new Error('ABCD'),
    recoveryData: {a: 'x', b: 'y'}
});
logger.info('aaaa', err);