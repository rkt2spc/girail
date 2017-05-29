const winston = require('winston');
const UnrecoverableError = require('./lib/errors/UnrecoverableError');

const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({ level: 'info', colorize: true, prettyPrint: true }),
    new winston.transports.File({
      level       : 'info',
      name        : 'warn-file-logger',
      filename    : 'test.log.json',
      colorize    : true,
      prettyPrint : true,
    }),
  ],
});

const err = new UnrecoverableError({
  message      : 'GG Wellplay',
  src          : new Error('ABCD'),
  recoveryData : { a: 'x', b: 'y' },
});
logger.info('aaaa', err);
