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
    password: process.env.password
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

function timedMessage() {
  client.say("Ich sage das alle 5 Minuten");
}

let passedMessages = {};

function strike(target) {
  // STRIKE SYSTEM
}

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  console.log(context);
  // Remove whitespace from chat message
  const commandName = msg.trim();
  if (!passedMessages[target]) {
    passedMessages[target] = [msg];
  } else {
    passedMessages[target].push(msg);
  }
  if (count(msg, passedMessages[target]) > 3) {
    strike(target);
  }

  // If the command is known, let's execute it
  // client.say(target, answer);
  switch(commandName) {
    case "":
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