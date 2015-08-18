(function() {
    var app = angular.module("ChatApp", ["ngMaterial"]).config(function($mdThemingProvider) {
        $mdThemingProvider.theme("default").primaryPalette("blue").accentPalette("orange");
    });

    app.controller("ChatController", function($scope, $http) {

        $scope.loggedIn = false;
        var convoTabs = [];
        $scope.selectedTab = 0;
        var previous = null;
        $scope.convoTabs = convoTabs;

        $http.get("/api/user").then(function(userResult) {
            $scope.loggedIn = true;
            $scope.user = userResult.data;
            $http.get("/api/users").then(function(result) {
                $scope.users = result.data;
            });
        }, function() {
            $http.get("/api/oauth/uri").then(function(result) {
                $scope.loginUri = result.data.uri;
            });
        });

        ////get all conversations for user
        //$http.get("/api/conversations").then(function(convoResult) {
        //    console.log(convoResult, )
        //    $scope.loggedIn = true;
        //
        //    $scope.user = convoResult.data;
        //
        //});

        $scope.sendMessage = function(tab) {
            //console.log("attemprtingsent");
            var message = {
                sent: new Date().valueOf(),
                body: tab.currentMessage
            };
            $http.post("/api/conversations/" + tab.recipient.id, message).then(function (response) {
                console.log("message sent" + response.data);
                message.from = $scope.user;
                tab.currentMessage = "";
                tab.messages.push(message);
            }, function (response) {
                $scope.errorText = "Failed to send message. Status: " + response.status + " - " + response.responseText;
            });
        };

        $scope.removeTab = function (tab) {
            var index = convoTabs.indexOf(tab);
            convoTabs.splice(index, 1);
        };

        $scope.$getUserById = function (uId) {
            return $scope.users.filter(function (user) {
                return user.id === uId;
            })[0];
        };

        $scope.addTab = function (recipient) {
            //todo get view stuff change convoTabs params
            //view = view || title + " Content View";
            $scope.getSpecificMessages(recipient.id, function(messages) {
                if (messages) {
                    messages.forEach(function(message) {
                        message.from = $scope.$getUserById(message.from);
                    });
                }
            });

            var matchingTabs = $scope.convoTabs.filter(function (otherTab) {
                return otherTab.recipient === recipient;
            });
            var tabLookingFor;

            if (matchingTabs.length === 0) {
                var chatObject = {
                    messages: [],
                    recipient: recipient,
                    disabled: false};
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

                            var sameTimeMessages = currChat.messages.filter(function (otherMessage) {
                                return otherMessage.sent === message.sent;
                            });

                            if (sameTimeMessages.length === 0) {
                                currChat.messages.push(message);
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
            //$scope.$getMessages();
        };

        $scope.$getMessages = function() {
            $http.get("/api/conversations").then(function (response) {
                response.data.forEach(function (conversation) {
                    var user = $scope.$getUserById(conversation.user);
                    user.isTalking = true;
                    var lastMsgTime = $scope.$getUserById(conversation.lastMessage);
                    console.log("hi " + user.json);
                });

            }, function (response) {
                $scope.errorText = "Failed to send message. Status: " + response.status + " - " + response.responseText;
            });
        };

        setInterval($scope.$reloadFromServer, 1000);

    });
})();
