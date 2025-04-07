require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = process.env; // Using environment variables directly
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

        // Clear both global and guild commands
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
        console.log('Successfully cleared global and guild commands.');

        // Debug command list
        console.log('Commands to register:', commands.map(cmd => cmd.name));

        // Register fresh commands
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );
        console.log(`Successfully registered ${data.length} commands.`);
    } catch (error) {
        console.error('Error while registering commands:', error);
    }
})();

