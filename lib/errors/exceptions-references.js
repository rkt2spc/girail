const RecoverableError = require('./RecoverableError');
const UnrecoverableError = require('./UnrecoverableError');
const DropSignal = require('./DropSignal');
const RequeueSignal = require('./RequeueSignal');

// List of error for evaluation
const errors = [
  // Recoverable Errors
  new RecoverableError({ code: 'RE001', message: 'Gmail Failure: Getting message details' }),
  new RecoverableError({ code: 'RE002', message: 'Gmail Failure: Getting message thread' }),
  new RecoverableError({ code: 'RE003', message: 'Database Failure: Finding duplicated mapping' }),
  new RecoverableError({ code: 'RE004', message: 'Database Failure: Creating message mapping' }),
  new RecoverableError({ code: 'RE005', message: 'Database Failure: Getting message mapping' }),
  new RecoverableError({ code: 'RE006', message: 'Jira Failure: Creating Jira Issue' }),
  new RecoverableError({ code: 'RE007', message: 'Database Failure: Finding reply source mapping' }),
  new RecoverableError({ code: 'RE008', message: 'Jira Failure: Creating Jira Comment' }),
  new RecoverableError({ code: 'RE009', message: 'SQS Failure: Failed to re-enqueue message' }),

  // Unrecoverable errors
  new UnrecoverableError({ code: 'UE001', message: 'Database Failure: Updating mapping after creating Jira Entity' }),
  new UnrecoverableError({ code: 'UE002', message: 'Gmail Failure: Failed to download attachment' }),
  new UnrecoverableError({ code: 'UE003', message: 'Jira Failure: Failed to upload attachment' }),
  new UnrecoverableError({ code: 'UE004', message: 'Gmail Failure: Marking message processed' }),

  // Drop Signal
  new DropSignal({ code: 'DS001', message: 'Invalid message, no mailbox property' }),
  new DropSignal({ code: 'DS002', message: 'Invalid message, invalid mailbox' }),
  new DropSignal({ code: 'DS003', message: 'Message was from unauthorized sender, un-whitelisted' }),
  new DropSignal({ code: 'DS004', message: 'Message was from unauthorized sender, blacklisted' }),
  new DropSignal({ code: 'DS005', message: 'Message doesn\'t have valid receivers' }),
  new DropSignal({ code: 'DS006', message: 'Message was duplicated' }),
  new DropSignal({ code: 'DS007', message: 'Message was already processed' }),
  new DropSignal({ code: 'DS008', message: 'Message have been requeued too many times' }),

  // Requeue Signal
  new RequeueSignal({
    code    : 'RS001',
    message : 'No reply source mapping. SQS could be sending message out-of-order. Try re-enqueueing'
  }),
];

module.exports = errors;
