const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cleardatabase')
        .setDescription('⚠️ Drops all tables from the database (use with caution!)'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Get all table names
            db.all("SELECT name FROM sqlite_master WHERE type='table'", async (err, tables) => {
                if (err) {
                    console.error('Error fetching tables:', err);
                    await interaction.editReply('❌ Failed to fetch tables.');
                    return;
                }

                const tableNames = tables.map(t => t.name).filter(name => name !== 'sqlite_sequence');

                if (tableNames.length === 0) {
                    await interaction.editReply('ℹ️ No tables to drop.');
                    return;
                }

                // Drop each table
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
