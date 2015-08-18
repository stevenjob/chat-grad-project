var express = require("express");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");

module.exports = function(port, db, githubAuthoriser) {
    var app = express();

    app.use(express.static("public"));
    app.use(cookieParser());
    app.use(bodyParser.json());

    var users = db.collection("users");
    var convos = db.collection("conversations-jobs");
    var sessions = {};

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
            seen: false,
            between: [senderID, recevID],
            sent: req.body.sent,
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
        convos.find({between: { $all: [myId, otherID]}}).toArray(function(err, docs) {
            if (!err) {
                res.json(docs.map(function(convo) {
                    console.log(convo);
                    return {
                        seen: convo.seen,
                        to: convo.between[1],
                        from: convo.between[0],
                        sent: convo.sent,
                        body: convo.body
                    };
                }));
            } else {
                res.sendStatus(500);
            }
        });
    });
    return app.listen(port);
};
