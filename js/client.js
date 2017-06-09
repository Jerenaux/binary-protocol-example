/**
 * Created by Jerome on 07-06-17.
 */

console.log('Hello world');
var socket = io.connect();

socket.emit("ready");

socket.on("update",function(data){
    var message = Codec.decode(data,Codec.updateSchema);
    console.log(message);
});