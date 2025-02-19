// // googleAuth.js
// const { google } = require('googleapis');
// const fs = require('fs');
// const path = require('path');
//
// const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// const TOKEN_PATH = path.join(__dirname, 'token.json'); // Path where the token will be stored
//
// // Authorize the client with Google Sheets API
// function authorize(callback) {
//     const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json')));
//     const { client_secret, client_id, redirect_uris } = credentials.installed;
//     const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
//
//     // Check if token already exists
//     fs.readFile(TOKEN_PATH, (err, token) => {
//         if (err) return getNewToken(oauth2Client, callback);
//         oauth2Client.setCredentials(JSON.parse(token));
//         callback(oauth2Client);
//     });
// }
//
// // Get a new token when the previous one is invalid/expired
// function getNewToken(oauth2Client, callback) {
//     const authUrl = oauth2Client.generateAuthUrl({
//         access_type: 'offline',
//         scope: SCOPES,
//     });
//     console.log('Authorize this app by visiting this url:', authUrl);
//     // Prompt user to go to this URL and provide the code to authenticate
// }
//
// module.exports = { authorize };
