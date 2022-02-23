const signals = require('./lib/signals');

module.exports = function(RED) {

    function CreateNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

		const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
		delay(1000).then(() => RandomVariationSignal(node, config)); /// waiting 1 second.
	}

	function RandomVariationSignal(node, config) {

		var configOptions = {
			signal: config.signal,
			minValRandom: config.minValRandom,
			maxValRandom: config.maxValRandom,
			minValSignal: config.minValSignal,
			maxValSignal: config.maxValSignal,
			decimals: config.decimals,
            increase: config.increase,
            decrease: config.decrease
		}

		var dataConfig = {
			lastRandom: 0,
			currentValue: 0
		}

        node.on('input', function(msg) {
            if (msg.minValRandom != undefined) configOptions.minValRandom = msg.minValRandom;
            if (msg.maxValRandom != undefined) configOptions.maxValRandom = msg.maxValRandom;
            if (msg.minValSignal != undefined) configOptions.minValSignal = msg.minValSignal;
            if (msg.maxValSignal != undefined) configOptions.maxValSignal = msg.maxValSignal;
            if (msg.decimals != undefined) configOptions.decimals = msg.decimals;
            if (msg.increase != undefined) configOptions.increase = msg.increase;
            if (msg.decrease != undefined) configOptions.decrease = msg.decrease;
			if (msg.setValue != undefined) dataConfig.currentValue = Number.parseFloat(msg.setValue); //Restart value
            configOptions.input = msg;

			GetRandom();
			VariationValue();
			NodeSend();
        });

		node.on('close', function() {
		});

		//Save random number in variable
		function GetRandom() {
			if (configOptions.decimals > 0) {
				dataConfig.lastRandom = GenerateRandomNumber(configOptions.minValRandom, configOptions.maxValRandom);
				//Number.parseFloat to save as number
    			dataConfig.lastRandom = Number.parseFloat(Number.parseFloat(dataConfig.lastRandom).toFixed(configOptions.decimals));
			}
			else
				dataConfig.lastRandom = Math.round(GenerateRandomNumber(configOptions.minValRandom, configOptions.maxValRandom));
		}

		//Return random number between two numbers
		function GenerateRandomNumber(min, max) {
			return (Math.random() * (Number.parseFloat(max) - Number.parseFloat(min))) + Number.parseFloat(min);
		}

		//Increase, descrease or nothing current value
		function VariationValue() {
			//If increase and decrease are checked, random between the two
			if (configOptions.increase === true && configOptions.decrease === true) {
				var random = Math.round(GenerateRandomNumber(0, 1));

				if (random === 0) DecreaseValue();
				else IncreaseValue();
			} else if (configOptions.increase === false && configOptions.decrease === false) {
				dataConfig.currentValue = Number.parseFloat(dataConfig.lastRandom);
			} else if (configOptions.increase === true) {
				IncreaseValue();
			} else if (configOptions.decrease === true) {
				DecreaseValue();
			}

			//Number.parseFloat to save as number
			dataConfig.currentValue = Number.parseFloat(Number.parseFloat(dataConfig.currentValue).toFixed(configOptions.decimals));
		}

		//Add the previous value with the current random number
		function IncreaseValue() {
			dataConfig.currentValue = Number.parseFloat(dataConfig.currentValue) + Number.parseFloat(dataConfig.lastRandom);
			if (configOptions.maxValSignal != "" && configOptions.maxValSignal != undefined && dataConfig.currentValue > configOptions.maxValSignal) dataConfig.currentValue = Number.parseFloat(configOptions.maxValSignal);
		}

		//Subtract the previous value with the current random number
		function DecreaseValue() {
			dataConfig.currentValue = Number.parseFloat(dataConfig.currentValue) - Number.parseFloat(dataConfig.lastRandom);
			if (configOptions.minValSignal != "" && configOptions.minValSignal != undefined && dataConfig.currentValue < configOptions.minValSignal) dataConfig.currentValue = Number.parseFloat(configOptions.minValSignal);
		}

		function NodeSend() {
			configOptions.input["payload"] = Object.assign({}, configOptions.input["payload"]);
			configOptions.input["payload"][configOptions.signal] = dataConfig.currentValue;

			signals.write(configOptions.signal, dataConfig.currentValue);

			node.send(configOptions.input);
		}
	}

    RED.nodes.registerType("Random Variation Signal", CreateNode);
}