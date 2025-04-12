require('dotenv').config();
const { REST, Routes } = require('discord.js');
// ✅ Read from environment variables
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log('Fetching and clearing existing commands...');

        // Optional: clear global and guild commands
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
        console.log('Successfully cleared global and guild commands.');

        // Debug command list
        console.log('Commands to register:', commands.map(cmd => cmd.name));

        // 🔄 Register fresh commands globally (not just one guild)
        const data = await rest.put(
            Routes.applicationCommands(clientId), // 🔁 GLOBAL registration
            { body: commands }
        );
        console.log(`✅ Successfully registered ${data.length} global commands.`);
        console.log(`⌛ Note: Global commands may take up to 1 hour to appear.`);
    } catch (error) {
        console.error('❌ Error while registering commands:', error);
    }
})();

