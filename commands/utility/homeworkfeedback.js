const {SlashCommandBuilder} = require('@discordjs/builders');
const db = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('homeworkfeedback')
        .setDescription('Retrieve homework feedback for a student based on Discord username'),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});
        const discordUsername = interaction.user.username;

        try {
            // Step 1: Find the StudentName linked to the Discord username
            const linkQuery = `SELECT "StudentName" FROM "DiscordLink" WHERE "DiscordUsername" = ?`;
            db.get(linkQuery, [discordUsername], (err, row) => {
                if (err) {
                    console.error('Error querying DiscordLink:', err);
                    interaction.editReply('❌ Error retrieving student link.');
                    return;
                }

                if (!row || !row.StudentName) {
                    console.warn(`⚠ No student name linked to Discord username: ${discordUsername}`);
                    interaction.editReply(`⚠ No student name linked to Discord username: ${discordUsername}`);
                    return;
                }

                const studentName = row.StudentName; // Student name retrieved successfully
                console.log(`StudentName found: ${studentName}`);

                // Step 2: Retrieve all tables in the database
                const getTablesQuery = `SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`;
                db.all(getTablesQuery, [], (err, tables) => {
                    if (err) {
                        console.error('Error retrieving table names:', err);
                        interaction.editReply('❌ Error retrieving tables.');
                        return;
                    }

                    if (!tables.length) {
                        interaction.editReply('⚠ No tables found in the database.');
                        return;
                    }

                    console.log('Tables found:', tables.map(t => t.name)); // Log all table names
                    const results = [];
                    let tablesProcessed = 0;

                    // Step 3: Iterate through each table and check for feedback
                    tables.forEach((table) => {
                        const tableName = table.name;

                        // Check PRAGMA information for the table's schema
                        const pragmaQuery = `PRAGMA table_info("${tableName}")`;
                        db.all(pragmaQuery, [], (err, columns) => {
                            if (err) {
                                console.error(`Error checking schema for table "${tableName}":`, err);
                                tablesProcessed++;
                                if (tablesProcessed === tables.length) {
                                    sendResults(interaction, results, studentName);
                                }
                                return;
                            }

                            // Check if the table has a "StudentName" column
                            const hasStudentNameColumn = columns.some(column => column.name === 'StudentName');
                            if (!hasStudentNameColumn) {
                                console.log(`Table "${tableName}" does not have a "StudentName" column. Skipping.`);
                                tablesProcessed++;
                                if (tablesProcessed === tables.length) {
                                    sendResults(interaction, results, studentName);
                                }
                                return;
                            }

                            // Query the table for rows with the matching student name
                            const query = `SELECT * FROM "${tableName}" WHERE "StudentName" = ?`;
                            db.all(query, [studentName], (err, rows) => {
                                if (err) {
                                    console.error(`Error querying table "${tableName}":`, err);
                                    tablesProcessed++;
                                    if (tablesProcessed === tables.length) {
                                        sendResults(interaction, results, studentName);
                                    }
                                    return;
                                }

                                if (rows.length > 0) {
                                    console.log(`Rows found in table "${tableName}" for StudentName = ${studentName}:`, rows);
                                    results.push({table: tableName, rows});
                                } else {
                                    console.log(`No rows found in table "${tableName}" for StudentName = ${studentName}`);
                                }

                                tablesProcessed++;
                                if (tablesProcessed === tables.length) {
                                    sendResults(interaction, results, studentName);
                                }
                            });
                        });
                    });
                });
            });

            // Helper function to send the results to the user
            function sendResults(interaction, results, studentName) {
                if (results.length === 0) {
                    interaction.editReply(`⚠ No results found for ${studentName} in the database.`);
                    return;
                }

                let message = `📋 **Results for ${studentName}:**\n`;

                results.forEach((result, index) => {
                    message += `\n✨ **Section: ${result.table}**\n`;
                    result.rows.forEach((row, rowIndex) => {
                        message += `\n🔹 **Entry ${index + 1}.${rowIndex + 1}**\n`;

                        Object.entries(row).forEach(([key, value]) => {
                            if (key !== 'StudentName') {
                                message += `• **${key}:** \`${value || 'N/A'}\`\n`;
                            }
                        });
                    });
                });

                // Providing the user a prettier message via DM
                interaction.user.send(message)
                    .then(() => {
                        interaction.editReply('✅ Feedback has been sent to your direct messages!');
                    })
                    .catch((err) => {
                        console.error('Failed to send DM:', err);
                        interaction.editReply('⚠ Failed to send feedback via DM. Make sure your DMs are enabled!');
                    });
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            interaction.editReply('❌ An unexpected error occurred.');
        }
    }
};