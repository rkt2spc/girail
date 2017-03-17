# Girail
Automation System: Reading Gmail and create tickets in Jira (Lol, that's how you got the name girail)  

# USAGE
Setting IAM so Gmail can trigger Google Pub/Sub (https://developers.google.com/gmail/api/guides/push)  
Go to Google Pub/Sub create a new topic  
Go to Google IAM acquire your oauth2 credentials, save it as "/credentials/oauth-secret.json"  
Modify the variable Config in "run-once.js" (top of the file), adjust field "PUBSUB_TOPIC" to newly created topic  
Run "node run-once.js" to generate credentials (might need to follow oauth2 flow)  
Create a "/credentials/database-conf.json" with a single field "database_url" containing your mongodb connection string  
Run "./bundle.sh" to generate deploy bundle (deploy-bundle.zip)  
Go to Google Function create a new function with the deploy bundle, make it subscribe to the PUBSUB_TOPIC

# STRUCTURE
### Read code from index.js