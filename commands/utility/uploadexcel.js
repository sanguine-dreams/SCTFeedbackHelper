const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const https = require('https');
const xlsx = require('xlsx');
const db = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uploadexcel')
        .setDescription('Upload and process an Excel file')
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('The Excel file to upload')
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
                const formattedSheetName = sheetName.replace(/\s+/g, '_');
                const sheet = workbook.Sheets[sheetName];

                const jsonData = xlsx.utils.sheet_to_json(sheet, {
                    header: 1,
                    raw: false,
                    defval: null
                });

                // Find header row
                let headerRowIndex = jsonData.findIndex(row =>
                    row.some(cell => cell?.toString().trim().toLowerCase() === "student name")
                );

                if (headerRowIndex === -1) {
                    console.log(`Skipping ${sheetName}: No student name header`);
                    continue;
                }

                // Check if the first column is purely numbers (serial numbers)
                const isFirstColumnNumeric = jsonData
                    .slice(headerRowIndex + 1) // Ignore headers, check data rows
                    .every(row => !isNaN(row[0]) && row[0] !== null && row[0] !== '');

                // If first column is numeric, ignore it; otherwise, keep all columns
                const adjustedJsonData = jsonData.map(row => (isFirstColumnNumeric ? row.slice(1) : row));

                // Process headers
                let headers = adjustedJsonData[headerRowIndex]
                    .map(h => h?.toString().trim().replace(/[^a-zA-Z0-9_]/g, '') || null)
                    .filter(h => h !== null);

                if (headers.length === 0) {
                    console.log(`Skipping ${sheetName}: No valid headers`);
                    continue;
                }

                // Process data rows
                const dataRows = adjustedJsonData.slice(headerRowIndex + 1)
                    .map(row => row.map(cell => cell?.toString().trim() || null))
                    .filter(row => row.some(cell => cell));

                if (dataRows.length === 0) {
                    console.log(`Skipping ${sheetName}: No data rows`);
                    continue;
                }

                // Create table
                await createTable(formattedSheetName, headers);

                // Insert data
                for (const row of dataRows) {
                    const rowData = headers.reduce((acc, header, index) => {
                        acc[header] = row[index] || null;
                        return acc;
                    }, {});

                    const studentName = rowData["Student_Name"] || rowData["StudentName"];
                    if (!studentName) {
                        console.log(`Skipping row in ${formattedSheetName}: Missing student name`);
                        continue;
                    }

                    await insertOrUpdateData(formattedSheetName, studentName, rowData, headers);
                }
                console.log(`✅ Processed ${formattedSheetName}`);
            }

            await interaction.editReply('✅ File processed successfully!');
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
        db.run(`PRAGMA foreign_keys = OFF`, (err) => {
            if (err) return reject(err);

            const columns = headers.map(h => `"${h}" TEXT`).join(', ');
            const query = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columns})`;

            db.run(query, (err) => {
                if (err) reject(err);
                else {
                    console.log(`Table ${tableName} created/verified`);
                    resolve();
                }
            });
        });
    });
}

async function insertOrUpdateData(table, studentName, rowData, headers) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT 1 FROM "${table}" WHERE "Student_Name" = ? OR "StudentName" = ?`,
            [studentName, studentName],
            async (err, row) => {
                if (err) return reject(err);

                if (row) {
                    const setClause = headers
                        .filter(h => h !== 'Student_Name' && h !== 'StudentName')
                        .map(h => `"${h}" = ?`)
                        .join(', ');

                    const values = headers
                        .filter(h => h !== 'Student_Name' && h !== 'StudentName')
                        .map(h => rowData[h]);

                    values.push(studentName);

                    if (setClause.trim()) {
                        db.run(
                            `UPDATE "${table}" SET ${setClause} WHERE "Student_Name" = ? OR "StudentName" = ?`,
                            values,
                            (err) => {
                                if (err) reject(err);
                                else {
                                    console.log(`🔄 Updated ${studentName} in ${table}`);
                                    resolve();
                                }
                            }
                        );
                    } else {
                        console.log(`⚠ Skipping update: No valid columns to update for ${studentName}`);
                        resolve();
                    }

                } else {
                    const columns = headers.map(h => `"${h}"`).join(', ');
                    const placeholders = headers.map(() => '?').join(', ');

                    db.run(
                        `INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`,
                        headers.map(h => rowData[h]),
                        (err) => {
                            if (err) reject(err);
                            else {
                                console.log(`✅ Inserted ${studentName} into ${table}`);
                                resolve();
                            }
                        }
                    );
                }
            }
        );
    });
}
