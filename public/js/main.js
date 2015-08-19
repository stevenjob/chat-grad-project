(function() {
    var app = angular.module("ChatApp", ["ngMaterial"]).config(function($mdThemingProvider) {
        $mdThemingProvider.theme("default").primaryPalette("blue").accentPalette("orange");
    });

    app.filter('excludeCurrent', function () {
        return function (items) {
            var filtered = [];
            if(items === undefined)
                return null;
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item.id !== "stevenjob") {
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

        $http.get("/api/user").then(function(userResult) {
            $scope.loggedIn = true;
            $scope.user = userResult.data;
            $http.get("/api/users").then(function(result) {
                $scope.users = result.data;
                //$scope.users.sort();
            });
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
            $http.post("/api/conversations/" + tab.recipient.id, message).then(function (response) {
                //console.log("message sent" + response.data);
                message.to = tab.recipient.id;
                message.from = $scope.user;
                message.seen = false;
                tab.currentMessage = "";
                //tab.messages.push(message);
            }, function (response) {
                $scope.errorText = "Failed to send message. Status: " + response.status + " - " + response.responseText;
            });
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
                return tab.user.id === uId;
            })[0];
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

        $scope.getSpecificMessages = function(userID, callback) {
            $http.get("/api/conversations/" + userID).then(function (response) {
                //todo positive
                callback(response.data);
            }, function (response) {
                $scope.errorText = "Failed to get messages. Status: " + response.status + " - " + response.responseText;
            });
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

        $scope.$getMessagesForTab = function() {
            if ($scope.selectedTab !== 0) {
                var currChat = $scope.convoTabs[$scope.selectedTab - 1];
                $scope.getSpecificMessages(currChat.recipient.id, function(messages) {
                    if (messages) {
                        messages.forEach(function(message) {
                            message.from = $scope.$getUserById(message.from);
                            //if (message.from.id === currChat.recipient.id){
                            //    message.seen = true;
                            //}


                            var sameTimeMessages = currChat.messages.filter(function (otherMessage) {
                                return otherMessage.sent === message.sent;
                            });
                            if (sameTimeMessages.length === 0) {
                                if(message.from.id !== $scope.user._id)
                                    $scope.$toastShow(message);
                                currChat.messages.push(message);
                            }
                            else {
                                if (message.from.id !== $scope.user._id && !message.seen) {
                                    currChat.messages.filter(function (otherMessage) {
                                        otherMessage.seen = true;
                                    });
                                }
                            }
                        });
                    }
                    else {

                    }
                });
            }
        };

        $scope.$reloadFromServer = function() {
            $scope.$getMessagesForTab();
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

                    //if user lastmsg time is different then user has a new mesage
                    //

                    if(!user.isTalking)
                        user.isTalking = true;
                    else{
                        if(user.lastMsgTime < conversation.lastMessage || !user.lastMsgTime){
                            user.lastMsgTime = conversation.lastMessage;
                            user.anyUnseen = true;
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
