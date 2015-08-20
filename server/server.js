var express = require("express");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");

module.exports = function(port, db, githubAuthoriser) {
    //var app = express();
    var app = require('express')();
    var server = require('http').Server(app);
    var io = require('socket.io')(server);

    server.listen(80);

    app.use(express.static("public"));
    app.use(cookieParser());
    app.use(bodyParser.json());

    var users = db.collection("users");
    var convos = db.collection("conversations-3");
    var sessions = {};

    app.get('/', function (req, res) {
        res.sendfile(__dirname + '/index.html');
    });

    io.on('connection', function (socket) {
        io.emit('thiss', { will: 'bee received by everyone'});
        socket.on('my other event', function (data) {
            console.log(data);
        });
    });

    app.get("/oauth", function(req, res) {
        githubAuthoriser.authorise(req, function(githubUser, token) {
            if (githubUser) {
                users.findOne({
                    _id: githubUser.login
                }, function(err, user) {
                    if (!user) {
                        // TODO: Wait for this operation to complete
                        users.insertOne({
                            _id: githubUser.login,
                            name: githubUser.name,
                            avatarUrl: githubUser.avatar_url
                        });
                    }
                    sessions[token] = {
                        user: githubUser.login
                    };
                    res.cookie("sessionToken", token);
                    res.header("Location", "/");
                    res.sendStatus(302);
                });
            }
            else {
                res.sendStatus(400);
            }

        });
    });

    app.get("/api/oauth/uri", function(req, res) {
        res.json({
            uri: githubAuthoriser.oAuthUri
        });
    });

    app.use(function(req, res, next) {
        if (req.cookies.sessionToken) {
            req.session = sessions[req.cookies.sessionToken];
            if (req.session) {
                next();
            } else {
                res.sendStatus(401);
            }
        } else {
            res.sendStatus(401);
        }
    });

    app.get("/api/user", function(req, res) {
        users.findOne({
            _id: req.session.user
        }, function(err, user) {
            if (!err) {
                res.json(user);
            } else {
                res.sendStatus(500);
            }
        });
    });

    app.get("/api/users", function(req, res) {
        users.find().toArray(function(err, docs) {
            if (!err) {
                res.json(docs.map(function(user) {
                    return {
                        id: user._id,
                        name: user.name,
                        avatarUrl: user.avatarUrl
                    };
                }));
            } else {
                res.sendStatus(500);
            }
        });
    });

    app.post("/api/conversations/:userid", function(req, res) {
        var recevID = req.params.userid;
        var senderID = req.session.user;
        var message = {
            between: [senderID, recevID],
            sent: req.body.sent,
            seen: [false],
            body: req.body.body
        };
        if (senderID && recevID && message) {

            convos.insertOne(message);
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    });

    app.get("/api/conversations/:userid", function(req, res) {
        var otherID = req.params.userid;
        var myID = req.session.user;
        convos.update({between: [otherID, myID]}, {
            $set: {
                seen: [true]
            }
        }, {multi: true});
        convos.find({between: {$all: [myID, otherID]}}).toArray(function(err, docs) {
            if (!err) {
                res.json(docs.map(function(convo) {
                    return {
                        to: convo.between[1],
                        from: convo.between[0],
                        sent: convo.sent,
                        seen: convo.seen[0],
                        body: convo.body
                    };
                }));

            } else {
                res.sendStatus(500);
            }
        });

    });

    app.get("/api/conversations", function(req, res) {
        convos.find({
            between: req.session.user
        }).toArray(function (err, docs) {
            if (!err) {
                var chats = [];

                docs.forEach(function (message) {
                    var chat;
                    var user = message.between.filter(function (user) {
                        return user !== req.session.user;
                    })[0];

                    chat = {
                        user: user,
                        lastMessage: message.sent
                    };

                    if (message.between[0] === req.session.user) {
                        chat.anyUnseen = false;
                    }
                    else {
                        chat.anyUnseen = message.seen ? false : true;

                    }

                    chats.push(chat);
                });

                res.json(chats);
            }
        });
    });

    return app.listen(port);
};
