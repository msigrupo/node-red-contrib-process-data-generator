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
					let signalsWithValues = {};
					if (configOptions.typeOfSignals === "concrete") {
						for (let i = 0; i < configOptions.variables.length; i++) {
							//Check if column exist to add value of column
							if (configOptions.variables[i].column < Object.values(row).length) {
								var signalName = GetSignalName(configOptions.variables[i], msg);

								let value = Object.values(row)[configOptions.variables[i].column];
								WriteSignal(signalName, value);

								signalsWithValues[signalName] = value;
							}
						}
					} else {
						let txtEmptyHeader = "FileSignal_";
						for (let i = fileReadConfig.startColumn; i < row.length; i++) {
							var signalName = fileHeaderLineNames[i];
							signalName = replaceSpecialCharacters(signalName);
							if (signalName === "") signalName = txtEmptyHeader + i;
							
							let value = Object.values(row)[i];
							WriteSignal(signalName, value);

							//Save signal and value and then do recursive with all signals
							signalsWithValues[signalName] = value;
							
						}
					}
					var splitOutput = configOptions.output.split('.');
					var splitFirstLevel = splitOutput.shift();
					let strres = RecursiveOuputSplit(signalsWithValues, splitOutput, "");
					msg[splitFirstLevel] = JSON.parse(strres);

					NodeSend(msg);
				})
				.on('end', rowCount => {
				}
			);
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