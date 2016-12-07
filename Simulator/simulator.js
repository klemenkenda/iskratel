var jsonfile = require('jsonfile');

function Simulator() {
    this.n = 0;
    this.val = [];

    this.init = function(name, interval, sm) {
        this.name = name;
        this.sm = sm;
        this.interval = interval;
        this.smN = sm.length;
        this.nodeid = Math.floor((Math.random() * this.smN));
        console.log("Selected node #" + this.nodeid);
        this.factor = Math.random() * 3;
        this.noise = Math.random() * 0.2;
        this.delay = Math.random() * 15 * 60 * 1000;
        var _this = this;
        this.timeout = setTimeout(function() { _this.nextMeasurement(); }, this.delay);
    }

    this.nextMeasurement = function() {
        this.timestamp = new Date();
        this.val = [];
        console.log("NodeID", this.nodeid);
        for (i = 0; i < this.sm[this.nodeid].sensors.length; i++) {
            var sensor = this.sm[this.nodeid].sensors[i];
            this.val[i] = sensor.profile[this.n] * sensor.max * this.factor + (Math.random() * this.noise - this.noise/2);
            // console.log(sensor);
        };
        this.n++;
        if (this.n >= this.sm[this.nodeid].sensors[0].profile.length) this.n = 0;
        this.propagate();
    }


    this.propagate = function() {
        console.log(this.name + "#" + this.n, this.val, this.timestamp);
        var _this = this;
        this.timeout = setTimeout(function() { _this.nextMeasurement(); }, this.interval);
    }
}

function SimulatorManager() {
    this.simulators =  [];

    this.init = function() {
        this.nodes = [];
        this.nodes = jsonfile.readFileSync('nodes.json');
    }

    this.addSimulators = function() {
        // console.log(_this.simulators);
        for (var i = 1; i < 10000; i++) {
            this.addSimulator(this, "node" + i);
        }
    }

    this.addSimulator = function(_this, name) {
        var simulator = new Simulator();
        simulator.init(name, 15 * 60 * 1000, _this.nodes);
        _this.simulators.push(simulator);
    }
}

var simulatorManager = new SimulatorManager();
simulatorManager.init();
simulatorManager.addSimulators();
