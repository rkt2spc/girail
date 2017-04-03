var request = require('request');

request.post({
    url: 'https://nmtuan2.atlassian.net/rest/api/2/issue/SAM-29/attachments',
    headers: {
        'X-Atlassian-Token': 'no-check'
    },
    auth: {
        username: 'admin2',
        password: '123456'
    },
    formData: {
        file: {
            value: require('fs').createReadStream('./pixel_forest.png'),
            options: {
                filename: 'pixel_city4.png',
                contentType: 'image/png'
            }
        }
    }
}, (err, data) => {
    if (err) return console.log(err.message);
    console.log('Done');
});