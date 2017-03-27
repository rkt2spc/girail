//========================================================================================================
// Node Dependencies
var path = require('path');
var fs = require('fs');

//========================================================================================================
// External Dependencies
var yaml = require('js-yaml');
var lodash = require('lodash');
var JiraApi = require('jira-client');

//========================================================================================================
// Lib Dependencies
var configsAdapter = require('../configs-adapter');
var utils = require('../utilities');

//========================================================================================================
// Configurations
var jiraSettings = configsAdapter.loadJiraSettings();

//========================================================================================================
// Jira Service


//========================================================================================================
// List all custom fields
var listJiraCustomFields = function (callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {

    });

    //-------------------------
    return utils.wrapAPI(promise, callback);
};

//========================================================================================================
// Exports
module.exports = function (callback) {

    //-------------------------   
    var promise = new Promise((fulfill, reject) => {
        
        console.log('\n\nInitializing Jira setup...');

        //-------------------------   
        var jira = new JiraApi({
            strictSSL: true,
            protocol: 'https',
            host: jiraSettings.host,
            apiVersion: jiraSettings.api_version,
            username: jiraSettings.credentials.username,
            password: jiraSettings.credentials.password
        });

        //-------------------------   
        jira.listFields({custom: true})
            .then((fields) => {

                jiraSettings.fields = lodash.chain(fields)
                    .filter((f) => jiraSettings.required_fields.includes(f.name))
                    .sortBy('name')
                    .keyBy('name')
                    .mapValues(v => { return { id: v.id, key: v.key, type: v.schema.type }; })
                    .value();

                configsAdapter.updateJiraSettings(jiraSettings);
                fulfill();
            })
            .catch((err) => reject(err));

    });

    //-------------------------   
    return utils.wrapAPI(promise, callback);
};