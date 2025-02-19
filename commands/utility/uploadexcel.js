const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const https = require('https');
const xlsx = require('xlsx');
const db = require('../../database'); // Import the db instance

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uploadexcel')
        .setDescription('Upload and process an Excel file')
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('The Excel file to upload')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); // Acknowledge the command
        const file = interaction.options.getAttachment('file');
        const targetDir = path.join(__dirname, 'uploads');

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir);
        }

        const filePath = path.join(targetDir, file.name);

        try {
            // Download the file
            await new Promise((resolve, reject) => {
                https.get(file.url, (response) => {
                    const fileStream = fs.createWriteStream(filePath);
                    response.pipe(fileStream);
                    fileStream.on('finish', resolve);
                    fileStream.on('error', reject);
                }).on('error', reject);
            });

            console.log(`File saved to: ${filePath}`);

            // Read the Excel file
            const workbook = xlsx.readFile(filePath);

            // Loop through all sheets
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];

                // Read the sheet as raw rows (no headers)
                const jsonData = xlsx.utils.sheet_to_json(sheet, {
                    header: 1, // Return all rows as arrays (no headers)
                    raw: false,
                    defval: null
                });

                // Find the header row dynamically
                let headerRowIndex = -1;
                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i].map(cell =>
                        cell ? cell.toString().trim().toLowerCase() : ""
                    );
                    if (row.includes("student name")) {
                        headerRowIndex = i;
                        break;
                    }
                }

                // Skip sheet if "Student Name" header is not found
                if (headerRowIndex === -1) {
                    console.log(`Skipping sheet "${sheetName}" - No "Student Name" found.`);
                    continue;
                }

                // Extract headers from the identified row
                let headers = jsonData[headerRowIndex].map((h, index) =>
                    h ? h.toString().trim() : null
                );

                // Remove completely empty columns
                const validColumns = headers.map((h, index) => (h ? index : null)).filter(i => i !== null);
                headers = headers.filter(h => h !== null);

                // If no valid headers remain, skip this sheet
                if (headers.length === 0) {
                    console.log(`Skipping sheet "${sheetName}" - No valid headers found.`);
                    continue;
                }

                // Extract data rows (skip empty rows)
                const dataRows = jsonData.slice(headerRowIndex + 1)
                    .map(row => validColumns.map(colIndex => row[colIndex] || null)) // Only keep valid columns
                    .filter(row => row.some(cell => cell !== null && cell.toString().trim() !== ""));

                // Ensure the table exists before inserting data
                await createTableIfNotExists(sheetName, headers);

                // Insert data (ensure it matches header length)
                for (const row of dataRows) {
                    const rowData = headers.reduce((acc, header, index) => {
                        acc[header] = row[index]?.toString().trim() || null;
                        return acc;
                    }, {});

                    await insertData(sheetName, rowData, headers);
                }

                console.log(`✅ Successfully processed sheet: ${sheetName}`);
            }

            await interaction.editReply({ content: '✅ File uploaded and processed successfully!' });

        } catch (err) {
            console.error('Error processing the file:', err);
            await interaction.editReply({ content: '❌ Failed to process the file.' });
        }
    }
};

// Function to create a table if it doesn't exist
function createTableIfNotExists(tableName, columns) {
    return new Promise((resolve, reject) => {
        const query = `PRAGMA table_info(\`${tableName}\`)`; // Updated query syntax

        db.all(query, (err, rows) => {
            if (err) {
                console.error('Error checking table info:', err);
                return reject(err);
            }

            // If the table doesn't exist, create it
            if (rows.length === 0) {
                console.log(`Table "${tableName}" does not exist, creating it.`);
                const columnsDefinition = columns.map(col => `"${col}" TEXT`).join(', ');
                const createQuery = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${columnsDefinition})`;

                db.run(createQuery, (createErr) => {
                    if (createErr) {
                        console.error('Error creating table:', createErr);
                        return reject(createErr);
                    }
                    console.log(`Table "${tableName}" created successfully.`);
                    resolve();
                });
            } else {
                console.log(`Table "${tableName}" already exists.`);
                resolve(); // Table already exists, resolve the promise
            }
        });
    });
}

// Function to insert data into the table
function insertData(tableName, rowData, headers) {
    return new Promise((resolve, reject) => {
        const columns = headers.map(h => `"${h}"`).join(', ');
        const placeholders = headers.map(() => '?').join(', ');
        const values = headers.map(h => rowData[h]);

        const query = `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`;

        db.run(query, values, (err) => {
            if (err) {
                console.error('Error inserting data:', err);
                return reject(err);
            }
            resolve();
        });
    });
}
