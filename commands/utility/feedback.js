const { SlashCommandBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

// Database connection
const db = new sqlite3.Database('./database.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Get your feedback from the uploaded Excel file'),

    async execute(interaction) {
        const user = interaction.user;
        const discordUsername = user.username;

        try {
            // Query the "Discord Link" table to get the student name
            const studentName = await getStudentName(discordUsername);
            if (!studentName) {
                return interaction.reply({ content: "⚠ No linked student name found for you.", ephemeral: true });
            }

            // Tables to search for feedback
            const tables = [
                'DA Technical',
                'DA Business',
                'Equity Training',
                'CDT',
                'Progress Notes',
                'Offical Warning'
            ];

            let formattedFeedback = '';
            let feedbackFound = false;

            // Loop through each table and get rows matching the student name
            for (let table of tables) {
                const rows = await getFeedbackFromTable(table, studentName);

                if (rows.length > 0) {
                    feedbackFound = true;
                    formattedFeedback += formatFeedback(rows, table);
                }
            }

            if (!feedbackFound) {
                return interaction.reply({ content: "No feedback available for you.", ephemeral: true });
            }

            // Send feedback to the user's DM
            await user.send(formattedFeedback);
            await interaction.reply({ content: '✅ Your feedback has been sent to your DMs.', ephemeral: true });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ An error occurred while fetching your feedback.', ephemeral: true });
        }
    }
};

// Function to get the student name based on the Discord username
async function getStudentName(discordUsername) {
    return new Promise((resolve, reject) => {
        const query = `SELECT StudentName FROM "Discord Link" WHERE DiscordUsername = ?`;
        db.get(query, [discordUsername], (err, row) => {
            if (err) reject(err);
            resolve(row ? row.StudentName : null);
        });
    });
}

// Function to get feedback rows from a specific table based on the student name
async function getFeedbackFromTable(table, studentName) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM ${table} WHERE "Student Name" = ?`;
        db.all(query, [studentName], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// Function to format feedback based on the table and rows
function formatFeedback(rows, table) {
    let formattedFeedback = '';

    rows.forEach(row => {
        let feedback = '';

        if (table === "Offical Warning" && row['Student Name']) {
            feedback += `Official Warnings:\n`;
            feedback += `⚠️ Student Name: ${row['Student Name']}\n`;
            feedback += `📅 Date of Warning: ${row['Date of Warning'] || 'N/A'}\n`;
            feedback += `📝 Note: ${row['Note'] || 'N/A'}\n\n`;
        }

        if (table === "DA Technical" && (row['Absent'] || row['Excused absence'] || row['Late'])) {
            feedback += `DA Technical:\n`;
            feedback += `❌ Absent: ${row['Absent'] || 'N/A'}\n`;
            feedback += `✅ Excused: ${row['Excused absence'] || 'N/A'}\n`;
            feedback += `⏰ Late: ${row['Late'] || 'N/A'}\n\n`;
        }

        if (table === "DA Business" && (row['Absent'] || row['Excused absence'] || row['Late'])) {
            feedback += `DA Business:\n`;
            feedback += `❌ Absent: ${row['Absent'] || 'N/A'}\n`;
            feedback += `✅ Excused: ${row['Excused absence'] || 'N/A'}\n`;
            feedback += `⏰ Late: ${row['Late'] || 'N/A'}\n\n`;
        }

        if (table === "Equity Training" && (row['Absent'] || row['Excused absence'] || row['Late'])) {
            feedback += `Equity Training:\n`;
            feedback += `❌ Absent: ${row['Absent'] || 'N/A'}\n`;
            feedback += `✅ Excused: ${row['Excused absence'] || 'N/A'}\n`;
            feedback += `⏰ Late: ${row['Late'] || 'N/A'}\n\n`;
        }

        if (table === "CDT" && (row['Absent'] || row['Excused absence'] || row['Late'])) {
            feedback += `Career Development Training:\n`;
            feedback += `❌ Absent: ${row['Absent'] || 'N/A'}\n`;
            feedback += `✅ Excused: ${row['Excused absence'] || 'N/A'}\n`;
            feedback += `⏰ Late: ${row['Late'] || 'N/A'}\n\n`;
        }

        if (table === "Progress Notes" && (row['Week 1'] || row['Week 2'] || row['Week 3'] || row['Week 4'])) {
            feedback += `Progress Notes:\n`;
            feedback += `📅 Week 1: ${row['Week 1'] || 'N/A'}\n`;
            feedback += `📅 Week 2: ${row['Week 2'] || 'N/A'}\n`;
            feedback += `📅 Week 3: ${row['Week 3'] || 'N/A'}\n`;
            feedback += `📅 Week 4: ${row['Week 4'] || 'N/A'}\n\n`;
        }

        formattedFeedback += feedback;
    });

    return formattedFeedback;
}
