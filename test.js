const DropSignal = require('./lib/errors/DropSignal');
const utils = require('./lib/utilities');

const winston = require('winston');
const logger = new winston.Logger({
  transports: [
    new winston
      .transports
      .Console({level: 'info', colorize: true, prettyPrint: true, timestamp: true}),
    // new winston.transports.File({     level: 'warn',     name:
    // 'warn-file-logger',     filename: 'test.log.json',     colorize: true,
    // prettyPrint: true,     json: false })
  ]
});
// logger.warn(new DropSignal({   message: 'HiHi',   data: {     nonsense:
// 'a'.repeat(255),     messageId: 'test'   } }));
var sourceString = "bugs@fossil.com, thinh@fossil.com, minh@fossil.com, dungdna@fossil.com, sw-qa@fo" +
    "ssil.com, sw-portfolio-ios@fossil.com, Matthew Montgomery \u003cmatthewm@fossil." +
    "com\u003e, trungle@fossil.com";

var sourceString2 = "\"bugs@fossil.com\" \u003cbugs@fossil.com\u003e, \"thinh@fossil.com\" \u003cthin" +
    "h@fossil.com\u003e, \"minh@fossil.com\" \u003cminh@fossil.com\u003e, \"dungdna@f" +
    "ossil.com\" \u003cdungdna@fossil.com\u003e, \"sw-qa@fossil.com\" \u003csw-qa@fos" +
    "sil.com\u003e, \"sw-portfolio-android@fossil.com\" \u003csw-portfolio-android@fo" +
    "ssil.com\u003e";

var sourceString3 = "bugs@fossil.com, thinh@fossil.com, (minh@fossil.com), 'dungdna@fossil.com', sw-qa@fo" +
    "ssil.com, sw-portfolio-ios@fossil.com";

var sourceString4 = "abcd@gg.com, ";

var result = utils.extractEmails(sourceString4);

console.log(result);

// ------------------------------------------------------------------------
// module.exports = DropSignal;
