const fs = require('fs');
const path = require('path');
const signals = require('./lib/signals');

module.exports = function(RED) {

    function FileSignal(config) {
        RED.nodes.createNode(this,config);
        var node = this;

		const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
		delay(1000).then(() => createNode(node, config)); /// waiting 1 second.
	}

	function createNode(node, config) {

		var configOptions = {
			filename: config.filename,
			encoding: config.encoding,
			separator: config.separator === "other" ? config.otherSeparator : config.separator,
			header: config.header,
			variables: config.variables,
			fileReading: config.fileReading,
			output: config.output,
            outputType: config.outputType,
		}

		var fileReadConfig = {
			readStarted: false, //A line has been read
			lastRowReaded: 0, //If fileReading is "sequential" add 1 until finish and reset to 0
			numRowsFile: 0, //Total rows with headers
			numRowsSkip: 1, //1 because lines start at 0
			fileExist: false
		}

		var pathNodeRed = path.join(__dirname, "..", ".."); //Path where find filename
		
		//Read line of file
		function readFile(msg) {
			const fastcsv = require('fast-csv');

			//Check if no lines have been read and the file has header, add 1 line to skip
			if (fileReadConfig.readStarted === false && configOptions.header === true) fileReadConfig.numRowsSkip += 1;

			//If random get random line to read
			if (configOptions.fileReading === "random") {
				fileReadConfig.lastRowReaded = Math.floor(Math.random() * fileReadConfig.numRowsFile - 1);
				if (fileReadConfig.lastRowReaded < 0) fileReadConfig.lastRowReaded = 0;
			}
			//If fileReading is "sequential" add lastRowReaded until finish and reset to 0
			else if (configOptions.fileReading === "sequential") {
				if (fileReadConfig.readStarted === true) {
					if (fileReadConfig.lastRowReaded < (fileReadConfig.numRowsFile - fileReadConfig.numRowsSkip))
						fileReadConfig.lastRowReaded += 1;
					else
						fileReadConfig.lastRowReaded = 0;
				}
			}

			if (fileReadConfig.readStarted === false) fileReadConfig.readStarted = true;

			fs.createReadStream(path.resolve(pathNodeRed, configOptions.filename))
				.pipe(fastcsv.parse({ headers: configOptions.header, delimiter: configOptions.separator, maxRows: 1, skipRows: fileReadConfig.lastRowReaded, encoding: configOptions.encoding }))
				.on('error', error => console.error(error))
				.on('data', row => {
					for (let i = 0; i < configOptions.variables.length; i++) {
						//Check if column exist to add value of column
						if (configOptions.variables[i].column < Object.values(row).length) {
							var signalName = GetSignalName(configOptions.variables[i], msg);
							// console.log("..............");
							// RecursiveOuputSplit(configOptions.variables[i], row, configOptions.output.split('.'), msg); //Probando recursivo
							// RecursiveOuputSplit(signalName, configOptions.variables[i], row, configOptions.output.split('.'), undefined, msg, undefined, 0); //Probando recursivo
							var splitOutput = configOptions.output.split('.');
							if (splitOutput.length > 1) {
								msg[splitOutput[0]] = Object.assign({}, msg[splitOutput[0]]);
								msg[splitOutput[0]][splitOutput[1]] = Object.assign({}, msg[splitOutput[0]][splitOutput[1]]);
								msg[splitOutput[0]][splitOutput[1]][signalName] = Object.values(row)[configOptions.variables[i].column];
							} else {
								msg[configOptions.output] = Object.assign({}, msg[configOptions.output]);
								if (configOptions.output === "payload") msg[configOptions.output][signalName] = Object.values(row)[configOptions.variables[i].column];
								else msg[configOptions.output][signalName] = Object.values(row)[configOptions.variables[i].column];
							}

							signals.write(signalName, Object.values(row)[configOptions.variables[i].column]);
						}
					}

					NodeSend(msg);
				})
				.on('end', rowCount => {
				}
			);
		}

		//Count how many lines the file has
		function countFileLines(msg) {
			const split2 = require('split2');

			var lineCount = 0;

			fs.createReadStream(path.resolve(pathNodeRed, configOptions.filename))
				.pipe(split2())
				.on('error', (error) => {
				})
				.on('data', (line) => {
					lineCount++;
				})
				.on('end', () => {

					fileReadConfig.numRowsFile = lineCount;
					//After count read line of file if it has headers it has to have more than one line
					if ((configOptions.header === true && lineCount > 1) || (configOptions.header === false && lineCount > 0))
						readFile(msg);
				})
		}

		//Check if file exist
		function fileExist() {
			if (fs.existsSync(path.resolve(pathNodeRed, configOptions.filename))) {
				fileReadConfig.fileExist = true;
			} else {
				fileReadConfig.fileExist = false;
			}
		}

		function GetSignalName(signal, msg) {
			var typeValue = signal.variable;
			switch (signal.varType) {
				case "msg":
					var msgValue = signal.varType + "." + signal.variable;
					typeValue = eval(msgValue);
					break;
				case "flow":
					typeValue = flowContext.get(signal.variable); //Save flow variable value
					break;
				case "global":
					typeValue = globalContext.get(signal.variable); //Save flow variable value
					break;
				default:
					typeValue = signal.variable;
					break;
			}

			return typeValue;
		}

		function RecursiveOuputSplit_(signal, row, outputTxtSplit, msg) {
			console.log("****");
			console.log(outputTxtSplit);
			// var splitOutput = configOptions.output.split('.');
			// if (splitOutput.length > 1) {
			// 	msg[splitOutput[0]] = Object.assign({}, msg[splitOutput[0]]);
			// 	msg[splitOutput[0]][splitOutput[1]] = Object.assign({}, msg[splitOutput[0]][splitOutput[1]]);
			// 	msg[splitOutput[0]][splitOutput[1]][signalName] = Object.values(row)[configOptions.variables[i].column];
			// } else {
			// 	msg[configOptions.output] = Object.assign({}, msg[configOptions.output]);
			// 	if (configOptions.output === "payload") msg[configOptions.output][signalName] = Object.values(row)[configOptions.variables[i].column];
			// 	else msg[configOptions.output][signalName] = Object.values(row)[configOptions.variables[i].column];
			// }
			
			// msg[outputTxtSplit[0]] = Object.assign({}, msg[outputTxtSplit[0]]);
			if (outputTxtSplit != undefined && outputTxtSplit.length >= 1) {
				console.log(">1");
				msg[outputTxtSplit[0]] = Object.assign({}, msg[outputTxtSplit[0]]);

				var rest = outputTxtSplit.shift();
				console.log(outputTxtSplit.length);

				RecursiveOuputSplit(signal, row, outputTxtSplit);
			} else {
				console.log("<=1");
				SetOutputValue();
			}
		}

		function RecursiveOuputSplit(signalName, signal, rowData, originalSplit, outputTxtSplit, msg, txtRecursive, currentLevel) {
			console.log("****");
			if (outputTxtSplit === undefined) outputTxtSplit = JSON.parse(JSON.stringify(originalSplit));
			console.log(outputTxtSplit);
			
			if (outputTxtSplit != undefined && outputTxtSplit.length >= 1) {
				msg[outputTxtSplit[0]] = Object.assign({}, msg[outputTxtSplit[0]]);

				var rest = outputTxtSplit.shift();
				console.log(outputTxtSplit.length);

				if (txtRecursive === undefined) {
					txtRecursive = "msg[originalSplit[0]]";

					console.log(txtRecursive);
					eval(txtRecursive) = Object.assign({}, eval(txtRecursive));
				}

				if(outputTxtSplit.length > 0) {
					currentLevel += 1;
					txtRecursive = txtRecursive + "[originalSplit[" + currentLevel + "]]";
				} else {
					txtRecursive = txtRecursive + "[signalName]";
				}

				console.log(txtRecursive);
				eval(txtRecursive) = Object.assign({}, eval(txtRecursive));
				
				RecursiveOuputSplit(signalName, signal, rowData, originalSplit, outputTxtSplit, msg, txtRecursive, currentLevel);
			} else {
				SetOutputValue(signal, rowData, msg, txtRecursive, originalSplit);
			}
		}

		function SetOutputValue(signal, rowData, msg, txtRecursive, originalSplit) {
			console.log("set");
			// console.log(msg);
			console.log(txtRecursive);
			console.log(originalSplit);
		}

		function NodeSend(msg) {
            switch (configOptions.outputType) {
                case "msg":
					node.send(msg);
                    break;
                case "flow":
					var flowContext = node.context().flow;
					for (var result in msg[configOptions.output]) {
						flowContext.set(configOptions.output + "." + result, msg[configOptions.output][result]);
					}
                    break;
                case "global":
					var globalContext = node.context().global;
					for (var result in msg[configOptions.output]) {
						globalContext.set(configOptions.output + "." + result, msg[configOptions.output][result]);
					}
                    break;
            }
        }

        node.on('input', function(msg) {
			if (msg.filename != undefined) configOptions.filename = msg.filename;
			if (msg.encoding != undefined) configOptions.encoding = msg.encoding;
			if (msg.separator != undefined) configOptions.separator = msg.separator;
			if (msg.header != undefined) configOptions.header = msg.header;
			if (msg.variables != undefined) configOptions.variables = msg.variables;
			if (msg.fileReading != undefined) configOptions.fileReading = msg.fileReading;
			if (msg.output != undefined) configOptions.output = msg.output;
            if (msg.outputType != undefined) configOptions.outputType = msg.outputType;

			//First time check if file exist and count file lines
			if (fileReadConfig.readStarted === false) {
				if (fileReadConfig.fileExist === false) fileExist();

				if (fileReadConfig.fileExist === true) countFileLines(msg);
			}
			else readFile(msg);
        });

		node.on('close', function() {
		});
	}

    RED.nodes.registerType("File Signal", FileSignal);
}