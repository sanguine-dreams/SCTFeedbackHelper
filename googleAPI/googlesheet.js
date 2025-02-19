// // googleSheets.js
// const { google } = require('googleapis');
// const { authorize } = require('./googleAuth');
//
// // Fetch data from the specified Google Sheet
// function getSheetData(auth, sheetId, range, callback) {
//     const sheets = google.sheets({ version: 'v4', auth });
//     sheets.spreadsheets.values.get({
//         spreadsheetId: sheetId,
//         range: range,
//     }, (err, res) => {
//         if (err) {
//             console.log('The API returned an error: ' + err);
//             return;
//         }
//         const rows = res.data.values;
//         if (rows.length) {
//             callback(rows);
//         } else {
//             console.log('No data found.');
//         }
//     });
// }
//
// module.exports = { getSheetData };
