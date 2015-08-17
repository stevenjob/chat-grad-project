(function() {
    var app = angular.module("ChatApp", ["ngMaterial"]).config(function($mdThemingProvider) {
        $mdThemingProvider.theme("default").primaryPalette("blue").accentPalette("orange");
    });

    app.controller("ChatController", function($scope, $http) {

        $scope.loggedIn = false;
        var tabs = [];
        var selected = null;
        var previous = null;
        $scope.tabs = tabs;

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

        $scope.sendMessage = function(user, newMessage) {
            $http.post("/api/conversations/" + user.id, {
                "sent": Date.now(),
                "body": newMessage
            }).then(function (response) {
            }, function (response) {
                $scope.errorText = "Failed to send message. Status: " + response.status + " - " + response.responseText;
            });
        };

        $scope.getMessages = function(user, newMessage) {
            $http.get("/api/conversations/" + user.id, {
                "sent": Date.now(),
                "body": newMessage
            }).then(function (response) {
            }, function (response) {
                $scope.errorText = "Failed to send message. Status: " + response.status + " - " + response.responseText;
            });
        };

        $scope.addTab = function (user) {
            //todo get view stuff
            //view = view || title + " Content View";
            var view = getSpecificMessages(user.id);
            tabs.push({title: (user.name || user.id), content: view, user: user,  disabled: false});
        };

        $scope.removeTab = function (tab) {
            var index = tabs.indexOf(tab);
            tabs.splice(index, 1);
        };

        function getSpecificMessages(userID) {
            $http.get("/api/conversations/" + userID).then(function (response) {
                //todo positive
                console.log(response + " sdfgsfg" + response.body);
            }, function (response) {
                $scope.errorText = "Failed to get messages. Status: " + response.status + " - " + response.responseText;

            });
        }
    });
})();
