const opcua = require("node-opcua");
const os = require("os");
const signals = require('./lib/signals');

module.exports = function(RED) {

	function CreateNode(config) {
		RED.nodes.createNode(this,config);
		var node = this;

		const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
		delay(1000).then(() => OPCUA_Server(node, config)); /// waiting 1 second.
	}

	function OPCUA_Server(node, config) {

		const STOPPED = 0;
		const RUNNING = 1;
		const STARTING = 2;
		const RESTARTING = 3;

		var configOptions = {
			port: Number.parseInt(config.port),
			resourcePath: config.resourcePath,
			browseName: config.browseName
		}

		// signals.event.on('new', (signal, value) => {
		// 	configOptions.signals = Object.keys(signals.valSignals);
		// 	RestartSever();
		// });

		var servStatus = STOPPED;
		NodeStatus();

		node.on('input', function(msg) {
			if (msg.port != undefined) configOptions.port = Number.parseInt(msg.port);
			if (msg.resourcePath != undefined) configOptions.resourcePath = msg.resourcePath;
			if (msg.browseName != undefined) configOptions.browseName = msg.browseName;
			// if (msg.signals != undefined) configOptions.signals = Object.assign((configOptions.signals != undefined) ? configOptions.signals : {}, msg.signals);

			RestartSever();
		});

		node.on('close', function() {
			CloseServer();
		});

		//Set server parameters
		async function InitServer() {
			node.server_options = {
				port: parseInt(configOptions.port),
				resourcePath: configOptions.resourcePath
			}

			var discovery_server_endpointUrl = "opc.tcp://" + os.hostname() + ":" + configOptions.port + configOptions.resourcePath;
			console.log("Server is now listening ... ( press CTRL+C to stop)");
			console.log(" the primary server endpoint url is ", discovery_server_endpointUrl);
		}

		function construct_my_address_space(addressSpace) {
			const namespace = addressSpace.getOwnNamespace();

			const device = namespace.addObject({
				organizedBy: addressSpace.rootFolder.objects,
				browseName: configOptions.browseName
			});

			if (configOptions.signals != undefined) {
				for (var signal in configOptions.signals) {
					(function (signal) {
						var opcDataType = CheckDataType(configOptions.signals[signal]);
						signals.write(signal, (signals.read(signal) != undefined) ? signals.read(signal) : configOptions.signals[signal]);
						namespace.addVariable({
							componentOf: device,
							nodeId: "ns=1;s=" + signal,
							browseName: signal,
							dataType: opcDataType,
							value: {
								get: function () {
									var val = (signals.read(signal) != undefined) ? signals.read(signal) : configOptions.signals[signal];
									return new opcua.Variant({dataType: opcDataType, value: val });
								},
								set: function (variant) {
									signals.write(signal, variant.value);
									return opcua.StatusCodes.Good;
								}
							}
						});
					}).call(this, signal);
				}
			}
		}

		function CheckDataType(val) {
			var dataType = opcua.DataType.String
			if (isNaN(val)) {
				dataType = opcua.DataType.String
			} else {
				if (Number.isInteger(val)) {
					dataType = opcua.DataType.Int16
				} else {
					dataType = opcua.DataType.Double	
				}
			}

			return dataType;
		}

		(async () => {
			try {
				servStatus = STARTING;
				NodeStatus();

				await InitServer(); //Set parameters
				node.server = new opcua.OPCUAServer(node.server_options);

				await node.server.initialize();
				construct_my_address_space(node.server.engine.addressSpace);
				await node.server.start();

				ServerOnEvents();
				
				servStatus = RUNNING;
				NodeStatus();

				signals.event.on('new', (signal, value) => {
					configOptions.signals = Object.keys(signals.valSignals);
					RestartSever();
				});
			}
			catch (err) {
				console.log("Error: " + err);
			}
        })();

		async function RestartSever() {
			console.log("Restart OPC UA Server");
			if (node.server) {
				servStatus = RESTARTING;
				NodeStatus();

				node.server.engine.setShutdownReason("Shutdown command received");
				// Wait 10s before shutdown
				await node.server.shutdown(10000).then(() => {
					node.server.dispose();
					node.server = null;
				});

				// Start server again
				await InitServer();
				node.server = new opcua.OPCUAServer(node.server_options);
				node.server.on("post_initialize", () => {
					construct_my_address_space(node.server.engine.addressSpace);
				});                                   
				await node.server.start();
				
				ServerOnEvents();
			}

			if (node.server) {
				console.log("Restart OPC UA Server done");
				servStatus = RUNNING;
				NodeStatus();
			} else {
				console.log("Cannot restart OPC UA Server");
				servStatus = STOPPED;
				NodeStatus();
			}
		}

		function CloseServer() {
			if (node.server) {
				node.server.shutdown(0, function () {
					node.server = null;
				});
			} else {
				node.server = null;
			}
		}

		function ServerOnEvents() {
			// Client connects with userName
			node.server.on("session_activated", (session) => {
				if (session.userIdentityToken && session.userIdentityToken.userName) {
					var msg = {};
					msg.topic="Username";
					msg.payload = session.sessionName.toString();
					node.send(msg);
				}
			});
			// Client connected
			node.server.on("create_session", function(session) {
				var msg = {};
				msg.topic="Client-connected";
				msg.payload = session.sessionName.toString();
				node.send(msg);
			});
			// Client disconnected
			node.server.on("session_closed", function(session, reason) {
				var msg = {};
				msg.topic="Client-disconnected";
				msg.payload = session.sessionName.toString();
				node.send(msg);
			});
		}

		function NodeStatus() {
			var color = "red";
			var text = "";

			switch (servStatus) {
				case STOPPED:
					color = "red";
					text = "stopped";
					break;
				case RUNNING:
					color = "green";
					text = "running";
					break;
				case STARTING:
					color = "blue";
					text = "starting";
					break;
				case RESTARTING:
					color = "yellow";
					text = "restarting";
					break;
			}

			node.status({
				fill: color,
				shape: "dot",
				text: text
			});
		}
	}

	RED.nodes.registerType("OPC UA", CreateNode);
}