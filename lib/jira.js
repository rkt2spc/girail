//========================================================================================================
// External Dependencies
var async   = require('async');
var lodash  = require('lodash');
var JiraApi = require('jira-client');

//========================================================================================================
// Lib Dependencies
var utils           = require('./utilities');
var configsAdapter  = require('./configs-adapter');
var logger          = require('./logger').consumerLogger;

//========================================================================================================
// Errors Definitions

//========================================================================================================
// Configurations
var jiraSettings = configsAdapter.loadJiraSettings();
var jiraCredentials = configsAdapter.loadJiraCredentials();

//========================================================================================================
// Jira Service
var jiraService = new JiraApi({
    strictSSL: true,
    protocol: 'https',
    host: jiraSettings.host,
    apiVersion: jiraSettings.api_version,
    username: jiraCredentials.username,
    password: jiraCredentials.password
});

//========================================================================================================
// Create issue
exports.createIssue = function (message, callback) {
    
    //-------------------------        
    var promise = new Promise((fulfill, reject) => {

        //-------------------------    
        /* TO_DO */     

        //-------------------------    
        // New Issue contents
        var issueFields = {
            project: { key: message.project.key },
            summary: message.subject,
            description: message.content,

            // Default
            issuetype: jiraSettings.default_issue_type,
            reporter: jiraSettings.default_reporter
        };

        // Brand field
        var brand = message.metadata['Brand'];
        if (brand) {
            issueFields[jiraSettings.fields['Brand'].id] = { value: brand };
        }

        // Affects Version/s field
        var versions = message.metadata['App version'];
        if (versions && jiraSettings.brand_abbrs[brand]) {
            versions = versions.split(/ *, */g);
            versions = versions.map(v => jiraSettings.brand_abbrs[brand] + '-' + v);

            issueFields[jiraSettings.fields['Affects Version/s'].id] = { value: versions };
        }

        // Labels field
        var labels = message.metadata['Tags'];
        if (labels) {
            labels = labels.split(/ *, */g);
            labels = labels.map(v => lodash.kebabCase(v));
            
            issueFields[jiraSettings.fields['Labels'].id] = { value: labels };
        }

        //-------------------------
        // Create new issue
        jiraService.addNewIssue({ fields: issueFields })
            .then((issue) => fulfill(issue))
            .catch((err) => reject(err));
    });

    //-------------------------        
    return utils.wrapAPI(promise, callback);
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
    return utils.wrapAPI(promise, callback);
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
    return utils.wrapAPI(promise, callback);
};
