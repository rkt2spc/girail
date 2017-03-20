//========================================================================================================
// Dependencies
var async = require('async');
var JiraApi = require('jira-client');
var helpers = require('./helpers');
var database = require('./database');

//========================================================================================================
// Credentials
const DEFAULT_PROJECT = 'SAM';
const DEFAULT_ISSUE_TYPE = "Task";
const DEFAULT_REPORTER = "admin";

//========================================================================================================
// Jira Service
var jiraService = new JiraApi({
    protocol: 'https',
    host: 'nmtuan.atlassian.net',
    username: 'admin',
    password: '123456',
    apiVersion: '2',
    strictSSL: true
});

//========================================================================================================
// Create issue
exports.createIssue = function (message, callback) {
    //-------------------------        
    var promise = new Promise((fulfill, reject) => {

        //-------------------------
        jiraService.addNewIssue({
            fields: {
                project: { key: message.project.key },
                summary: message.subject,
                description: message.content,
                issuetype: {
                    name: DEFAULT_ISSUE_TYPE
                },
                reporter: {
                    name: DEFAULT_REPORTER
                }
            }
        })
            .then((issue) => fulfill(issue))
            .catch((err) => reject(err));
    });

    //-------------------------        
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Create comment
exports.createComment = function (replyMessage, callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

        jiraService.addComment(replyMessage.issueId, replyMessage.content)
            .then((comment) => fulfill(comment))
            .catch((err) => reject(err));
    });

    //-------------------------        
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Upload attachment
exports.uploadAttachment = function (params, callback) {

    var issueId = params.issueId;
    var filename = params.filename;
    var mimeType = params.mimeType;
    var data = params.data;

    //-------------------------    
    var promise = new Promise((fulfill, reject) => {

        jiraService.addAttachmentOnIssue(issueId, {
            value: data,
            options: {
                filename: filename,
                contentType: mimeType
            }
        })
            .then((res) => fulfill())
            .catch((err) => reject(err));
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);    
};
