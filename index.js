import { Client } from 'tmi.js';
import Conf from 'conf';
const config = new Conf();
const REGEX_COUNTER = /\+?%{(.+)}/g;

const USERNAME = "USERNAME";
const OAUTH_TOKEN = "oauth:TEST_OAUTH";
const CHANNELS = ["Channel1", "Channel2"];

const ROLE = {
	EVERYONE: 0,
	MOD: 1,
	STREAMER: 2, // Only the channel owner can use the command
}

const COMMANDS = [
{
    command: "!message",
    message: `A normal custom message`,
    role: ROLE.EVERYONE
},
{
    command: "!follow",
    message: `Follow this channel: ::1::`,
    role: ROLE.MOD // Only mods can use the command
    // Example: !follow Narref_
},
{
    command: "!counter",
    message: `Counter +%{counter}`,
    role: ROLE.EVERYONE
    // A counter that increases its value each time is used
},
{
    command: "!showcounter",
    message: `Counter has been used %{counter} times`,
    role: ROLE.EVERYONE
    // To show the counter remove the '+' at the start of the counter
},
{
    command: "!countdown",
    customCode: async (client, channel) => {
        const COUNTDOWN_SECONDS = 5; // Change this value to change the countdown time
        for (let index = COUNTDOWN_SECONDS; index >= 0; index--) {
            client.say(channel, `${index}`);
            await sleep(1000);
        }
    },
    role: ROLE.MOD
},

];

const client = new Client({
	options: { debug: true },
	identity: {
		username: USERNAME,
		password: OAUTH_TOKEN
	},
	channels: CHANNELS
});

client.connect().then(() => {
    console.log('TwitchBot connected successfully');
});

client.on('message', async (channel, tags, message, self) =>  {
	if (self) return; // Ignore echoed messages.

    var senderRole = ROLE.EVERYONE;
    if (tags.mod) {
        senderRole = ROLE.MOD;
    } else if ("#"+tags.username == channel) {
        senderRole = ROLE.STREAMER;
    }

    COMMANDS.forEach(command => {
		if(command.isExecuting) {
			console.log(`Command ${command} is already executing`);
		}
        if(senderRole >= command.role && (message == undefined || message.startsWith(command.command)) && !command.isExecuting) {
            console.log(`Executing command ${command} triggered by user ${tags.username}`);
            var finalMessage = command.message;
            if (command.customCode != null) {
                command.isExecuting = true;
                command.customCode(client, channel, command);
                command.isExecuting = false;
            } else {
                finalMessage = replaceParams(message, finalMessage);
                finalMessage = replaceAndUpdateCounters(finalMessage);

                client.say(channel, finalMessage);
            }
        }
    });

});

function replaceAndUpdateCounters(commandMessage) {
    var matches = Array.from(commandMessage.matchAll(REGEX_COUNTER));
    matches.forEach((res) => {
        var counterName = res[1];
        var index = config.get(counterName) != null ? config.get(counterName) : 0;
        console.log(`Counter with name ${counterName} has been used ${index} times`);
        if (res[0].startsWith("+")) {
            console.log("Updating counter");
            index++;
            config.set(counterName, index);
        }
        commandMessage = commandMessage.replace(res[0], index);
    });
    return commandMessage;
}

function replaceParams(message, commandMessage) {
    var splittedMessage = message.split(' ');
    for (let index = 0; index < splittedMessage.length; index++) {
        const element = splittedMessage[index];
        commandMessage = commandMessage.replace(new RegExp(`::${index}::`, "g"), element);
    }
    return commandMessage;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}  