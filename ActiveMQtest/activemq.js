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

stompit.connect(server, function (error, client) {

    if (error) {
        console.log('connect error ' + error.message);
        return;
    }

    var sendHeaders = {
        'destination': '/topic/test',
        'content-type': 'text/plain'
    };

    for(i = 0; i < 100; i++) {
        var frame = client.send(sendHeaders);
        frame.write('hello' + i);
        frame.end();
    }

    
});



