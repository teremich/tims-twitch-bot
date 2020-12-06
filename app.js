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
        "#datmatheeinhorn"
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
        strikes: {},
        msgBetween: 0
    };
}
fs.readFile("filter.txt", (err, buf) => {
    if (err) {console.warn("could not read filter.txt"); return;}
    let data = buf.toString().trim();
    let lines = data.split("\n");
    for (let line of lines) {
        streamerVars["#datmatheeinhorn"].bannedWords.push(line.toLowerCase());
    }
});

function strike(streamer, user, reason) {
    let now = new Date();
    if (!streamerVars[streamer]["strikes"][user]) {
        streamerVars[streamer]["strikes"][user] = [now.getTime()];
    } else {
        for (let i = streamerVars[streamer]["strikes"][user].length - 1; i >= 0; i--) {
            let d = streamerVars[streamer]["strikes"][user][i];
            if (d < now.getTime() - 1000*60*30) {
                streamerVars[streamer]["strikes"][user].splice(i, 1);
            }
        }

    }
    switch(streamerVars[streamer]["strikes"][user].length) {
        case 1:
            client.timeout(streamer,user, 5, reason);
            break;
        case 2:
            client.timeout(streamer,user, 10, reason);
            break;
        case 3:
            client.timeout(streamer,user, 60, reason);
            break;
        case 4:
            client.timeout(streamer,user, 300, reason);
            break;
        case 5:
            client.timeout(streamer,user, 600, reason);
            break;
        case 6:
            client.timeout(streamer,user, 3600, reason);
            break;
        default:
            console.log("something went wrong with a strike", streamer, user, streamerVars[streamer]["strikes"]);
    }
}

function trust(user) {
    fs.readFile("trusted.txt", (err, buf) => {
        if (err) {
            console.warn("could not read trusted.txt");
            return;
        }
        let data = buf.toString().trim();
        data = data.replace("\n", ", ")
        return find(user, data);
    });
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
    // console.log(streamer, user, context, msg);
    // word listener
    if (find("nightbot", msg.toLowerCase())) {
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
        if (t < time.getTime()-(1000*20)) {
            streamerVars[streamer].oldMessages[user].splice(i, 1);
        }
    }
    if (streamerVars[streamer].oldMessages[user].length > 5) {
        strike(streamer, user, "zu viele nachrichten zu schnell");
        return;
    }
    // word filter protection
    for (let badLine of streamerVars[streamer].bannedWords) {
        if (find(badLine, msg.toLowerCase())) {
            strike(streamer, user, "kannst du das auch ohne '"+badLine+"' sagen?");
        }
    }
    // link protection
    for (let i = 1; i < msg.length-2; i++) {
        if (msg[i] == "." && msg[i-1] != " " && msg[i+1] != " ") {
            strike(streamer, user, "Bitte sende sowas nicht, man koennte sonst denken es sei ein link");
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
            if (!context.mod) {
                break;
            }
            if (args[0] == "add") {
                fs.readFile("filter.txt", (err, buf) => {
                    if (err) {
                        console.warn("could not read filter.txt");
                        return;
                    }
                    let data = buf.toString().trim();
                    args.shift();
                    let newFilterFile = data+"\n"+args.join(" ").toLowerCase();
                    fs.writeFile("filter.txt", newFilterFile, (err) => {
                        if (err) {
                            console.warn(err);
                            return;
                        }
                        client.say(streamer, "added "+args.join(" ")+ " to the filter list");
                    });
                });
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
                    
                    fs.writeFile("filter.txt", newFilterFile, (err) => {
                        if (err) {
                            console.warn(err);
                            return;
                        }
                        client.say(streamer, "removed "+args.join(" ")+" from the filter list")
                    });
                });
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
                    fs.writeFile("trusted.txt", newFilterFile, (err) => {
                        if (err) {
                            console.warn(err);
                            return;
                        }
                        client.say(streamer, "added "+args.join(" ")+ " to the trusted users list");
                    });
                });
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
                    
                    fs.writeFile("trusted.txt", newFilterFile, (err) => {
                        if (err) {
                            console.warn(err);
                            return;
                        }
                        client.say(streamer, "removed "+args.join(" ")+" from the trusted users list");
                    });
                });
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
                    fs.writeFile("notiz.txt", newFilterFile, (err) => {
                        if (!err) {
                            client.say(streamer, "added "+args.join(" ")+ " to the notiz list");
                        } else {
                            console.warn(err);
                        }
                    });
                });
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
                    
                    fs.writeFile("notiz.txt", newFilterFile, (err) => {
                        if (err) {
                            console.warn(err);
                            return;
                        }
                        client.say(streamer, "removed "+args.join(" ")+" from the notiz list")
                    });
                });
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
            // TODO GET CONTEXT
            if (context.mod) {
                client.say(streamer, "https://cut-hail-cloud.glitch.me/modcommands.html");
            } else {
                client.say(streamer, "https://cut-hail-cloud.glitch.me/commands.html");
            }
            break;
        case "!song":
            fs.readFile("snip.txt", (err, buf) => {
                if (err) {
                    console.warn(err);
                    client.say(streamer, "etwas ist schiefgelaufen, check die konsole");
                    return;
                }
                let data = buf.toString();
                client.say(streamer, data);
            });
            break;
        // case "":
            // break;
        default:
            if (commandName[0] != "!") {
                break;
            }
            fs.readFile("counter.json", (err, buf) => {
                if (err) {
                    console.warn("could not read counter.json");
                }
                let data = buf.toString();
                let counter = JSON.parse(data);
                if (args.length < 1) {
                    if (counter[commandName]) {
                        let c = ++counter[commandName];
                        client.say(streamer, String(c));
                    } else if (context.mod) {
                        counter[commandName] = 1;
                        client.say(streamer, "made a new counter");
                    }
                    fs.writeFile("counter.json", JSON.stringify(counter, null, 4), function(err) {
                        if (err) {
                            console.warn(err);
                        }
                    });
                } else if ((args[0] == "get" || true) && counter) {
                    client.say(streamer, String(counter[commandName]));
                } else {
                    client.say(streamer, "error! counter.json konnten nicht gelesen werden");
                }
            });
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