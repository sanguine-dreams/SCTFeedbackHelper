if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development'; // default to dev if not set
}
require('dotenv').config({
    path: process.env.NODE_ENV === 'production' ? '.env' : '.env.dev'
});

const fs = require('node:fs');
const path = require('node:path');

const {Client, Collection, Events, GatewayIntentBits, MessageFlags} = require('discord.js');
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error(`Error: DISCORD_TOKEN is not defined in ${process.env.NODE_ENV}. ${token}`);
    process.exit(1); // Exit the process if token is missing
}
global.storedData = []; // Store parsed Excel data
const client = new Client({intents: [GatewayIntentBits.Guilds]});

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);


for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral
            });
        } else {
            await interaction.reply({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
});

client.login(token);