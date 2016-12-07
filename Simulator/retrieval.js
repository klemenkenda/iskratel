var syncRequest = require('sync-request');

// Date hacks
function clone(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

function twoDigits(d) {
    if (0 <= d && d < 10) return "0" + d.toString();
    if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
    return d.toString();
}

Date.prototype.toMysqlFormat = function () {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};

Date.prototype.toMysqlDateFormat = function () {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate());
};

Date.prototype.addHours = function (h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
}

Date.prototype.fromMySQL = function(dateStr) {
    // Split timestamp into [ Y, M, D, h, m, s ]
    var t = dateStr.split(/[- :]/);

    // Apply each element to the Date function
    var d = new Date(Date.UTC(t[0], t[1]-1, t[2], t[3], t[4], t[5]));

    return d;
}

function SyncRequestRetry() {
    this.retries = 10;

    this.getJSON = function(url) {
        var ok = false;
        var resJSON = [];
        n = 0;
        while ((ok == false) || (n < this.retries)) {
            ok = true;
            n++;
            try {
                res = syncRequest('GET', url);
                resJSON = JSON.parse(res.getBody());
            } catch(e) {
                ok = false;
                console.log("Error: ", e.message)
            }
        }

        return resJSON;
    }
}

var syncRequestRetry = new SyncRequestRetry();

function Loader() {
    this.nodes = [];
    this.nodesData = [];
    this.nodesN = 0;

    this.loadNodes = function () {
        this.nodesData = syncRequestRetry.getJSON('http://atena.ijs.si/api/get-nodes');
        this.nodesN = this.nodesData.length;
    }

    this.transverseNode = function(i) {
        var sensors = [];
        if (i > this.nodesN) return;

        // go through sensors
        var node = this.nodesData[i];

        var name = node.Name;
        var sensorsData = node.Sensors;

        for (var j = 0; j < sensorsData.length; j++) {
            phenomenon = sensorsData[j].Phenomenon;
            uom = sensorsData[j].UoM;
            start = sensorsData[j].StartDate;
            end = sensorsData[j].EndDate;

            measurementsA = this.normalizedProfile7(sensorsData[j]);
            measurements = measurementsA[1];
            kmax = measurementsA[0];

            sensors.push({'phenomenon': phenomenon, 'uom': uom, 'start': start, 'end': end, 'profile': measurements, 'max': kmax });
        }

        this.nodes.push({ 'name': name, 'sensors': sensors });
    }

    this.normalizedProfile7 = function(sensorData) {
        var normalized = [];
        var kmax;

        predictSensor = sensorData.Name;

        to = new Date();
        to = to.fromMySQL(sensorData.EndDate + " 0:00:00");
        console.log(sensorData.EndDate);
        from = clone(to);
        from = from.addHours(-1 * 24 * 7);

        if (from < sensorData.StartDate) return false;

        var url = 'http://atena.ijs.si/api/get-measurements?p=' + escape(predictSensor) + ':' + from.toMysqlDateFormat() + ':' + to.toMysqlDateFormat();
        console.log(url);
        var measurements = syncRequestRetry.getJSON(url);
        kmax = 0;
        for (k = 0; k < measurements.length; k++) {
            if (measurements[k].Val > kmax) kmax = measurements[k].Val;
        }

        if (kmax == 0) kmax = -1;

        // make normalized Array
        for (k = 0; k < measurements.length; k++) {
            var val = measurements[k].Val / kmax;
            var time = Date.parse(measurements[k].Timestamp);

            if (k > 0) {
                mseconds = time - lastTime;
                n = mseconds / (15 * 60 * 1000);
                // console.log(n);

                for (w = 1; w < n; w++) {
                    normalized.push(-999.0);
                }
            }
            normalized.push(val);

            lastTime = time;

        }

        return [kmax, normalized];
    }
}

// var res = syncRequest('GET', 'http://atena.ijs.si/api/get-measurements?p=' + escape(predictSensor) + ':' + from + ':' + tomorrow.toMysqlDateFormat());
// var sensorData = JSON.parse(res.getBody());


var loader = new Loader();

var nodes = loader.loadNodes();
console.log(loader.nodesN + " nodes loaded");

for (i = 0; i < loader.nodesN; i++) {
    if ((i != 1) && (i != 2)) loader.transverseNode(i);
}
console.log(loader.nodes);

var jsonfile = require('jsonfile');
jsonfile.writeFile('nodes.json', loader.nodes, { spaces: 4}, function (err) {
    console.error(err);
})
