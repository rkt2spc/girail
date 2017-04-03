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

        //-------------------------                
        // Loop mapping
        async.eachSeries(jiraSettings.metadata_mapping, (mapping, next) => {
            // If message doesn't have required metadata or jira doesn't have required field. do nothing
            if (!message.metadata[mapping.metaName] || !jiraSettings.fields[mapping.fieldName]) {
                if (mapping.fieldName === 'Brand' && jiraSettings.fields['Brand'])
                    issueFields[jiraSettings.fields['Brand'].id] = { value: jiraSettings.brand_options[0] };
                    
                return next();                
            }

            var sourceMeta = message.metadata[mapping.metaName];
            var targetField = jiraSettings.fields[mapping.fieldName];
            
            // versions field
            if (targetField.id === 'versions') {
                jiraService.getVersions(issueFields.project.key)
                    .then((availableVersions) => {
                        availableVersions = availableVersions.map(v => v.name);
                        var versions = sourceMeta.split(/ *, */g);
                        versions = versions.filter(v => availableVersions.includes(v));
                        issueFields[targetField.id] = versions;
                    })
                    .catch((e) => logger.info(`Can\'t get available project versions (${e.message}), skipping versions field...`))
                    .then(() => next());
            // Brand field
            } else if (mapping.fieldName === 'Brand') {
                console.log('Im here');
                console.log(sourceMeta);
                console.log(jiraSettings.brand_options);
                if (jiraSettings.brand_options.includes(sourceMeta))
                    issueFields[targetField.id] = { value: sourceMeta };
                else
                    issueFields[targetField.id] = { value: jiraSettings.brand_options[0] };
                    
                return next();
            // Others
            } else if (targetField.type === 'array') {
                var arr = sourceMeta.split(/ *, */g);
                issueFields[targetField.id] = arr.map(f => lodash.kebabCase(f));

                return next();
            }
            else {
                issueFields[targetField.id] = { value: sourceMeta };
                return next();
            }

        }, (err) => {
            //-------------------------
            // Create new issue
            console.log('Issue Fields:', require('util').inspect(issueFields));
            jiraService.addNewIssue({
                fields: issueFields
            })
                .then((issue) => fulfill(issue))
                .catch((err) => reject(err));
        });
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
