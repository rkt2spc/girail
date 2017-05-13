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
        // New Issue contents
        var issueFields = {
            project: { key: message.project.key },
            summary: message.subject,
            description: message.content,

            // Default
            issuetype: jiraSettings.default_issue_type,
            reporter: jiraSettings.default_reporter
        };

        // Adding custom fields on issue
        async.eachSeries(message.project.metadata_mappings, (mapping, next) => {
            // Message doesn't contain required metadata or Jira doesn't contain required field
            if (!message.metadata[mapping.meta] || !jiraSettings.fields[mapping.field])
                return next();
            
            // Special handling of Versions field: Add Abbreviation
            if (mapping.field === 'Affects Version/s') {

                // Versions
                var versions = message.metadata[mapping.meta];
                versions = versions.split(/ *, */g);

                // Abbreviation
                const brand_abbreviations = {
                    'Kate Spade': 'KS',
                    'Michael Kors': 'MK',
                    'Skagen': 'SK',
                    'Chaps': 'CH',
                    'Diesel': 'DI',
                    'Emporio Armani': 'EA',
                    'Armani Exchange': 'AX',
                    'Tory Burch': 'TB',
                    'DKNY': 'NY',
                    'Marc Jacobs': 'MJ',
                    'Relic': 'RL',
                    'Michele': 'MI'
                };

                var brand = message.metadata['Brand'];
                var abbr = brand_abbreviations[brand];
                if (['FOS', 'FA'].includes(message.project.key)) abbr = 'FS';

                // Add abbreviation to versions
                if (abbr) versions = versions.map(v => abbr + '-' + v);

                // Add only available versions
                jiraService.getVersions(message.project.key)
                    .then((availableVersions) => {
                        availableVersions = availableVersions.map(v => v.name);
                        versions = versions
                                    .filter(v => availableVersions.includes(v))
                                    .map(v => { return { name: v } });
                        
                        issueFields[jiraSettings.fields[mapping.field]] = versions;
                    })
                    .catch((e) => logger.info(`Can\'t get available project versions (${e.message}), skipping versions field...`))
                    .then(() => next());
            }
            // Others field
            else {

                // Resources
                var sourceMeta = message.metadata[mapping.meta];
                var targetField = jiraSettings.fields[mapping.field];

                if (mapping.type === 'array') {
                    issueFields[targetField] = sourceMeta.split(/ *, */g).map(v => lodash.kebabCase(v));
                }
                else if (mapping.type === 'string') {
                    issueFields[targetField] = { value: sourceMeta };
                }
                else if (mapping.type === 'options') {
                    var opt = mapping.options.find(v => v === sourceMeta);
                    if (opt) issueFields[targetField] = { value: opt };
                }

                // Finish
                next();
            }

        }, (err) => {
            // Create new issue
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
