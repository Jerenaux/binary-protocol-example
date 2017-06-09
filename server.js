var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

var Codec = require('./js/codec.js').Codec;

app.use('/js',express.static(__dirname + '/js'));

app.get('/',function(req,res){
    res.sendFile(__dirname+'/index.html');
});

server.listen(process.env.PORT || 8081,function(){
    console.log('Listening on '+server.address().port);
});

io.on('connection',function(socket){
    socket.on('ready',function(){

        var update = {
            playerName : "Mario",
            playerScore : 1000,
            coins : 200,
            x : 200,
            y : 100,
            isAlive : true,
            isPoweredUp : false
        };

        var buffer = Codec.encode(update,Codec.updateSchema);

        socket.emit("update",buffer);
    });
});