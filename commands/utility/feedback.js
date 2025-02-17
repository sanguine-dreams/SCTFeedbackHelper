const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Get your feedback from the uploaded Excel file'),

    async execute(interaction) {
        const user = interaction.user;
        const discordUsername = user.username;

        console.log("🔍 Checking global.storedData:", global.storedData); // Debug log

        if (!global.storedData || global.storedData.length === 0) {
            return interaction.reply({ content: '⚠ No feedback data available. An admin must upload an Excel file first.', ephemeral: true });
        }

        // Find the feedback for the user
        const feedbackEntry = global.storedData.find(row => row.DiscordUsername?.toLowerCase() === discordUsername.toLowerCase());

        if (!feedbackEntry) {
            return interaction.reply({ content: '⚠ No feedback found for your username.', ephemeral: true });
        }

        try {
            await user.send(`📩 **Your Feedback:**\n${feedbackEntry.Feedback}`);
            await interaction.reply({ content: '✅ Your feedback has been sent to your DMs.', ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Could not send you a DM. Check your privacy settings.', ephemeral: true });
        }
    },
};
