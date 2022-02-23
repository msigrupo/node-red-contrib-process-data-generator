module.exports = function(RED) {

    function Simulation(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
		delay(1000).then(() => createNode(node, config)); /// waiting 1 second.
	}

	function createNode(node, config) {
		var runStart = config.runAtStart;
		
		var dateIniTimeStamp = new Date(config.startDate).getTime();
		var dateFinTimeStamp = new Date(config.endDate).getTime();
		var limit = config.limit;
		var iteration = config.iteration;
		var interval = config.interval;
		var intervalUnit = config.intervalUnit;
		var color = config.color;
		var dataType = config.dataType;

		var timerRealTime;
		
		//If runAtStart is checked, no input required
		if (runStart) {
			CalculateNextDateAndSend(config);
		}

        node.on('input', function(msg) {
			if (msg.startDate != undefined) dateIniTimeStamp = new Date(msg.startDate).getTime();
			if (msg.endDate != undefined) dateFinTimeStamp = new Date(msg.endDate).getTime();
			if (msg.limit != undefined) limit = msg.limit;
			if (msg.iteration != undefined) iteration = msg.iteration;
			if (msg.interval != undefined) { interval = msg.interval; intervalUnit = 1; }
			if (msg.color != undefined) color = msg.color;
			if (msg.dataType != undefined) dataType = msg.dataType;

			CalculateNextDateAndSend(msg.payload);
        });

		node.on('close', function() {
			//On close clear timer of realtime
			clearInterval(timerRealTime);
		});
	
		function CalculateNextDateAndSend(msg) {
			if (dataType === "historical") {
				//If iteration is selected, then add iteration * interval * intervalUnit to start date
				if (limit === "iteration") {
					dateFinTimeStamp = dateIniTimeStamp + (iteration * interval * intervalUnit);
					
					while (dateIniTimeStamp < dateFinTimeStamp) {
						NodeSend(dateIniTimeStamp, msg);
						dateIniTimeStamp = dateIniTimeStamp + (interval * intervalUnit);
					}
				} else if (limit === "endDate") {
					while (dateIniTimeStamp <= dateFinTimeStamp) {
						NodeSend(dateIniTimeStamp, msg);
						dateIniTimeStamp = dateIniTimeStamp + (interval * intervalUnit);
					}
				}
			} else if (dataType === "realtime") {
				//Realtime create timer to execute every "interval * intervalUnit"
				timerRealTime = setInterval(function () {
					RealTimeData(msg);
				}, interval * intervalUnit);
			}
		}

		function RealTimeData(msg) {
			var now = new Date().getTime();
			NodeSend(now, msg);
		}

		function NodeSend(data, msg) {
			node.send( { payload: { "time": data }, config: msg } );
			node.status({fill:color,shape:"dot",text:formatDate(data)});
		}

		function formatDate(date1) {
			var date = new Date(date1);
			var year = date.getUTCFullYear();
			var month = (date.getUTCMonth() + 1);
			var day = date.getUTCDate();

			if (month < 10) month = "0" + month;
			if (day < 10) day = "0" + day;

			var hours = date.getUTCHours()
			var minutes = date.getUTCMinutes()
			var seconds = date.getUTCSeconds();

			if (hours < 10) hours = "0" + hours;
			if (minutes < 10) minutes = "0" + minutes;
			if (seconds < 10) seconds = "0" + seconds;

			return year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
		}
	}

    RED.nodes.registerType("Process Simulator", Simulation);
}