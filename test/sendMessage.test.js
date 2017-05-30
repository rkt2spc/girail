/* eslint no-console: off */

//-------------------------
const fs = require('fs');
const path = require('path');
const google = require('googleapis');
const mailboxSetting = require('js-yaml').safeLoad(fs.readFileSync(path.resolve(__dirname, '../configs/mailbox.settings.yaml')))[0];
const tokens = JSON.parse(Buffer.from(mailboxSetting.tokens, 'base64').toString('utf8'));
const googleCredentials = require('../credentials/google.credentials.json');
const oauth2Client = new google.auth.OAuth2(
    googleCredentials.installed.client_id,
    googleCredentials.installed.client_secret,
    googleCredentials.installed.redirect_uris[0]
);
oauth2Client.setCredentials(tokens);
const gmailService = google.gmail({
  version : 'v1',
  auth    : oauth2Client,
});

//-------------------------
const base64url = require('base64url');
const compose = require('mailcomposer');
compose({
  from    : 'nmtuan.gg@gmail.com',
  to      : 'phuc@fossil.com',
  subject : 'Test script',
  // text    : 'test email from script',
  html    : 'Click <a href="https://github.com/rocketspacer/girail" target="_blank">here</a> to go to nmtuan project',
}).build((err, mail) => {
  if (err) return console.log(err);

  console.log(mail.toString());
  gmailService.users.messages.send({
    userId   : 'me',
    resource : {
      raw: base64url.encode(mail),
    },
  }, (error, data) => {
    if (error) console.error(error);
    else console.log('Success:', data);
  });
});

