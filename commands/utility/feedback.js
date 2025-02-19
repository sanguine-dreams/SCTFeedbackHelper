const { SlashCommandBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

// Database connection
const db = new sqlite3.Database('../../feedback.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Get your feedback from the uploaded Excel file'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const user = interaction.user;
        const discordUsername = user.username;

        try {
            // Step 1: Get student name from Discord Link table
            const studentName = await getStudentName(discordUsername);
            if (!studentName) {
                return interaction.editReply({ content: "⚠ No linked student name found for you." });
            }

            // Step 2: Define tables to check for feedback
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

            // Step 3: Loop through tables and retrieve feedback
            for (let table of tables) {
                try {
                    const rows = await getFeedbackFromTable(table, studentName);
                    if (rows.length > 0) {
                        feedbackFound = true;
                        formattedFeedback += formatFeedback(rows, table);
                    }
                } catch (err) {
                    console.warn(`⚠ Skipping table "${table}" due to error: ${err.message}`);
                }
            }

            if (!feedbackFound) {
                return interaction.editReply({ content: "No feedback available for you." });
            }

            // Step 4: Send feedback via DM
            await user.send(formattedFeedback);
            await interaction.editReply({ content: '✅ Your feedback has been sent to your DMs.' });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ An error occurred while fetching your feedback.' });
        }
    }
};

// Function to get the student name from Discord Link table
function getStudentName(discordUsername) {
    return new Promise((resolve, reject) => {
        const query = `SELECT StudentName FROM "Discord Link" WHERE DiscordUsername = ?`;
        db.get(query, [discordUsername], (err, row) => {
            if (err) return reject(err);
            resolve(row ? row.StudentName : null);
        });
    });
}

// Function to get feedback rows from a specific table
function getFeedbackFromTable(table, studentName) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM "${table}" WHERE "Student Name" = ?`;

        db.all(query, [studentName], (err, rows) => {
            if (err) {
                console.warn(`⚠ Table "${table}" may not exist or have a different structure.`);
                return reject(err);
            }
            resolve(rows);
        });
    });
}

// Function to format feedback
function formatFeedback(rows, table) {
    let formattedFeedback = `📌 **${table} Feedback**\n`;

    rows.forEach(row => {
        let feedback = '';

        if (table === "Offical Warning" && row['Student Name']) {
            feedback += `⚠️ **Official Warnings:**\n`;
            feedback += `📅 Date: ${row['Date of Warning'] || 'N/A'}\n`;
            feedback += `📝 Note: ${row['Note'] || 'N/A'}\n\n`;
        }

        if (["DA Technical", "DA Business", "Equity Training", "CDT"].includes(table)) {
            feedback += `${table}:\n`;
            feedback += `❌ Absent: ${row['Absent'] || 'N/A'}\n`;
            feedback += `✅ Excused: ${row['Excused absence'] || 'N/A'}\n`;
            feedback += `⏰ Late: ${row['Late'] || 'N/A'}\n\n`;
        }

        if (table === "Progress Notes") {
            feedback += `Progress Notes:\n`;
            feedback += `📅 Week 1: ${row['Week 1'] || 'N/A'}\n`;
            feedback += `📅 Week 2: ${row['Week 2'] || 'N/A'}\n`;
            feedback += `📅 Week 3: ${row['Week 3'] || 'N/A'}\n`;
            feedback += `📅 Week 4: ${row['Week 4'] || 'N/A'}\n\n`;
        }

        formattedFeedback += feedback;
    });

    return formattedFeedback || 'No specific feedback available.\n\n';
}
