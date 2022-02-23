const signals = require('./lib/signals');

module.exports = function(RED) {

    function CreateNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

		const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
		delay(1000).then(() => SignalNoise(node, config)); /// waiting 1 second.
	}

	function SignalNoise(node, config) {

		var configOptions = {
			name: config.name,
			signals: config.signals
		}

		var signalsData = []; //name, value, noise, decimals, noiseVal

        node.on('input', function(msg) {
			if (msg.signals != undefined) configOptions.signals = msg.signals;
			configOptions.input = msg;

			GetSignalValue();
			NodeSend();
        });

		node.on('close', function() {
		});

		//Get value from msg/flow/global and save all data in "signalsData"
		function GetSignalValue() {
			var tmpSignals = JSON.parse(JSON.stringify(configOptions.signals));

			for (let signal of tmpSignals) {
				//Check if some data has "signal" and "signalType"
				if ("signal" in signal && "signalType" in signal) {
					var signalData = {}; //name, value, noise, decimals, noiseVal
					signalData["name"] = signal.signal;
					signalData["outputSignal"] = signal.outputSignal;
					signalData["noise"] = (signal.noise != '') ? Number.parseFloat(signal.noise) : 0;
					signalData["decimals"] = Number.parseFloat(signal.decimals);

					switch (signal.signalType) {
						case "msg":
							var msgValue = "configOptions.input." + signal.signal;
							signalData["value"] = Number.parseFloat(eval(msgValue));
							break;
						case "flow":
							var flowContext = node.context().flow;
							signalData["value"] = Number.parseFloat(flowContext.get(signal.signal));
							break;
						case "global":
							var globalContext = node.context().global;
							signalData["value"] = Number.parseFloat(globalContext.get(signal.signal));
							break;
					}

					ApplyNoise(signalData);

					signalsData.push(signalData);
				}
			}
		}

		//Sum or subtraction signal value
		function ApplyNoise(data) {
			var random = Math.round(GenerateRandomNumber(0, 1));

			var calcNoise = data.value * data.noise;

			//Sum
			if (random === 0) {
				data["noiseVal"] = Number.parseFloat(Number.parseFloat(data.value + calcNoise).toFixed(data.decimals));
			}
			//Subtraction
			else {
				data["noiseVal"] = Number.parseFloat(Number.parseFloat(data.value - calcNoise).toFixed(data.decimals));
			}
		}

		//Return random number between two numbers
		function GenerateRandomNumber(min, max) {
			return (Math.random() * (Number.parseFloat(max) - Number.parseFloat(min))) + Number.parseFloat(min);
		}

		function NodeSend() {
			configOptions.input["payload"] = Object.assign({}, configOptions.input["payload"]);
			for (let signal of signalsData) {
				configOptions.input["payload"][signal.outputSignal] = Number.parseFloat(signal.noiseVal);

				 if (signal.outputSignal != undefined) signals.write(signal.outputSignal, Number.parseFloat(signal.noiseVal));
			}

			node.send(configOptions.input);
		}
	}

    RED.nodes.registerType("Signal Noise", CreateNode);
}