//========================================================================================================
// Node Dependencies
var fs = require('fs');
var path = require('path');
var nativeUtil = require('util');

//========================================================================================================
// External Dependencies
var lodash = require('lodash');
var async = require('async');
var readlineSync = require('readline-sync');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

//========================================================================================================
// Lib Dependencies
var utils = require('../lib/utilities');
var configsAdapter = require('../lib/configs-adapter');

//========================================================================================================
// Configurations
var gmailSettings = configsAdapter.loadGmailSettings();
var googleCredentials = configsAdapter.loadGoogleCredentials();
var mailboxSettings = configsAdapter.loadMailboxSettings();

//========================================================================================================
// Arguments
var newMailbox = {
    name: null,
    active: true,
    whitelist: null,
    blacklist: null,
    projects: [],
    tokens: null,
    labels: {}
};

//========================================================================================================
console.log('\n===================================================');
console.log('Obtaining access tokens...');
var oauth2Client = new OAuth2(
    googleCredentials.installed.client_id,
    googleCredentials.installed.client_secret,
    googleCredentials.installed.redirect_uris[0]
);

// Get authorization code
var authUrl = oauth2Client.generateAuthUrl({
    access_type: gmailSettings.access.type,
    scope: gmailSettings.access.scope
});
console.log('Authorize this app by visiting this url:\n' + authUrl);
var code = readlineSync.question('Enter the code from that page here: ');

// Exchange code for token
oauth2Client.getToken(code, function (err, tokens) {

    if (err) {
        console.log(err.message);
        return;
    }
    oauth2Client.setCredentials(tokens);
    newMailbox.tokens = Buffer.from(JSON.stringify(tokens), 'utf8').toString('base64');

    var gmail = google.gmail({
        version: 'v1',
        auth: oauth2Client
    });

    console.log('\n===================================================');
    console.log('Receiving Gmail infos...');
    async.waterfall([
        function (next) {
            gmail.users.getProfile({
                userId: 'me'
            }, (err, profile) => {
                if (err) return next(err);

                newMailbox.name = profile.emailAddress;
                console.log(`Mailbox recognized: ${newMailbox.name}`);

                if (mailboxSettings && mailboxSettings.length !== 0 && mailboxSettings.map(m => m.name).includes(newMailbox.name))
                    if (!readlineSync.keyInYN(`A mailbox with the name ${newMailbox.name} already exists. Do you want to override it?`))
                        return next(new Error('Cancelled'));

                next();
            });
        },
        function (next) {
            console.log('\n-----------------------------');
            console.log('Creating required labels...');
            async.each(gmailSettings.required_labels, (label, cb) => {
                gmail.users.labels.create({ userId: 'me', resource: { name: label } }, (err) => {
                    if (err && err.code !== 409) return cb(err);
                    if (err && err.code === 409)
                        console.log(utils.padSpacesRight(label, 30), 'Existed');
                    else
                        console.log(utils.padSpacesRight(label, 30), 'Created');

                    return cb();
                });
            }, (err) => {
                if (err) next(err);
                else next();
            });
        },
        function (next) {
            gmail.users.labels.list({ userId: 'me' }, (err, response) => {
                newMailbox.labels = lodash.chain(response.labels)
                    .filter((l) => gmailSettings.required_labels.includes(l.name))
                    .keyBy('name')
                    .mapValues('id')
                    .value();
                
                next();
            });
        },
        function (next) {
            console.log('\n-----------------------------');
            console.log('Creating mailbox projects:');
            do {
                var project = {
                    key: readlineSync.question('Project key: '),
                    receivers: readlineSync.question('Message receivers (separate by comma): ').split(/ *, */g),
                    metadata_mappings: []
                };
                
                // Add metadata mapping
                do {
                    console.log(`\n>>>> Project [${project.key}] - Adding metadata mapping`);
                    // Create metadata mapping
                    var mapping = {
                        meta: readlineSync.question('Meta name: '),
                        field: readlineSync.question('Jira field: ')
                    };

                    var meta_types = ['array', 'string', 'options'];
                    mapping.type = meta_types[readlineSync.keyInSelect(meta_types, 'Meta type: ', {cancel: false})];
                    
                    if (mapping.type === 'options')
                        mapping.options = readlineSync.question('Meta options (separate by comman): ').split(/ *, */g);
                                        
                    project.metadata_mappings.push(mapping);
                }
                while(readlineSync.keyInYN(`\nAdd another mapping? (This can be edited later)`));

                newMailbox.projects.push(project);
            }
            while (readlineSync.keyInYN('Add another projects? (This can be edited later)'));
            next();
        }
    ], (err, result) => {
        if (err)
            return console.log(err.message);

        console.log('\n===================================================');
        console.log('Review your mailbox settings (credentials are encoded):');
        console.log(nativeUtil.inspect(newMailbox, false, null));
        if (readlineSync.keyInYN('\nIs this okay?')) {
            mailboxSettings.push(newMailbox);
            configsAdapter.updateMailboxSettings(mailboxSettings);
            console.log('Settings Updated');
        }
        else
            console.log('Cancelled');
    });
});