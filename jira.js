//========================================================================================================
// Dependencies
var async = require('async');
var lodash = require('lodash');
var JiraApi = require('jira-client');
var helpers = require('./helpers');
var database = require('./database');

//========================================================================================================
// Configurations
var jiraCredentials = require('./credentials/jira-secret.json');
var jiraConfigs = require('./configs/jira-conf.json');
var metadataMapping = require('./configs/metadata-mapping.json');

//========================================================================================================
// Jira Service
var jiraService = new JiraApi({
    strictSSL: true,
    protocol: 'https',
    host: jiraConfigs.host,
    apiVersion: jiraConfigs.api_version,
    username: jiraCredentials.username,
    password: jiraCredentials.password
});

//========================================================================================================
// Create issue
exports.createIssue = function (message, callback) {
    //-------------------------        
    var promise = new Promise((fulfill, reject) => {

        // New Issue contents
        var jiraFields = {
            project: { key: message.project.key },
            summary: message.subject,
            description: message.content,

            // Default
            issuetype: jiraConfigs.default_issue_type,
            reporter: jiraConfigs.default_reporter
        };

        //-------------------------                
        // Loop mapping
        metadataMapping.forEach((mapping) => {
            // If message doesn't have required metadata or jira doesn't have required field. do nothing
            if (!message.metadata[mapping.metaName] || !jiraConfigs.fields[mapping.fieldName]) return;

            var sourceMeta = message.metadata[mapping.metaName];
            var targetField = jiraConfigs.fields[mapping.fieldName];

            if (targetField.schema.type === 'array') {
                var arr = sourceMeta.split(/ *, */g);
                jiraFields[targetField.id] = arr.map(f => lodash.kebabCase(f));
            }
            else
                jiraFields[targetField.id] = { value: sourceMeta };
        });

        //-------------------------                
        // Special parse

        //-------------------------
        // Create new issue
        jiraService.addNewIssue({
            fields: jiraFields
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
