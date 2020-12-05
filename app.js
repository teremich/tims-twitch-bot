const tmi = require('tmi.js');
const express = require("express");
const fs = require("fs");

const app = express();
port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening at ${port}`);
});
app.use(express.static("public"));
app.use(express.json({limit:"1mb"}));

// Define configuration options
const opts = {
    identity: {
        username: "der_waschbaerbot",
        password: process.env.password || "oauth:6q5g0j0cyqzl04f77okfrt1tp1ifoh"
    },
    channels: [
        "datmatheeinhorn",
        "c183649"
    ]
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

function timedMessage(streamer) {
    client.say(streamer, "Ich sage das alle 5 Minuten");
}

let oldMessages = {};

function strike(streamer, user, reason) {
    client.timeout(streamer,user, 5, reason);
}

function count(item, list) {
    let c = 0;
    for (let i of list) {
        if (i == item) {
            c++;
        }
    }
    return c;
}

function find(substr, longstr) {
    for (let i = 0; i < longstr.length-substr.length+1; i++) {
        if (longstr.substr(i, substr.length) == substr) {
            return true;
        }
    }
    return false;
}

// Called every time a message comes in
function onMessageHandler (streamer, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot
    let user = context.username;
    console.log(streamer, user, context, msg);
    if (find("nightbot", msg)) {
        client.say(streamer, "Nightbot ist tot! Ich hab ihn umgebracht! >:)");
    }
    // Remove whitespace from chat message
    const commandName = msg.trim();
    if (!oldMessages[user]) {
        oldMessages[user] = [msg];
    } else {
        oldMessages[user].push(msg);
    }
    if (count(msg, oldMessages[user]) > 3) {
        strike(streamer, name, "bitte hoer auf diese nachricht zu senden");
    }

  // simple commands (no arguments)
  // client.say(streamer, answer);
  switch(commandName) {
    case "!hallo":
        client.say(streamer, user+", hallo!");
        break
    case "!timemeout":
        strike(streamer, user, "du wolltest es so");
        break
    // case "":
    // break
    // case "":
    // break
    // case "":
    // break
    // case "":
    // break
    // case "":
    // break
    default:
        break;
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
    setInterval(timedMessage, 5*60*1000);
}