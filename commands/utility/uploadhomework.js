const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const https = require('https');
const xlsx = require('xlsx');
const db = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uploadgradingsheet')
        .setDescription('Upload and process a grading sheet')
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('The grading sheet to upload')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const file = interaction.options.getAttachment('file');
        const targetDir = path.join(__dirname, 'uploads');

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filePath = path.join(targetDir, file.name);

        try {
            // Download file
            await new Promise((resolve, reject) => {
                https.get(file.url, (response) => {
                    const fileStream = fs.createWriteStream(filePath);
                    response.pipe(fileStream);
                    fileStream.on('finish', resolve);
                    fileStream.on('error', reject);
                }).on('error', reject);
            });

            // Process Excel
            const workbook = xlsx.readFile(filePath);

            for (const sheetName of workbook.SheetNames) {
                const formattedSheetName = sheetName.replace(/\s+/g, '_'); // Spaces → underscores
                const sheet = workbook.Sheets[sheetName];

                const jsonData = xlsx.utils.sheet_to_json(sheet, {
                    header: 1, // Force array output
                    raw: false,
                    defval: null
                });

                // Find header row
                let headerRowIndex = jsonData.findIndex(row =>
                    row.some(cell => cell?.toString().trim().toLowerCase() === "student name" || cell?.toString().trim().toLowerCase() === "studentname")
                );

                if (headerRowIndex === -1) {
                    console.log(`Skipping ${sheetName}: No student name header`);
                    continue;
                }

                // Process headers (Completely drop "No" column)
                let headers = jsonData[headerRowIndex].map(h =>
                    h?.toString().trim().replace(/[^a-zA-Z0-9_]/g, '') || null
                ).filter(h => h !== null && h.toLowerCase() !== 'no'); // Filter out "No" here

                if (headers.length === 0) {
                    console.log(`Skipping ${sheetName}: No valid headers`);
                    continue;
                }

                console.log(`Headers for ${formattedSheetName}:`, headers);

                // Process data rows, dropping "No" column entirely
                let dataRows = jsonData.slice(headerRowIndex + 1).map(row => {
                    // Drop the first column (assume it's the "No" column if present)
                    return row.length > headers.length ? row.slice(1) : row;
                }).filter(row => row.some(cell => cell)); // Remove entirely empty rows

                if (dataRows.length === 0) {
                    console.log(`Skipping ${sheetName}: No data rows`);
                    continue;
                }

                console.log(`Data rows for ${formattedSheetName}:`, dataRows);

                // Create table
                await createTable(formattedSheetName, headers);

                // Insert data
                for (const row of dataRows) {
                    const rowData = headers.reduce((acc, header, index) => {
                        acc[header] = row[index] || null;
                        return acc;
                    }, {});

                    const studentName = rowData["StudentName"] || rowData["Student_Name"];
                    if (!studentName) {
                        console.log(`Skipping row in ${formattedSheetName}: Missing student name`);
                        continue;
                    }

                    await insertOrUpdateData(formattedSheetName, studentName, rowData, headers);
                }

                console.log(`✅ Processed ${formattedSheetName}`);
            }

            await interaction.editReply('✅ Grading sheet processed successfully!');
        } catch (err) {
            console.error('Error:', err);
            await interaction.editReply('❌ Processing failed');
        } finally {
            fs.unlinkSync(filePath); // Cleanup file
        }
    }
};

// Database functions
async function createTable(tableName, headers) {
    return new Promise((resolve, reject) => {
        const dropQuery = `DROP TABLE IF EXISTS "${tableName}"`;
        db.run(dropQuery, (dropErr) => {
            if (dropErr) return reject(dropErr);

            const columns = headers.map(h => `"${h}" TEXT`).join(', ');
            const createQuery = `CREATE TABLE "${tableName}" (${columns})`;

            db.run(createQuery, (createErr) => {
                if (createErr) reject(createErr);
                else {
                    console.log(`✅ Table ${tableName} recreated`);
                    resolve();
                }
            });
        });
    });
}

async function insertOrUpdateData(table, studentName, rowData, headers) {
    return new Promise((resolve, reject) => {
        const checkQuery = `SELECT 1 FROM "${table}" WHERE "StudentName" = ? OR "Student_Name" = ?`;
        const checkParams = [studentName, studentName];

        db.get(checkQuery, checkParams, (err, row) => {
            if (err) return reject(err);

            if (row) {
                // Update
                const setClause = headers
                    .filter(h => h.toLowerCase() !== 'studentname' && h.toLowerCase() !== 'student_name')
                    .map(h => `"${h}" = ?`)
                    .join(', ');

                const values = headers
                    .filter(h => h.toLowerCase() !== 'studentname' && h.toLowerCase() !== 'student_name')
                    .map(h => rowData[h]);

                values.push(studentName);

                db.run(`UPDATE "${table}" SET ${setClause} WHERE "StudentName" = ? OR "Student_Name" = ?`, values, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                // Insert
                const columns = headers.map(h => `"${h}"`).join(', ');
                const placeholders = headers.map(() => '?').join(', ');

                db.run(
                    `INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`,
                    headers.map(h => rowData[h]),
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            }
        });
    });
}