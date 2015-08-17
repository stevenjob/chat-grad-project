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

        $scope.addTab = function (title, view) {
            //todo get view stuff
            //view = view || title + " Content View";
            view = "no msgs yet";
            tabs.push({title: title, content: view, disabled: false});
        };

        $scope.removeTab = function (tab) {
            var index = tabs.indexOf(tab);
            tabs.splice(index, 1);
        };
    });
})();
