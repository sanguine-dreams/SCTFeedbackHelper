const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cleardatabase')
        .setDescription('⚠️ Drops all tables from the database (use with caution!)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Only admins see it

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Double check in case permission override fails
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('🚫 You must be an administrator to use this command.');
        }

        try {
            db.all("SELECT name FROM sqlite_master WHERE type='table'", async (err, tables) => {
                if (err) {
                    console.error('Error fetching tables:', err);
                    return interaction.editReply('❌ Failed to fetch tables.');
                }

                const tableNames = tables
                    .map(t => t.name)
                    .filter(name => name !== 'sqlite_sequence');

                if (tableNames.length === 0) {
                    return interaction.editReply('ℹ️ No tables to drop.');
                }

                for (const name of tableNames) {
                    await new Promise((resolve, reject) => {
                        db.run(`DROP TABLE IF EXISTS "${name}"`, err => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    console.log(`Dropped table: ${name}`);
                }

                await interaction.editReply(`✅ Dropped ${tableNames.length} tables.`);
            });
        } catch (err) {
            console.error('Error clearing database:', err);
            await interaction.editReply('❌ Something went wrong.');
        }
    }
};
