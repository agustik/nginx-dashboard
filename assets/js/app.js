
"use strict"

var app = angular.module('nginx-dashboard', ['gridshore.c3js.chart', 'ui.bootstrap']);




app.controller('main', [ "$scope", "$interval", "$log", "req", function ($scope, $interval, $log, req){

	$log.info(config.server);
	$scope.nginx= {};

	$scope.mainGraph = [];
	$scope.mainTrafficGraph = [];

	$scope.mainTrafficGraphCols=[
			{"id":"Received","type":"spline"},
      {"id":"Sent","type":"spline"}
	];

	$scope.mainGraphCols=[
		{"id":"Requests","type":"spline"},
		{"id":"2xx","type":"area"},
		{"id":"3xx","type":"area"},
		{"id":"4xx","type":"area"},
		{"id":"5xx","type":"area"}
		];

	$scope.ServerGraphsTraffic=[{"id":"Received","type":"spline"},
                        {"id":"Sent","type":"spline"}];

	$scope.ServerGraphsStatus=[{"id":"2xx","type":"spline"},
                        {"id":"4xx-5xx","type":"spline"}];
	$scope.datax={"id":"x"};
	$scope.status ={
			server: {
				state : true,
				description : false
			},
			upstream : {
				state : true,
				description : false
			},
			cache : {
				state : true,
				description : false
			}
	};

	$scope.cacheAdvanced=false;

	$scope.start = $interval(function (){
		req.get().then(function (d){
			var now = new Date().getTime(), statusBad_S, statusGood_S;
			d.uptime = d.nowMsec - d.loadMsec;
			$scope.upstreamState=$scope.getHostState(d);

			d.connections.total = $scope.getTotal(d.connections);

			if ('upstreamZones' in $scope.nginx){
				for (var upstream in d.upstreamZones){
					for (var host in d.upstreamZones[upstream]){
						if(host in $scope.nginx.upstreamZones[upstream]){
							d.upstreamZones[upstream][host].requestCounter_S=$scope.prSecond(d.upstreamZones[upstream][host].requestCounter, $scope.nginx.upstreamZones[upstream][host].requestCounter );
						}
					}
				}
			}

			for (var zone in d.serverZones){
				if('serverZones' in $scope.nginx){

					d.serverZones[zone].requestCounter_S=$scope.prSecond(d.serverZones[zone].requestCounter, $scope.nginx.serverZones[zone].requestCounter);

					d.serverZones[zone].inBytes_S=$scope.prSecond(d.serverZones[zone].inBytes, $scope.nginx.serverZones[zone].inBytes);
					d.serverZones[zone].outBytes_S=$scope.prSecond(d.serverZones[zone].outBytes, $scope.nginx.serverZones[zone].outBytes);

					d.serverZones[zone].totalgoodstatus = $scope.RegexCount(d.serverZones[zone].responses, '[1-3]xx');
					d.serverZones[zone].totalbadstatus = $scope.RegexCount(d.serverZones[zone].responses, '[4-5]xx');

					d.serverZones[zone].statusTotal=$scope.getTotal(d.serverZones[zone].responses, 'status');
					d.serverZones[zone].cacheTotal=$scope.getTotal(d.serverZones[zone].responses, 'cache');


				}

				d.serverZones[zone].hitRatio=$scope.hitRatio(d.serverZones[zone].responses);

			}
			for (var zone in d.cacheZones){
				//d.cacheZones=$scope.getTotal();
				if('cacheZones' in $scope.nginx){

					d.cacheZones[zone].inBytes_S=$scope.prSecond(d.cacheZones[zone].inBytes, $scope.nginx.cacheZones[zone].inBytes);
					d.cacheZones[zone].outBytes_S=$scope.prSecond(d.cacheZones[zone].outBytes, $scope.nginx.cacheZones[zone].outBytes);
				}
				d.cacheZones[zone].total=$scope.getTotal(d.cacheZones[zone].responses, 'cache');
				d.cacheZones[zone].hitRatio=$scope.hitRatio(d.cacheZones[zone].responses);
			}
			d.TotalErrorCodes = $scope.aggrigateErrorCodes(d.serverZones);

			d.traffic = $scope.aggrigateTraffic(d.serverZones);

			if('connections' in $scope.nginx){


				d.connections.reqs = $scope.prSecond(d.connections.total, $scope.nginx.connections.total);

				d.traffic.outBytes_S = $scope.prSecond(d.traffic.outBytes, $scope.nginx.traffic.outBytes);
				d.traffic.inBytes_S = $scope.prSecond(d.traffic.inBytes, $scope.nginx.traffic.inBytes);

				if($scope.mainTrafficGraph.length >= 90){
					$scope.mainTrafficGraph.splice(0,1);
				}

				if($scope.mainGraph.length >= 90){
					$scope.mainGraph.splice(0,1);
				}

				$scope.mainGraph.push({
					x : now,
					"Requests": d.connections.reqs,
					"2xx" : $scope.prSecond(d.TotalErrorCodes['2xx'], $scope.nginx.TotalErrorCodes['2xx']),
					"3xx" : $scope.prSecond(d.TotalErrorCodes['3xx'], $scope.nginx.TotalErrorCodes['3xx']),
					"4xx" : $scope.prSecond(d.TotalErrorCodes['4xx'], $scope.nginx.TotalErrorCodes['4xx']),
					"5xx" : $scope.prSecond(d.TotalErrorCodes['5xx'], $scope.nginx.TotalErrorCodes['5xx'])
				});
				$scope.mainTrafficGraph.push({
						x : now,
						"Sent" : (d.traffic.outBytes_S / 1024),
						"Received" : (d.traffic.inBytes_S / 1024)
				});
			}

			$log.info(d);
			$scope.nginx= d;

		});
	},1000)

	$scope.getHostState = function (obj){
		var upstream, server, arr = [];
		for (upstream in obj.upstreamZones){
			 for(server in obj.upstreamZones[upstream]){
				arr.push( { down : obj.upstreamZones[upstream][server].down, server : obj.upstreamZones[upstream][server].server });
			 }
		}

		return arr;
	};

	$scope.getHits = function (obj){
		return obj.hit + obj.revalidated;
	};
	$scope.getMiss = function (obj){
		return obj.bypass + obj.expired + obj.scarce + obj.updating;
	};

	$scope.prSecond = function (a,b){
		return a-b;
	};

	$scope.aggrigateTraffic = function (obj){
		var key, zone;
		var output = {
			inBytes : 0,
			outBytes : 0
		};

		for (zone in obj){
			output.inBytes+=obj[zone].inBytes;
			output.outBytes+=obj[zone].outBytes;
		}

		return output;
	};
	$scope.aggrigateErrorCodes = function (obj){
		var key, zone, output = {};
		var reg = new RegExp('[0-9]xx');
		for (zone in obj){
			for (key in obj[zone].responses){
				if(reg.test(key)){
					if(key in output){
						output[key] += obj[zone].responses[key];
					}else{
						output[key] = obj[zone].responses[key];
					}
				}
			}
		}
		return output;
	};

	$scope.RegexCount = function(obj, regex){
		var key, total = 0, reg = new RegExp(regex);
		for (key in obj){
			if (reg.test(key)){
				total += obj[key];
			}
		}
		return total;
	};

	$scope.hitRatio=function (obj){
		var key, hits = 0, miss=0;
		if(!('total' in obj)){
			obj.total = $scope.getTotal(obj, 'cache');
		}

		miss = obj.bypass + obj.expired + obj.scarce + obj.updating;
		hits = obj.hit + obj.revalidated;
		var ratio = (hits/obj.total) * 100;
		return (isNaN(ratio)) ? 0 : ratio;
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
	};
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

app.filter('io', function() {
	return function(bytes) {
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes) || bytes === 0) return '-';
		return bytes;
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
