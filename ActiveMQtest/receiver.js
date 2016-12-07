var stompit = require('stompit');

var server = {
    'host': 'localhost',
    'port': 61613,
    'connectHeaders': {
        'host': '/',
        'login': 'username',
        'passcode': 'password',
        'heart-beat': '5000,5000'
    }
};

var servers = [server];

var reconnectOptions = {
    'maxReconnects': 1000
}

var manager = new stompit.ConnectFailover(servers, reconnectOptions);

manager.connect(function (error, client, reconnect) {
    if (error) {
        // terminal error, given up reconnecting
        return;
    }

    client.on('error', function (error) {

        // calling reconnect is optional and you may not want to reconnect if the
        // same error will be repeated.

        reconnect();
    });

    var subscribeHeaders = {
        'destination': '/topic/test',
        'ack': 'client-individual'
    };

    client.subscribe(subscribeHeaders, function (error, message) {

        if (error) {
            console.log('subscribe error ' + error.message);
            return;
        }

        message.readString('utf-8', function (error, body) {

            if (error) {
                console.log('read message error ' + error.message);
                return;
            }

            console.log('received message: ' + body);

            client.ack(message);

            // client.disconnect();
        });
    });

})






