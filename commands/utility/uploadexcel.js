const { SlashCommandBuilder } = require('discord.js');
const xlsx = require('xlsx');
const fs = require('fs');

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
            const sheetName = workbook.SheetNames[0]; // Assuming first sheet
            const sheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(sheet);

            // Store in global variable
            global.storedData = jsonData;
            console.log("✅ Data Stored in global.storedData:", global.storedData);

            await interaction.reply({ content: `✅ Successfully uploaded and stored ${jsonData.length} rows of feedback.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Failed to process the Excel file.', ephemeral: true });
        }
    }
};
