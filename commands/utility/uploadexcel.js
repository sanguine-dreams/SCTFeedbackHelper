const { SlashCommandBuilder } = require('discord.js');
const xlsx = require('xlsx');
const sqlite3 = require('sqlite3').verbose();

// Database connection
const db = new sqlite3.Database('./databse.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uploadexcel')
        .setDescription('Upload an Excel file with student feedback.')
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('The Excel file to upload')
                .setRequired(true)
        ),

    async execute(interaction) {
        const file = interaction.options.getAttachment('file');

        if (!file) {
            return interaction.reply({ content: 'Please attach a valid Excel file.', ephemeral: true });
        }

        try {
            const response = await fetch(file.url);
            const buffer = await response.arrayBuffer();
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            
            

            // Loop through each sheet in the workbook
            workbook.SheetNames.forEach(sheetName => {
                const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

                if (sheetData.length > 0) {
                    // Create table for each sheet
                    const columns = Object.keys(sheetData[0]);  // Get columns from the first row
                    const columnDefinitions = columns.map(col => `${col} TEXT`).join(', ');  // Define columns for table
                    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${sheetName} (${columnDefinitions});`;

                    // Execute the CREATE TABLE query
                    db.run(createTableQuery, (err) => {
                        if (err) {
                            console.error(`Error creating table for sheet ${sheetName}:`, err);
                        } else {
                            console.log(`Table for sheet "${sheetName}" created or already exists.`);
                        }
                    });

                    // Insert rows into the created table
                    sheetData.forEach(row => {
                        const placeholders = columns.map(() => '?').join(', ');
                        const insertQuery = `INSERT INTO ${sheetName} (${columns.join(', ')}) VALUES (${placeholders});`;

                        db.run(insertQuery, columns.map(col => row[col]), (err) => {
                            if (err) {
                                console.error(`Error inserting row into ${sheetName}:`, err);
                            }
                        });
                    });
                }
            });

            await interaction.reply({ content: `✅ Successfully uploaded and stored data from ${workbook.SheetNames.length} sheets.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Failed to process the Excel file.', ephemeral: true });
        }
    }
};
