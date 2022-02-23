module.exports = function(RED) {

    function CreateNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

		const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
		delay(1000).then(() => SourceListSignal(node, config)); /// waiting 1 second.
	}

	function SourceListSignal(node, config) {

		var configOptions = {
			fileReading: config.fileReading,
			inputData: config.inputData,
			inputDataCount: config.inputDataCount,
			pagination: Number.parseFloat(config.pagination)
		};

		var dataHelp = {
			index: 0,
			pagination: Number.parseFloat(configOptions.pagination),
			currentPagination: 0,
			MAX_NUM_REQUEST: 5,
			numRequest: 0,
			dataCount: 0,
			randomLastIsRequest: false
		}

        node.on('input', function(msg) {
			if (msg.fileReading != undefined) configOptions.fileReading = msg.fileReading;
			if (msg.inputData != undefined) configOptions.inputData = msg.inputData;
			if (msg.inputDataCount != undefined) configOptions.inputDataCount = msg.inputDataCount;
			if (msg.pagination != undefined) { configOptions.pagination = msg.pagination; dataHelp.pagination = msg.pagination }
			if (msg[configOptions.inputData] != undefined) configOptions.input = msg;
			//Save received message that does not contain "inputData" and "inputDataCount" to send it to output 2 (in values parameter)
			if (msg[configOptions.inputData] === undefined && msg[configOptions.inputDataCount] === undefined) configOptions.inputSend = msg;

			//Save number of data count
			if (msg[configOptions.inputDataCount] != undefined) dataHelp.dataCount = configOptions.input[configOptions.inputDataCount];

			//If fileReading is "random", number of pagination is 1
			if (configOptions.fileReading === "random") { configOptions.pagination = 1; dataHelp.pagination = 1; }

			if (configOptions.input === undefined || configOptions.input[configOptions.inputData] === undefined || configOptions.input[configOptions.inputData].length === 0) {
				if (dataHelp.numRequest < dataHelp.MAX_NUM_REQUEST) { SendRequestData(); if (configOptions.fileReading === "random") dataHelp.randomLastIsRequest = true; }
				else node.error("No data found in data entry (msg." + configOptions.inputData + ")");
			}
			else if (configOptions.input[configOptions.inputData].length > 0) {
				dataHelp.numRequest = 0;
				GetCurrentValue();
			}
        });

		node.on('close', function() {
		});

		function GetCurrentValue() {
			if (configOptions.fileReading === "random") {
				dataHelp.index = 0;

				if (dataHelp.randomLastIsRequest === true) {
					dataHelp.randomLastIsRequest = false;
					SendData();
				}
				else {
					dataHelp.randomLastIsRequest = true;
					dataHelp.currentPagination = Math.round(GenerateRandomNumber(0, dataHelp.dataCount - 1));
					SendRequestData();
				}
			}
			else {
				//If the index is less than data length, output 1 is sent, else output 2 is sent to get new values
				if (dataHelp.index < configOptions.input[configOptions.inputData].length) {
					SendData();
					dataHelp.index += 1;
				} else {
					dataHelp.index = 0;
					dataHelp.currentPagination += 1;
					
					if ((dataHelp.currentPagination * dataHelp.pagination) >= dataHelp.dataCount) dataHelp.currentPagination = 0;

					SendRequestData();
				}	
			}
		}

		//Return random number between two numbers
		function GenerateRandomNumber(min, max) {
			return (Math.random() * (Number.parseFloat(max) - Number.parseFloat(min))) + Number.parseFloat(min);
		}

		//Output 1
		function SendData() {
			node.send( [{ payload: configOptions.input[configOptions.inputData][dataHelp.index] }, null] );
		}

		//Output 2
		function SendRequestData() {
			dataHelp.numRequest += 1;
			var outSend = {
				pagination: dataHelp.pagination,
				index: dataHelp.currentPagination * dataHelp.pagination,
				values: configOptions.inputSend
			};
			node.send( [null, { payload: outSend }] );
		}
	}

    RED.nodes.registerType("Source List Signal", CreateNode);
}