const signals = require('./lib/signals');
const helpFunctions = require('./lib/helpFunctions');

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
            node.inputMsg = JSON.parse(JSON.stringify(msg));
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
                    let signalsWithValues = {};
					signalsWithValues[configOptions.signal] = result;

					var splitOutput = configOptions.output.split('.');
					var splitFirstLevel = splitOutput.shift();
					let strres = RecursiveOuputSplit(signalsWithValues, splitOutput, "");
					configOptions.input[splitFirstLevel] = JSON.parse(strres);

                    //Merge input msg object with msg
					configOptions.input = helpFunctions.mergeDeep(node.inputMsg, configOptions.input);

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
	}

    RED.nodes.registerType("Math Calcs", CreateNode);
}