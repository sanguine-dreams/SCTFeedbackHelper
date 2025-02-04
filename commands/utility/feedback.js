const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Replies with student feedback'),
    async execute(interaction) {
        // Ensure interaction is deferred or replied to prevent timeout errors
        await interaction.deferReply({ ephemeral: true });

        // Fetch the guild and user directly from interaction
        const guild = interaction.guild;
        const user = interaction.user;

        try {
            await user.send(`Hello, you used the ${interaction.commandName} command in ${guild.name}`);
            await interaction.followUp('Direct message sent successfully!');
        } catch (error) {
            console.error(error);
            await interaction.followUp('Failed to send a direct message.');
        }
    },
};
