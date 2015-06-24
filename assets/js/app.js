var application = angular.module('nginx-dashboard', []);




application.controller('main', [ "$scope", "$http", "req", function ($scope, $http, req){
	$scope.hello='blarg';
	$scope.nginx= {};
	req.get().then(function (d){
		$scope.nginx= d;
		console.log($scope.nginx=d);
	});
}]);


application.service('req', ['$http','$q', function ($http, $q){
	return {
	 get: function(){
        var deferred = $q.defer();
 
        $http.get(config.server).success(function(data){
          deferred.resolve(data);
      	}).error(function(data){
 
        //deferred.reject("An error occured while fetching items");
        deferred.resolve(data);
      });
 		//console.log(deferred.promise);
      return deferred.promise;
    }
	};
}]);