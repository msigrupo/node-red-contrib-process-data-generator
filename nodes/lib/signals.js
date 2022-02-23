var events = require('events');

const signals = {
    valSignals: {},

    event: new events.EventEmitter(),

    write(signal, value) {
        if (signals.valSignals[signal] != value) {
            signals.valSignals[signal] = value;
            signals.event.emit('change', signal, value);
        }
    },

    read(signal) {
        if (signals.valSignals[signal] != undefined) return signals.valSignals[signal];
        else return undefined;
    }
}

module.exports = signals;