const tmi = require('tmi.js');
const express = require("express");
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
    password: "oauth:6jyll6iofod0gxegj13s6sc7d9pxze"
  },
  channels: [
    "datmatheeinhorn"
  ]
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.trim();

  // If the command is known, let's execute it
  // client.say(target, answer);
  switch(commandName) {
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
    // case "":
    // break
    default:
        break;
  }
}

// Function called when the "dice" command is issued
function rollDice () {
  const sides = 6;
  return Math.floor(Math.random() * sides) + 1;
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}