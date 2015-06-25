var app = angular.module('nginx-dashboard', ['gridshore.c3js.chart']);

console.log(config.server);
var graphApp = angular.module('graphApp', ['gridshore.c3js.chart']);
graphApp.controller('GraphCtrl', function ($scope) {
});


app.controller('main', [ "$scope", "$interval", "req", function ($scope, $interval, req){
	$scope.nginx= {};


	$scope.cacheAdvanced=false;

	$scope.start = $interval(function (){

		req.get().then(function (d){

			d.uptime = d.nowMsec - d.loadMsec;

			

			d.connections.total = $scope.getTotal(d.connections);

			console.log(d.connections);
			if('connections' in $scope.nginx){
				d.connections.reqs = $scope.prSecond(d.connections.total, $scope.nginx.connections.total);
			}
			for (var zone in d.serverZones){
				//d.cacheZones=$scope.getTotal();

				d.serverZones[zone].responses.statusTotal=$scope.getTotal(d.serverZones[zone].responses, 'status');
				d.serverZones[zone].responses.cacheTotal=$scope.getTotal(d.serverZones[zone].responses, 'cache');

				if('serverZones' in $scope.nginx){

					d.serverZones[zone].requestCounter_S=$scope.prSecond(d.serverZones[zone].requestCounter, $scope.nginx.serverZones[zone].requestCounter);

					d.serverZones[zone].inBytes_S=$scope.prSecond(d.serverZones[zone].inBytes, $scope.nginx.serverZones[zone].inBytes);
					d.serverZones[zone].outBytes_S=$scope.prSecond(d.serverZones[zone].outBytes, $scope.nginx.serverZones[zone].outBytes)

				}

			}
			for (var zone in d.cacheZones){
				//d.cacheZones=$scope.getTotal();
				if('cacheZones' in $scope.nginx){

					d.cacheZones[zone].inBytes_S=$scope.prSecond(d.cacheZones[zone].inBytes, $scope.nginx.cacheZones[zone].inBytes);
					d.cacheZones[zone].outBytes_S=$scope.prSecond(d.cacheZones[zone].outBytes, $scope.nginx.cacheZones[zone].outBytes);
					console.log(d.cacheZones[zone].outBytes_S);
				}
				d.cacheZones[zone].responses.total=$scope.getTotal(d.cacheZones[zone].responses, 'cache');
				d.cacheZones[zone].hitRatio=$scope.hitRatio(d.cacheZones[zone].responses);
			}
			$scope.nginx= d;
	
		});
	},1000)

	$scope.prSecond = function (a,b){
		return a-b;
	};

	$scope.hitRatio=function (obj){
		var key, hits = 0, miss=0;
		for ( key in obj){
			if(key == 'total'){
				continue;
			}
			if (key == 'hit' || key == 'stale' || key == 'revalidated'){
				hits += obj[key];
			}else{
				miss += obj[key];
			}
		}

		return (hits/obj.total) * 100;
	};

	$scope.getTotal = function (obj, type){
		var key, total=0;
		var reg = new RegExp('[0-9]xx');
		for (key in obj) {
			if(type == 'status'){
				if(reg.test(key)){
					total +=obj[key];
				}
			}
			if(type == 'cache' || !type){
				if(!reg.test(key)){
					total +=obj[key];
				}
			}
			
			
		}

		return total;
	}

	$scope.compare = function (){

	}
}]);


app.service('req', ['$http','$q', function ($http, $q){
	return {
	 get: function(){
        var deferred = $q.defer();
 		var time = new Date().getTime();
        $http.get(config.server + "?" + time).success(function(data){
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

app.filter('bytes', function() {
	return function(bytes, precision) {
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes) || bytes === 0) return '-';
		if (typeof precision === 'undefined') precision = 1;
		var units = ['b', 'kB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	}
});

app.filter('readableTime', function() {
    return function(seconds) {
      var day, format, hour, minute, month, week, year;
      seconds = parseInt(seconds, 10);
      minute = 60;
      hour = minute * 60;
      day = hour * 24;
      week = day * 7;
      year = day * 365;
      month = year / 12;
      format = function(number, string) {
        string = number === 1 ? string : "" + string + "s";
        return "" + number + " " + string;
      };
      switch (false) {
        case !(seconds < minute):
          return format(seconds, 'second');
        case !(seconds < hour):
          return format(Math.floor(seconds / minute), 'minute');
        case !(seconds < day):
          return format(Math.floor(seconds / hour), 'hour');
        case !(seconds < week):
          return format(Math.floor(seconds / day), 'day');
        case !(seconds < month):
          return format(Math.floor(seconds / week), 'week');
        case !(seconds < year):
          return format(Math.floor(seconds / month), 'month');
        default:
          return format(Math.floor(seconds / year), 'year');
      }
    };
  });
