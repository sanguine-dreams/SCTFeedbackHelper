const sqlite3 = require('sqlite3').verbose();

// Initialize the database connection (only done once)
const db = new sqlite3.Database('feedback.db', (err) => {
    if (err) {
        console.error('Failed to connect to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

module.exports = db;
