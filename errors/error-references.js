var RecoverableError = require('./RecoverableError');
var UnrecoverableError = require('./UnrecoverableError');
var InterceptSignal = require('./InterceptSignal');

// List of error for evaluation
var errors = [
    // Recoverable Errors
    new RecoverableError({ code: 'RE001', message: 'Failed to get detailed message' }),
    new RecoverableError({ code: 'RE002', message: 'Failed to create mapping' }),
    new RecoverableError({ code: 'RE003', message: 'Failed to read mapping' }),
    new RecoverableError({ code: 'RE004', message: 'Failed to create Jira Issue' }),
    new RecoverableError({ code: 'RE005', message: 'Failed to read reply source mapping' }),
    new RecoverableError({ code: 'RE006', message: 'Failed to create Jira Comment' }),
    new RecoverableError({ code: 'RE007', message: '' }),

    // Unrecoverable errors
    new UnrecoverableError({ code: 'UE001', message: 'Failed to update mapping after creating Jira Entity' }),
    new UnrecoverableError({ code: 'UE002', message: 'Failed to upload attachments' }),
    new UnrecoverableError({ code: 'UE003', message: 'Failed to mark message processed' }),
    new UnrecoverableError({ code: 'UE004', message: '' }),

    // Intercept Signal
    new InterceptSignal({ code: 'IS001', message: '' }),
    new InterceptSignal({ code: 'IS002', message: '' }),
    new InterceptSignal({ code: 'IS003', message: 'Message was already processed' }),
    new InterceptSignal({ code: 'IS004', message: 'No reply source mapping' })
];