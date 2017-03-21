# Girail
Automation System: Reading Gmail and create tickets in Jira (Lol, that's how you got the name girail)  

# Prerequisite
### Google and GMail
Go to Google IAM acquire your oauth2 credentials, save it as "/credentials/oauth-secret.json"
Run "node run-once.js" to generate credentials (might need to follow oauth2 flow)  
### Database
Create a "/credentials/database-conf.json" with a single field "database_url" containing your mongodb connection string
### AWS
Setup IAM configs for AWS-SDK
Create a "/credentials/aws-conf.json" with a single field "queue_url" containing the url to your SQS

# Setup
Set up a cron-job that run "node cron.js"
Set up a daemon that run "node consumer.js"