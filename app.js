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
        "#datmatheeinhorn",
        "#c183649"
    ]
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

let streamerVars = {
    // "#datmatheinhorn": {
    //     "oldMessages": {},
    //     "bannedWords": [],
    //     "timedMessages": [],
    //     "msgBetween": 6
    // },
    // "#c183649": {
    //     "oldMessages": {},
    //     "bannedWords": ["fortnite"],
    //     "timedMessages": [],
    //     "msgBetween": 6
    // }
};

function timedMessage(streamer) {
    if (streamerVars[streamer]["msgBetween"] > 5) {
        streamerVars[streamer]["msgBetween"] = 0;
        client.say(streamer, "Ich sage das alle 5 Minuten");
    }
}


for (let streamer of opts["channels"]) {
    streamerVars[streamer] = {
        oldMessages: {},
        bannedWords: [],
        timedMessages: [],
        msgBetween: 6
    };
}
streamerVars["#c183649"]["bannedWords"].push("fortnite");
streamerVars["#c183649"]["timedMessages"].push("Ich sage das alle 5 Minuten");
fs.readFile("filter.txt", (err, buf) => {
    if (err) {console.warn("could not read filter.txt"); return;}
    let data = buf.toString().trim();
    let lines = data.split("\n");
    for (let line of lines) {
        streamerVars["#datmatheeinhorn"].bannedWords.push(line.toLowerCase());
    }
});

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
    let time = new Date();
    if (self) { return; } // Ignore messages from the bot
    streamerVars[streamer].msgBetween++;
    let user = context.username;
    console.log(streamer, user, context, msg);
    // word listener
    if (find("nightbot", msg)) {
        client.say(streamer, "Nightbot ist tot! Ich hab ihn umgebracht! >:)");
    }
    // quick messages spam protection
    if (!streamerVars[streamer].oldMessages[user]) {
        streamerVars[streamer].oldMessages[user] = [time.getTime()];
    } else {
        streamerVars[streamer].oldMessages[user].push(time.getTime());
    }
    for (let i = streamerVars[streamer].oldMessages[user].length -1; i >= 0; i--) {
        let t = streamerVars[streamer].oldMessages[user][i];
        if (t < time.getTime()-(1000*30)) {
            streamerVars[streamer].oldMessages[user].splice(i, 1);
        }
    }
    if (streamerVars[streamer].oldMessages[user].length > 5) {
        strike(streamer, user, "zu viele nachrichten zu schnell");
    }
    // word filter protection
    for (let badLine of streamerVars[streamer].bannedWords) {
        if (find(badLine, msg.toLowerCase())) {
            strike(streamer, user, "kannst du das auch ohne '"+badLine+"' sagen?");
        }
    }

    
    let args = msg.trim().split(" ");
    let commandName = args.shift();
    // client.say(streamer, answer);
    switch(commandName) {
        case "!timemeout":
            strike(streamer, user, "du wolltest es so");
            break
        case "!filter":
            if (args[0] == "add") {
                fs.readFile("filter.txt", (err, buf) => {
                    if (err) {
                        console.warn("could not read filter.txt");
                        return;
                    }
                    let data = buf.toString().trim();
                    args.shift();
                    let newFilterFile = data+"\n"+args.join(" ").toLowerCase();
                    fs.writeFile("filter.txt", newFilterFile);
                });
                client.say(streamer, "added "+args.join(" ")+ "to the filter list");
            } else if (args[0] == "remove") {
                fs.readFile("filter.txt", (err, buf) => {
                    if (err) {
                        console.warn("could not read filter.txt");
                        return;
                    }
                    let data = buf.toString().trim();
                    args.shift();
                    let lines = data.split("\n");
                    let newFilterFile = "";
                    for (let line of lines) {
                        if (line == args.join(" ").toLowerCase()) {
                            continue;
                        }
                        else {
                            newFilterFile += line + "\n";
                        }
                    }
                    
                    fs.writeFile("filter.txt", newFilterFile);
                });
                client.say(streamer, "removed "+args.join(" ")+" from the filter list")
            } else {
                client.say(streamer, "error! syntax: !filter <add|remove> <word or phrase>")
            }
            break;
        case "!trusted":
            if (args[0] == "add") {
                fs.readFile("trusted.txt", (err, buf) => {
                    if (err) {
                        console.warn("could not read trusted.txt");
                        return;
                    }
                    let data = buf.toString().trim();
                    args.shift();
                    let newFilterFile = data+"\n"+args.join(" ").toLowerCase();
                    fs.writeFile("trusted.txt", newFilterFile);
                });
                client.say(streamer, "added "+args.join(" ")+ "to the trusted users list");
            } else if (args[0] == "remove") {
                fs.readFile("trusted.txt", (err, buf) => {
                    if (err) {
                        console.warn("could not read trusted.txt");
                        return;
                    }
                    let data = buf.toString().trim();
                    args.shift();
                    let lines = data.split("\n");
                    let newFilterFile = "";
                    for (let line of lines) {
                        if (line == args.join(" ").toLowerCase()) {
                            continue;
                        }
                        else {
                            newFilterFile += line + "\n";
                        }
                    }
                    
                    fs.writeFile("trusted.txt", newFilterFile);
                });
                client.say(streamer, "removed "+args.join(" ")+" from the trusted users list")
            } else if (args[0] == "show" || true) {
                fs.readFile("trusted.txt", (err, buf) => {
                    if (err) {
                        console.warn("could not read trusted.txt");
                        return;
                    }
                    let data = buf.toString().trim();
                    data = data.replace("\n", ", ")
                    client.say(streamer, data);
                });
            }
            break;
        case "!notiz":
            if (args[0] == "add") {
                fs.readFile("notiz.txt", (err, buf) => {
                    if (err) {
                        console.warn("could not read notiz.txt");
                        return;
                    }
                    let data = buf.toString().trim();
                    args.shift();
                    let newFilterFile = data+"\n"+args.join(" ").toLowerCase();
                    fs.writeFile("notiz.txt", newFilterFile);
                });
                client.say(streamer, "added "+args.join(" ")+ "to the notiz list");
            } else if (args[0] == "remove") {
                fs.readFile("notiz.txt", (err, buf) => {
                    if (err) {
                        console.warn("could not read notiz.txt");
                        return;
                    }
                    let data = buf.toString().trim();
                    args.shift();
                    let lines = data.split("\n");
                    let newFilterFile = "";
                    for (let line of lines) {
                        if (line == args.join(" ").toLowerCase()) {
                            continue;
                        }
                        else {
                            newFilterFile += line + "\n";
                        }
                    }
                    
                    fs.writeFile("notiz.txt", newFilterFile);
                });
                client.say(streamer, "removed "+args.join(" ")+" from the notiz list")
            } else if (args[0] == "show" || true) {
                fs.readFile("notiz.txt", (err, buf) => {
                    if (err) {
                        console.warn("could not read notiz.txt");
                        return;
                    }
                    let data = buf.toString().trim();
                    data = data.replace("\n", ", ")
                    client.say(streamer, data);
                });
            }
            break;
        case "!commands":
            if context.
            break;
        // case "":
            // break;
        default:
            if (count(commandName, counter) > 0) {
                let counter;
                fs.readFile("counter.json", (err, buf) => {
                    if (err) {
                        console.warn("could not read counter.json");
                    }
                    let data = buf.toString();
                    counter = JSON.parse(data);
                });
                try{
                    counter[commandName]++;
                } catch (e) {
                    counter[commandName] = 1;
                }
                fs.writeFile("counter.json", JSON.stringify(counter, null, 4), function(err) {
                    if (err) {
                        console.log(err);
                    }
                });
            }
            break;
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
    for (let streamer of opts["channels"]) {
        for (let msg of streamerVars[streamer]["timedMessages"]) {
            setInterval(() => {timedMessage(streamer, msg)}, 5000);
        }
    }
}