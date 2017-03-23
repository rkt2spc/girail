//========================================================================================================
// Dependencies
var path = require('path');
var fs = require('fs');
var yaml = require('js-yaml');
var lodash = require('lodash');
var JiraApi = require('jira-client');
var helpers = require('../helpers');

//========================================================================================================
// Configurations
var Configs = {
    JIRA_CONFIG_PATH: process.env.GMAIL_CONFIG_PATH || path.resolve(__dirname, '..', 'configs', 'jira-conf.json')
};
var jiraCredentials = require('../credentials/jira-secret.json');
var jiraConfigs = require('../configs/jira-conf.json');

//========================================================================================================
// Jira Service
var jira = new JiraApi({
    strictSSL: true,
    protocol: 'https',
    host: jiraConfigs.host,
    apiVersion: jiraConfigs.api_version,
    username: jiraCredentials.username,
    password: jiraCredentials.password
});

//========================================================================================================
// List all custom fields
var listJiraCustomFields = function (callback) {

    //-------------------------
    var promise = new Promise((fulfill, reject) => {
        jira.listFields()
            .then((fields) => {

                jiraConfigs.fields = lodash.chain(fields)
                    .sortBy('name')
                    .keyBy('name')
                    .mapValues(v => { return { id: v.id, key: v.key, schema: v.schema }; })
                    .value();

                fulfill(fields);
            })
            .catch((err) => reject(err));
    });

    //-------------------------
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
// Setup Promise
var setupPromise = Promise.resolve()
    .then(listJiraCustomFields)
    .then(() => fs.writeFileSync(Configs.JIRA_CONFIG_PATH, JSON.stringify(jiraConfigs, null, 2)))
    .then(helpers.log('OK! Jira setup completed'));

//========================================================================================================
// Exports
module.exports = function (callback) {
    return helpers.wrapAPI(setupPromise, callback);
};