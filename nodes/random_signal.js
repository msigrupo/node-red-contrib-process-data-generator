const signals = require('./lib/signals');
const helpFunctions = require('./lib/helpFunctions');

module.exports = function(RED) {

    function RandomSignal(config) {
        RED.nodes.createNode(this,config);
        var node = this;

		const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
		delay(1000).then(() => createNode(node, config)); /// waiting 1 second.
	}

	function createNode(node, config) {
		var options = config.options;
		var color = config.color;
		var signal = config.signal;
		var output = config.output;
		var outputType = config.outputType;

		var flowContext = node.context().flow;
		var globalContext = node.context().global;
		//Variable to save flow and globals variable and value
		var flow = {};
		var global = {};

		function checkOptions(options, msg) {
			//Check if options array has "value" and "weight" properties
			var optionsOK = false;
			var optionsChanged = JSON.parse(JSON.stringify(options));

			for (let option of optionsChanged) {
				//Check if some data has "value" and "weight"
				if ("value" in option && "weight" in option) {
					optionsOK = true;

					//Check if type is "msg", "flow" or "global" to change value to type + "." + value
					checkValueTypeToChange(option);
					checkWeightTypeToChange(option);
				}
			}

			if (optionsChanged.length > 0 && optionsOK)
				weightedRandom(node, optionsChanged, msg);
			else
				node.status({fill:"grey",shape:"dot",text:""});
		}

		//Check if type is "msg", "flow" or "global" to change value to type + "." + value
		function checkValueTypeToChange(option) {
			switch (option.typeValue) {
				case "msg":
					option.value = option.typeValue + "." + option.value;
					break;
				case "flow":
					flow[option.value] = flowContext.get(option.value); //Save flow variable value
					option.value = option.typeValue + "." + option.value;
					break;
				case "global":
					global[option.value] = globalContext.get(option.value); //Save flow variable value
					option.value = option.typeValue + "." + option.value;
					break;
			}
		}

		//Check if type is "msg", "flow" or "global" to change value to type + "." + value
		function checkWeightTypeToChange(option) {
			switch (option.typeWeight) {
				case "msg":
					option.weight = option.typeWeight + "." + option.weight;
					break;
				case "flow":
					flow[option.value] = flowContext.get(option.value); //Save flow variable value
					option.weight = option.typeWeight + "." + option.weight;
					break;
				case "global":
					global[option.value] = globalContext.get(option.value); //Save flow variable value
					option.weight = option.typeWeight + "." + option.weight;
					break;
			}
		}

		function weightedRandom(node, options, msg) {
			try {
				var values = options.map(function(e) { return e; });
				var weights = options.map(function(e) { return eval(e.weight) }); //Extract a list from the "weight" property
				var totalWeight = eval(weights.join("+")); //Get total weight
		
				var weighedValues = [];
				var currentValue = 0;
				
				while (currentValue < values.length) {
					for (i = 0; i < weights[currentValue]; i++) {
						weighedValues[weighedValues.length] = values[currentValue];
					}
					currentValue++;
				}
		
				var rnd = Math.floor(Math.random() * totalWeight);

				var value;
				try {
					//If value type is jsonata, msg, flow or global, eval value
					if (weighedValues[rnd].typeValue == "jsonata" || weighedValues[rnd].typeValue == "msg"|| weighedValues[rnd].typeValue == "flow"|| weighedValues[rnd].typeValue == "global")	value = eval(weighedValues[rnd].value);
					else value = weighedValues[rnd].value;
				} catch (error) {
					if (weighedValues[rnd].typeValue == "jsonata" || weighedValues[rnd].typeValue == "msg"|| weighedValues[rnd].typeValue == "flow"|| weighedValues[rnd].typeValue == "global")	value = weighedValues[rnd].value;
					else value = eval(weighedValues[rnd].value);
				}

				signals.write(signal, value);

				NodeSend(value, msg);
			} catch (error) {
				node.error("ERR: Invalid Options. " + error);
			}
		}

		function NodeSend(value, msg) {
            switch (outputType) {
                case "msg":
					let signalsWithValues = {};
					signalsWithValues[signal] = value;

					var splitOutput = output.split('.');
					var splitFirstLevel = splitOutput.shift();
					let strres = RecursiveOuputSplit(signalsWithValues, splitOutput, "");
					msg[splitFirstLevel] = JSON.parse(strres);

					//Merge input msg object with msg
					msg = helpFunctions.mergeDeep(node.inputMsg, msg);

					node.send(msg);
                    break;
                case "flow":
                    flowContext.set(output, value);
                    break;
                case "global":
                    globalContext.set(output, value);
                    break;
            }

            node.status({fill:color,shape:"dot",text:value});
        }

		//Prepare output message
		function RecursiveOuputSplit(signals, outputTxtSplit, txtRecursive) {
			if (outputTxtSplit.length == 0) {
				let indexSenal = 1;
				Object.keys(signals).forEach(key => {
					if (indexSenal < Object.keys(signals).length) {
						txtRecursive = txtRecursive +'"'+key+'"'+': ' +'"'+signals[key]+'", ';
					} else {
						txtRecursive = txtRecursive +'"'+key+'"'+': ' +'"'+signals[key]+'"';
					}
					indexSenal += 1;
				});
				txtRecursive = '{' + txtRecursive + '}';
				return txtRecursive;
			}   
			else {  
				var eliminado = outputTxtSplit.shift();
				txtRecursive = txtRecursive +'"'+eliminado+'"' + ': {';        
				txtRecursive = RecursiveOuputSplit(signals, outputTxtSplit, txtRecursive);        
				txtRecursive = txtRecursive + '}';
				return txtRecursive;
			}
		}

        node.on('input', function(msg) {
			node.inputMsg = JSON.parse(JSON.stringify(msg));
			var possibleColors = ["red","green","yellow","blue","grey"];
			
			if (msg.options != undefined) options = msg.options;
			if (msg.color != undefined && possibleColors.includes(msg.color.toLowerCase())) color = msg.color.toLowerCase();

			checkOptions(options, msg);
        });

		node.on('close', function() {
		});
	}

    RED.nodes.registerType("Random Signal", RandomSignal);
}