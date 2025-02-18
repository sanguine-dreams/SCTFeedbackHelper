const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./feedback.db');

// Initialize the table (run only once)
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, discord_username TEXT, sheet_name TEXT, student_name TEXT, feedback_type TEXT, date TEXT, note TEXT)");
});

module.exports = db;
