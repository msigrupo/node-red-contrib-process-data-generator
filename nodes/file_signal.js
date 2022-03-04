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

		let firstLineData = config.firstLineData != "" && Number.parseFloat(config.firstLineData) >= 1 ? Number.parseFloat(config.firstLineData) : 0;
		var configOptions = {
			filename: config.filename,
			encoding: config.encoding,
			separator: config.separator === "other" ? config.otherSeparator : config.separator,
			firstLineData: firstLineData, //Data start at line
			typeOfSignals: config.typeOfSignals,
			variables: config.variables,
			headerRow: Number.parseFloat(config.headerRow), //Config header row
			startColumn: Number.parseFloat(config.startColumn), //Config column start
			fileReading: config.fileReading,
			output: config.output,
            outputType: config.outputType,
		}

		let fileHasHeader = false;

		let startLine = configOptions.firstLineData - 1;
		if (startLine <= 0) startLine = 0;

		let rHeader = 0;
		let sColumn = 0;
		if (configOptions.typeOfSignals === "header") {
			rHeader = configOptions.headerRow - 1;
			if (rHeader <=0) rHeader = 0;

			sColumn = configOptions.startColumn - 1;
			if (sColumn <= 0) sColumn = 0;
		}

		var fileReadConfig = {
			readStarted: false, //A line has been read
			fileWithHeader: fileHasHeader, //File has header
			lastRowReaded: startLine, //If fileReading is "sequential" add 1 until finish and reset to start line
			numRowsFile: 0, //Total rows with headers
			numRowsSkip: 1, //1 because lines start at 0
			fileExist: false,
			headerRow: rHeader, //Header row line to read and save headers names
			startColumn: sColumn //Starts column to take data
		}

		var fileHeaderLineNames = []; //If configOptions.typeOfSignals is header, save header line

		var pathNodeRed = path.join(__dirname, "..", ".."); //Path where find filename
		
		//Prepare line to read and check type of signal
		function prepareAndCheckReadFile(msg) {
			const fastcsv = require('fast-csv');

			//Check if no lines have been read and the file has header, add 1 line to skip
			if (fileReadConfig.readStarted === false && fileReadConfig.fileWithHeader === true) fileReadConfig.numRowsSkip += 1;

			//If random get random line to read
			if (configOptions.fileReading === "random") {
				//Random between start line and total rows of file
				fileReadConfig.lastRowReaded = Math.floor(GenerateRandomNumber(startLine, fileReadConfig.numRowsFile));
				if (fileReadConfig.lastRowReaded < startLine) fileReadConfig.lastRowReaded = startLine;
			}
			//If fileReading is "sequential" add lastRowReaded until finish and reset to start line
			else if (configOptions.fileReading === "sequential") {
				if (fileReadConfig.readStarted === true) {
					if (fileReadConfig.lastRowReaded < (fileReadConfig.numRowsFile - fileReadConfig.numRowsSkip))
						fileReadConfig.lastRowReaded += 1;
					else {
						fileReadConfig.lastRowReaded = startLine;
					}
				}
			}

			if (fileReadConfig.readStarted === false) fileReadConfig.readStarted = true;

			//If configOptions.typeOfSignals is header, save header line
			if (configOptions.typeOfSignals === "header") readFileHeaderAndSave(fs, fastcsv, pathNodeRed, msg);
			else readFileAndSend(fs, fastcsv, pathNodeRed, msg);
		}

		//Read line of file and save in array
		function readFileHeaderAndSave(fs, fastcsv, pathNodeRed, msg) {
				fs.createReadStream(path.resolve(pathNodeRed, configOptions.filename))
					.pipe(fastcsv.parse({ headers: fileReadConfig.fileWithHeader, delimiter: configOptions.separator, maxRows: 1, skipRows: fileReadConfig.headerRow, encoding: configOptions.encoding }))
					.on('error', error => console.error(error))
					.on('data', row => {
						fileHeaderLineNames = row;
					})
					.on('end', rowCount => {
						readFileAndSend(fs, fastcsv, pathNodeRed, msg);
					}
				);
		}

		//Read line of file, write in signal and send msg
		function readFileAndSend(fs, fastcsv, pathNodeRed, msg) {
			fs.createReadStream(path.resolve(pathNodeRed, configOptions.filename))
				.pipe(fastcsv.parse({ headers: fileReadConfig.fileWithHeader, delimiter: configOptions.separator, maxRows: 1, skipRows: fileReadConfig.lastRowReaded, encoding: configOptions.encoding }))
				.on('error', error => console.error(error))
				.on('data', row => {
					if (configOptions.typeOfSignals === "concrete") {
						for (let i = 0; i < configOptions.variables.length; i++) {
							//Check if column exist to add value of column
							if (configOptions.variables[i].column < Object.values(row).length) {
								var signalName = GetSignalName(configOptions.variables[i], msg);
								// console.log("..............");
								// RecursiveOuputSplit(configOptions.variables[i], row, configOptions.output.split('.'), msg); //Probando recursivo
								// RecursiveOuputSplit(signalName, configOptions.variables[i], row, configOptions.output.split('.'), undefined, msg, undefined, 0); //Probando recursivo

								let value = Object.values(row)[configOptions.variables[i].column];
								PrepareOutputMessage(msg, signalName, value);
								WriteSignal(signalName, value);
							}
						}
					} else {
						let txtEmptyHeader = "FileSignal_";
						for (let i = fileReadConfig.startColumn; i < row.length; i++) {
							var signalName = fileHeaderLineNames[i];
							signalName = replaceSpecialCharacters(signalName);
							if (signalName === "") signalName = txtEmptyHeader + i;

							let value = Object.values(row)[i];
							PrepareOutputMessage(msg, signalName, value);
							WriteSignal(signalName, value);
						}
					}
					NodeSend(msg);
				})
				.on('end', rowCount => {
				}
			);
		}

		//Prepare output message
		function PrepareOutputMessage(msg, signalName, value) {
			var splitOutput = configOptions.output.split('.');
			if (splitOutput.length > 1) {
				msg[splitOutput[0]] = Object.assign({}, msg[splitOutput[0]]);
				msg[splitOutput[0]][splitOutput[1]] = Object.assign({}, msg[splitOutput[0]][splitOutput[1]]);
				msg[splitOutput[0]][splitOutput[1]][signalName] = value;
			} else {
				msg[configOptions.output] = Object.assign({}, msg[configOptions.output]);
				if (configOptions.output === "payload") msg[configOptions.output][signalName] = value;
				else msg[configOptions.output][signalName] = value;
			}
		}

		//Write signal value
		function WriteSignal(signalName, value) {
			signals.write(signalName, value);
		}

		//Replace all characters except letters and numbers
		function replaceSpecialCharacters(string) {
			return string.replace(/[^a-zA-Z0-9]/g,'_');
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
					if ((fileReadConfig.fileWithHeader === true && lineCount > 1) || (fileReadConfig.fileWithHeader === false && lineCount > 0))
						prepareAndCheckReadFile(msg);
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

		//Return random number between two numbers
		function GenerateRandomNumber(min, max) {
			return (Math.random() * (Number.parseFloat(max) - Number.parseFloat(min))) + Number.parseFloat(min);
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
			if (msg.firstLineData != undefined) {
				let firstLineData;
				if (isNaN(msg.firstLineData)) firstLineData = 0;
				else firstLineData = Number.parseFloat(msg.firstLineData) >= 1 ? Number.parseFloat(msg.firstLineData) : 0;
				configOptions.firstLineData = firstLineData;
			}
			if (msg.typeSignal != undefined) {
				configOptions.typeOfSignals = msg.typeSignal;

				if (configOptions.typeOfSignals === "header") {
					//Header row
					let rHeader = 0;
					if (msg.headerRow != undefined) {
						if (isNaN(msg.headerRow)) configOptions.headerRow = 0;
						else configOptions.headerRow = Number.parseFloat(msg.headerRow);

						rHeader = configOptions.headerRow - 1;
						if (rHeader <=0) rHeader = 0;
						fileReadConfig.headerRow = rHeader;
					}

					//Start column
					let sColumn = 0;
					if (msg.startColumn != undefined) {
						if (isNaN(msg.headerRow)) configOptions.startColumn = 0;
						else configOptions.startColumn = Number.parseFloat(msg.startColumn);

						sColumn = configOptions.startColumn - 1;
						if (sColumn <= 0) sColumn = 0;
						fileReadConfig.startColumn = sColumn;
					}
				}
			}
			if (msg.variables != undefined) configOptions.variables = msg.variables;
			if (msg.fileReading != undefined) configOptions.fileReading = msg.fileReading;
			if (msg.output != undefined) configOptions.output = msg.output;
            if (msg.outputType != undefined) configOptions.outputType = msg.outputType;

			//First time check if file exist and count file lines
			if (fileReadConfig.readStarted === false) {
				if (fileReadConfig.fileExist === false) fileExist();

				if (fileReadConfig.fileExist === true) {
					//If firstLineData and it is first time, configure lastRowReaded to don't take from node configuration
					if (msg.firstLineData != undefined) {
						startLine = configOptions.firstLineData - 1;
						if (startLine <= 0) startLine = 0;
						fileReadConfig.lastRowReaded = configOptions.firstLineData - 1;
					}
					countFileLines(msg);
				}
			}
			else prepareAndCheckReadFile(msg);
        });

		node.on('close', function() {
		});
	}

    RED.nodes.registerType("File Signal", FileSignal);
}