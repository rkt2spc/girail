#### I. System Recap

#### II. Context
Our system run on a serverless architecture, each event triggers/spawns a separate handler which then run in parallel with other handlers

In our specific case, the event source is Gmail, the thing that manage spawning handlers is Google Function (Similar to AWS Lambda)

*Note: Actually Gmail only notify Google PubSub which then do the triggering part, but since they just pipelining each other we can consider them as one*

#### III. Gmail Event System Limitations
Each event happens within Gmail will then trigger a handler passing a **"historyId"** as parameter.  

This **"historyId"** stands for the current head of the event logs **AFTER** the triggering event happen. And Gmail only support API to query what happen after a specific **historyId** (they are incrementally ordered).  

Meaning, to know what actually happen, you must have some mechanism to save and update **last known historyId**

#### IV. Handler Workflow  
A handler workflow when received an event is divided to 8 steps, which are described as follow: 
##### Step 1: Receive Gmail Event ***"current historyId"***
##### Step 2: Get ***"last known historyId"***, update it with ***"current historyId"***

* We maintain a **SORTED COLLECTION** to save each **historyId**. Then get **last known historyId** will be equal to getting the **largest historyId** currently in our database. And update it will be equal to inserting **current historyId** into the collection  

* Doing this we can guarentee that even if a handler try to update "3" as the new **last known historyId** while a **historyId** "4" already exists, the next get **last known history_id** is still correct

* Even that, because handlers execute in parallel, we still can't guarantee 2 seperate handlers won't get the same **last known historyId**.  

##### Step 3: Retrieve all messages that was added since ***last known history_id***
##### Step 4: Filter invalid messages by custom logic
##### Step 5: Filter out duplicated messages across handlers

* As explained, 2 handlers may get the same **last known history_id**, which result in multiple handlers can be working on same messages

* We filter out these duplicated messages by utilizing database unique index locking mechanism. Before we process a message identified by **messageId** we'll try to create an database entry with unique index field **messageId**, if we can't register that down to datatabase, another handler must have registered it and are processing the message. We only process messages that we have managed to register down in database

* Doing this we can make sure that no 2 handlers will execute the same message. But we still can't guarantee the order of message processing execution across handlers (We can only enforce that in each single handler). This could result in some complications when processing messages that will be detailed in Step 8

##### Step 6: Categorize filtered messages

* A message typically is one of 2 types: **Reply-Message**, **Non-Reply-Message**
* We identify type of a message by checking whether it has the header ***"In-Reference-To"***

##### Step 7: Dealing with **Non-Reply-Message(s)**
  * Dealing with **Non-Reply-Message(s)** is quite straight-foward:
    * **Step 7.1:** Form an issue based on message content and push it to Jira  
    * **Step 7.2:** Update database entry with returned Jira issue identity
    * **Step 7.3:** <TO-DO>

##### Step 8: Dealing with **Reply-Message(s)**
  * We basically try to create a Jira comment with each **Reply-Message**. But since order of execution is not guaranteed, we might sometime encounter a **Reply-Message** which its *"reply-source"* hasn't been processed yet, hence no issue existed to attach our comment to.
    * In

#### V. Conclusion
Please raise my salary :D

