(function() {
    var app = angular.module("ChatApp", ["ngMaterial"]).config(function($mdThemingProvider) {
        $mdThemingProvider.theme("default").primaryPalette("blue").accentPalette("orange");
    });

    app.filter("excludeCurrent", function () {
        return function (items, idToComp) {
            var filtered = [];
            if (typeof items === "undefined") {
                return null;
            }
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item.id !== idToComp) {
                    filtered.push(item);
                }
            }
            return filtered;
        };
    });

    app.controller("ChatController", function($scope, $http, $mdToast) {

        $scope.loggedIn = false;
        var convoTabs = [];
        $scope.selectedTab = 0;
        $scope.convoTabs = convoTabs;
        $scope.user = "";
        $scope.socket = null;

        $scope.getSocks = function() {
            $scope.socket = io("http://" + window.location.host);
            $scope.socket.on("connect", function () {
                $scope.socket.emit("userId", $scope.user._id);
            });
            $scope.socket.on("message", function (message) {
                //console.log("f" + message);
                $scope.$addMessageToTab(message);
                //$scope.$addMessageToChat(message);
            });

            $scope.socket.on("delete-it", function (senderId) {
                var userTab = $scope.$getTabByUserId(senderId);
                userTab.messages = [];
            });
        };

        $scope.$sendSockMess = function(to, message) {
            if ($scope.socket) {
                message.to = to;
                $scope.socket.emit("message", message);
            }
        };

        $scope.deleteConvo = function(tab) {
            if ($scope.socket) {
                $scope.socket.emit("delete-convo", tab.recipient.id);
                //convoTabs remove tab
                tab.messages = [];
                //$scope.removeTab(tab);
                var cUser = $scope.$getUserById(tab.recipient.id);
                cUser.isTalking = false;
                cUser.anyUnseen = false;
                cUser.lastMsgTime = null;

            }
        };

        $http.get("/api/user").then(function(userResult) {
            $scope.loggedIn = true;
            $scope.user = userResult.data;
            $http.get("/api/users").then(function(result) {
                $scope.users = result.data;
            });
            $scope.$reloadFromServer();
            $scope.getSocks();
        }, function() {
            $http.get("/api/oauth/uri").then(function(result) {
                $scope.loginUri = result.data.uri;
            });
        });

        $scope.sendMessage = function(tab) {
            var message = {
                sent: new Date().valueOf(),
                body: tab.currentMessage
            };
            if ($scope.socket) {
                $scope.$sendSockMess(tab.recipient.id, message);
                tab.currentMessage = "";
            }
            else {
                $http.post("/api/conversations/" + tab.recipient.id, message).then(function (response) {
                    message.to = tab.recipient.id;
                    message.from = $scope.user;
                    message.seen = false;
                    tab.currentMessage = "";
                    //tab.messages.push(message);
                }, function (response) {
                    $scope.errorText = "Failed to send message. Status: " + response.status + " - " +
                        response.responseText;
                });
            }
        };

        $scope.removeTab = function (tab) {
            var index = convoTabs.indexOf(tab);
            convoTabs.splice(index, 1);
            //$scope.$getMessages();
        };

        $scope.$getUserById = function (uId) {
            return $scope.users.filter(function (user) {
                return user.id === uId;
            })[0];
        };

        $scope.$getTabByUserId = function (uId) {
            return $scope.convoTabs.filter(function (tab) {
                return tab.recipient.id === uId;
            })[0];
        };

        $scope.getAvatar = function (message) {
            if (message.from.id === $scope.user._id) {
                return $scope.user.avatarUrl;
            }
            else {
                var tab = $scope.$getTabByUserId(message.from.id);
                return tab.recipient.avatarUrl;
            }
        };

        $scope.addTab = function (recipient) {
            //todo get view stuff change convoTabs params
            $scope.$getMessagesForTab();

            var matchingTabs = $scope.convoTabs.filter(function (otherTab) {
                return otherTab.recipient === recipient;
            });
            var tabLookingFor;

            if (matchingTabs.length === 0) {
                var chatObject = {
                    messages: [],
                    recipient: recipient,
                    newMsg: false};
                $scope.convoTabs.push(chatObject);
                tabLookingFor = chatObject;
            } else {
                tabLookingFor = matchingTabs[0];
            }

            $scope.$changeTab(tabLookingFor);
        };

        $scope.$changeTab = function (tabLookingFor) {
            var openTabs = $scope.convoTabs.length;
            for (var i = 0; i < openTabs; i++) {
                var tab = $scope.convoTabs[i];
                if (angular.equals(tab.recipient, tabLookingFor.recipient)) {
                    $scope.selectedTab = i + 1; // +1 because of the first chat tab
                    break;
                }
            }
        };

        $scope.$watch("selectedTab", function(current, old) {
            if (current !== 0) {
                var currChat = $scope.convoTabs[current - 1];

                if (currChat.messages.length === 0) {
                    $scope.$getMessagesForTab();

                    //var matchingTabs = $scope.convoTabs.filter(function (otherTab) {
                    //    return otherTab.recipient === recipient;
                    //});
                }
            }
        });

        $scope.getSpecificMessages = function(userID, callback) {
            $http.get("/api/conversations/" + userID).then(function (response) {
                callback(response.data);
            }, function (response) {
                $scope.errorText = "Failed to get messages. Status: " + response.status + " - " + response.responseText;
            });
        };

        $scope.$addMessageToTab = function(message) {
            if ($scope.selectedTab !== 0) {
                var currChat = $scope.convoTabs[$scope.selectedTab - 1];
                message.from = $scope.$getUserById(message.from);

                var sameTimeMessages = currChat.messages.filter(function (otherMessage) {
                    return otherMessage.sent === message.sent;
                });

                if (sameTimeMessages.length === 0) {
                    if (message.from.id !== $scope.user._id) {
                        $scope.$toastShow(message);
                    }
                    message.seen = message.seen[0];
                    if (currChat.recipient.id === message.from.id || currChat.recipient.id === message.to) {
                        currChat.messages.push(message);
                    }
                }
                else {
                    if (message.from.id !== $scope.user._id && !message.seen) {
                        currChat.messages.filter(function (otherMessage) {
                            otherMessage.seen = true;
                        });
                    }
                }
            }
        };

        $scope.$getMessagesForTab = function() {
            if ($scope.selectedTab !== 0) {
                var currChat = $scope.convoTabs[$scope.selectedTab - 1];
                $scope.getSpecificMessages(currChat.recipient.id, function(messages) {
                    if (messages) {
                        messages.forEach(function(message) {

                            message.from = $scope.$getUserById(message.from);
                            var sameTimeMessages = currChat.messages.filter(function (otherMessage) {
                                return otherMessage.sent === message.sent;
                            });
                            if ((message.from.id !== $scope.user._id) && !message.seen) {
                                currChat.messages.filter(function (otherMessage) {
                                    otherMessage.seen = true;

                                });
                            }

                            var cUser = $scope.$getUserById(currChat.recipient.id);
                            cUser.anyUnseen = false;

                            if (sameTimeMessages.length === 0) {
                                if (message.from.id !== $scope.user._id) {
                                    $scope.$toastShow(message);
                                    message.seen = true;
                                }
                                currChat.messages.push(message);
                            }
                            else {

                            }
                        });
                    }
                    else {

                    }
                });
            }
        };

        $scope.$reloadFromServer = function() {
            $scope.$getMessages();
        };

        $scope.$toastShow = function(message) {
            var toast = $mdToast.simple()
                .content((message.from.name || message.from.id) + ": " + message.body)
                .position("bottom right");

            $mdToast.show(toast);
        };

        $scope.$getMessages = function() {
            $http.get("/api/conversations").then(function (response) {
                response.data.forEach(function (conversation) {
                    var user = $scope.$getUserById(conversation.user);
                    if (!user.isTalking) {
                        user.isTalking = true;
                    }
                    else {
                        if (user.lastMsgTime < conversation.lastMessage || !user.lastMsgTime) {
                            user.lastMsgTime = conversation.lastMessage;
                            //check if last msg is from me or other
                            var userTab = $scope.$getTabByUserId(user.id);
                            if (userTab) {
                                var finalMessage = userTab.messages[userTab.messages.length - 1];
                                if (finalMessage.from.id !== $scope.user._id) {
                                    user.anyUnseen = true;
                                }
                            } else {
                                // TODO
                            }

                        }
                    }
                    //var lastMsgTime = $scope.$getUserById(conversation.lastMessage);
                    //console.log("hi " + user.json);
                });
            }, function (response) {
                $scope.errorText = "Failed to send message. Status: " + response.status + " - " + response.responseText;
            });
        };
        setInterval($scope.$reloadFromServer, 1000);
    });
})();
