const signals = require('./lib/signals');

module.exports = function(RED) {

    function CreateNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

		const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
		delay(1000).then(() => MathCalcs(node, config)); /// waiting 1 second.
	}

	function MathCalcs(node, config) {

        var flowContext = node.context().flow;
		var globalContext = node.context().global;

        var configOptions = {
            signal: config.signal,
			calcNum1: config.calcNum1,
			calcNum1Type: config.calcNum1Type,
			calcOpe: config.calcOpe,
			calcNum2: config.calcNum2,
			calcNum2Type: config.calcNum2Type,
			output: config.output,
            outputType: config.outputType,
            color: config.color
		}

        var calcOperation = {
            num1: undefined,
            num2: undefined,
            ope: configOptions.calcOpe
        }

        node.on('input', function(msg) {
            if (msg.calcNum1 != undefined) configOptions.calcNum1 = msg.calcNum1;
            if (msg.calcNum1Type != undefined) configOptions.calcNum1Type = msg.calcNum1Type;
            if (msg.calcOpe != undefined) configOptions.calcOpe = msg.calcOpe;
            if (msg.calcNum2 != undefined) configOptions.calcNum2 = msg.calcNum2;
            if (msg.calcNum2Type != undefined) configOptions.calcNum2Type = msg.calcNum2Type;
            if (msg.output != undefined) configOptions.output = msg.output;
            if (msg.outputType != undefined) configOptions.outputType = msg.outputType;
            if (msg.color != undefined) configOptions.color = msg.color;
            configOptions.input = msg;

            CalculateOperation();
        });

		node.on('close', function() {
		});

        function CalculateOperation() {
            //Check number type to set number operation
            CheckNum1Type();
            CheckNum2Type();

            //Check if numbers are valid
            if (calcOperation.num1 != undefined && !isNaN(calcOperation.num1) && calcOperation.num2 != undefined && !isNaN(calcOperation.num1)) {
                var result = eval(calcOperation.num1 + calcOperation.ope + calcOperation.num2);
                NodeSend(result);
            } else node.status({fill:"red",shape:"dot",text:"ERROR"});
        }

        function CheckNum1Type() {
            switch (configOptions.calcNum1Type) {
				case "msg":
                    var msgValue = "configOptions.input." + configOptions.calcNum1;
                    calcOperation.num1 = eval(msgValue);
					break;
				case "flow":
                    calcOperation.num1 = flowContext.get(configOptions.calcNum1);
					break;
				case "global":
                    calcOperation.num1 = globalContext.get(configOptions.calcNum1);
					break;
                default:
                    calcOperation.num1 = configOptions.calcNum1;
                    break;
			}
        }

        function CheckNum2Type() {
            switch (configOptions.calcNum2Type) {
				case "msg":
                    var msgValue = "configOptions.input." + configOptions.calcNum2;
                    calcOperation.num2 = eval(msgValue);
					break;
				case "flow":
                    calcOperation.num2 = flowContext.get(configOptions.calcNum2);
					break;
				case "global":
                    calcOperation.num2 = globalContext.get(configOptions.calcNum2);
					break;
                default:
                    calcOperation.num2 = configOptions.calcNum2;
                    break;
			}
        }

        function NodeSend(result) {
            signals.write(configOptions.signal, result);

            switch (configOptions.outputType) {
                case "msg":
                    var splitOutput = configOptions.output.split('.');
					if (splitOutput.length > 1) {
						configOptions.input[splitOutput[0]] = Object.assign({}, configOptions.input[splitOutput[0]]);
						configOptions.input[splitOutput[0]][splitOutput[1]] = result;
					} else {
                        configOptions.input[configOptions.output] = Object.assign({}, configOptions.input[configOptions.output]);
                        if (configOptions.output === "payload") configOptions.input[configOptions.output][configOptions.signal] = result;
                        else configOptions.input[configOptions.output] = result;
					}

                    node.send(configOptions.input);
                    break;
                case "flow":
                    flowContext.set(configOptions.output, result);
                    break;
                case "global":
                    globalContext.set(configOptions.output, result);
                    break;
            }

            node.status({fill:configOptions.color,shape:"dot",text:result});
        }
	}

    RED.nodes.registerType("Math Calcs", CreateNode);
}