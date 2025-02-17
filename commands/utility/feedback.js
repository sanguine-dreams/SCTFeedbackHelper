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

        const userMappingSheet = global.storedData["UserMapping"];
        const feedbackSheet = global.storedData["Feedback"];

        if (!userMappingSheet || !feedbackSheet) {
            return interaction.reply({ content: '⚠ Missing required sheets in the Excel file.', ephemeral: true });
        }

        // Step 1: Find Student Name from Discord Username
        const userEntry = userMappingSheet.find(row => row.DiscordUsername?.toLowerCase() === discordUsername.toLowerCase());
        if (!userEntry) {
            return interaction.reply({ content: '⚠ No student name found for your Discord username.', ephemeral: true });
        }

        const studentName = userEntry.StudentName;
        console.log(`🔍 Found Student Name: ${studentName}`);

        // Step 2: Find all feedback for that Student Name
        const feedbackEntries = feedbackSheet.filter(row => row.StudentName?.toLowerCase() === studentName.toLowerCase());

        if (feedbackEntries.length === 0) {
            return interaction.reply({ content: '⚠ No feedback found for you.', ephemeral: true });
        }

        // Step 3: Format feedback response
        let feedbackMessage = `📩 **Your Feedback:**\n`;
        feedbackEntries.forEach((entry, index) => {
            feedbackMessage += `\n**Entry ${index + 1}:**\n${entry.Feedback || "No feedback available."}\n`;
        });

        try {
            await user.send(feedbackMessage);
            await interaction.reply({ content: '✅ Your feedback has been sent to your DMs.', ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Could not send you a DM. Check your privacy settings.', ephemeral: true });
        }
    }
};
