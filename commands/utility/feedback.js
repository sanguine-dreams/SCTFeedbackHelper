const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Get your feedback from the uploaded Excel file'),

    async execute(interaction) {
        const user = interaction.user;
        const discordUsername = user.username;
        

        console.log("🔍 Checking global.storedData:", global.storedData);

        if (!global.storedData || Object.keys(global.storedData).length === 0) {
            return interaction.reply({ content: '⚠ No feedback data available. An admin must upload an Excel file first.', ephemeral: true });
        }

        const userMappingSheet = global.storedData["Discord Link"];
        const daTechnical = global.storedData["DA Technical"];
        const daBusiness = global.storedData["DA Business"];
        const equityTraining = global.storedData["Equity Training"];
        const careerDevelopmentTraining = global.storedData["CDT"];
        const progressNotes = global.storedData["Progress Notes"];
        const officialWarning = global.storedData["Offical Warning"];
        

        if (!userMappingSheet || !daBusiness || !equityTraining || !careerDevelopmentTraining || !progressNotes || !officialWarning || !daTechnical ) {
            return interaction.reply({ content: '⚠ Missing required sheets in the Excel file.', ephemeral: true });
        }

        // Find the student's name based on their Discord username
        const userEntry = userMappingSheet.find(entry =>
            entry.DiscordUsername.toLowerCase() === interaction.user.username.toLowerCase()
        );

        if (!userEntry) {
            return interaction.reply({ content: "No linked student name found for you.", ephemeral: true });
        }

        const studentName = userEntry.StudentName.toLowerCase();  // Normalize case
        

        const feedbackRows = officialWarning.filter(entry =>
            entry['Student Name'].toLowerCase() === studentName
        );

        if (feedbackRows.length === 0) {
            return interaction.reply({ content: "No feedback available for you.", ephemeral: true });
        }

// Format only the required columns (e.g., 'Type of Warning' and 'Note')
        const formattedFeedback = feedbackRows.map(row =>
            `⚠️ Warning Type: ${row['Type of Warning']}\n📝 Note: ${row.Note}`
        ).join("\n\n");
        try {
            await user.send(formattedFeedback);
            await interaction.reply({ content: '✅ Your feedback has been sent to your DMs.', ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Could not send you a DM. Check your privacy settings.', ephemeral: true });
        }
    }
};
