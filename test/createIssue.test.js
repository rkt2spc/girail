var JiraApi = require('jira-client');

//========================================================================================================
// Configurations
var jiraCredentials = require('../credentials/jira-secret.json');
var jiraConfigs = require('../configs/jira-conf.json');

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
var fields = {
    project: { key: 'SAM' },
    summary: 'Test Create Issue' + new Date().toISOString(),
    description: 'Dummy',

    // Default
    issuetype: jiraConfigs.default_issue_type,
    reporter: jiraConfigs.default_reporter
};

// Brand
fields[jiraConfigs.fields['Brand'].id] = { value: 'skagen' };

// Labels
fields[jiraConfigs.fields['Labels'].id] = ['Issue', 'Bad-stuff', 'Need-fix'];

// Affected Versions
fields[jiraConfigs.fields['Affects Version/s'].id] = ['1.0.1', '1.0.2'];

console.log(fields);
//-------------------------
jiraService.addNewIssue({
    fields: fields
})
    .then((issue) => {
        console.log('Done');
    })
    .catch((err) => {
        console.log(err.message);
        // console.log(err);
    });