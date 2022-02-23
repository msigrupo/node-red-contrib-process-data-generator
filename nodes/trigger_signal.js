const signals = require('./lib/signals');

module.exports = function(RED) {

    function TriggerSignal(config) {
        RED.nodes.createNode(this,config);
        var node = this;

		const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
		delay(1000).then(() => createNode(node, config)); /// waiting 1 second.
	}

	function createNode(node, config) {
		signals.event.on('change', (signal, value) => {
			if (config.signal == signal) {
				var payload = {};
				payload[signal] = value;

				node.send({payload: payload});
				node.status({fill:config.color,shape:"dot",text:value});
			}
		});

        node.on('input', function(msg) {
        });

		node.on('close', function() {
		});
	}

    RED.nodes.registerType("Trigger Signal", TriggerSignal);
}