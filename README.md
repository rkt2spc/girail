# Girail
Automation System: Reading Gmail and create tickets in Jira

# Prerequisite
### Google and GMail
Go to Google Developer Console enable GMail APi and aquire oauth2 credentials (type: others...)

### Jira
Username password to an account that can create issue/comments/attachments

### NodeJs
Node ^7.8

### Database
MongoDb installed

### AWS
Setup IAM configs for AWS-SDK on your production environment
Two SQS queues: one for mail-message, one as a dead-letter-queue

# Setup
Run setup scripts and follow instructions
```
node setup/gmail.setup.js
node setup/aws.setup.js
node setup/database.setup.js
node setup/jira.setup.js
node setup/mailbox.add.js
```