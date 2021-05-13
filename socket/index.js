var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http,{cors:{
	origin:"http://127.0.0.1:8000"
}});

var mysql = require('mysql');
var moment = require('moment');
var sockets = {};
var con = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'chat'
});

con.connect(function(err){
	if(err)
		throw err;
		console.log("Database connected");
});

io.on('connection',function(socket){
	if(!sockets[socket.handshake.query.user_id]){
		sockets[socket.handshake.query.user_id] = [];
	}
	sockets[socket.handshake.query.user_id].push(socket);
	socket.broadcast.emit('user_connected', socket.handshake.query.user_id);

	con.query(`UPDATE users SET is_online=1 WHERE id=${socket.handshake.query.user_id}`,function(err,res){
	if(err)
		throw err;
	console.log("User Connected",socket.handshake.query.user_id);
	});

	socket.on('send_message',function(data){
		var group_id = (data.user_id>data.other_user_id)?data.user_id+data.other_user_id:data.other_user_id+data.user_id;
		var time = moment().format("h:mm A");
		data.time = time;
		for(var index in sockets[data.user_id]){
			sockets[data.user_id][index].emit('receive_message',data);
		}
		for(var index in sockets[data.other_user_id]){
			sockets[data.other_user_id][index].emit('receive_message',data);
		}
		con.query(`INSERT INTO chats (user_id,other_user_id,message,group_id) values (${data.user_id},${data.other_user_id},'${data.message}', ${group_id})`,function(err,res){
			if(err)
				throw err;
			console.log("Message Sent"); 
		})
	})

	socket.on('disconnect',function(err){
		socket.broadcast.emit('user_disconnected,socket.handshake.query.user_id');
		for(var index in sockets[socket.handshake.query.user_id]){
			if(socket.id == sockets[socket.handshake.query.user_id][index].id){
				sockets[socket.handshake.query.user_id].splice(index,1);
			}
		}
		con.query(`UPDATE users SET is_online=0 WHERE id=${socket.handshake.query.user_id}`,function(err,res){
		if(err)
			throw err;
		console.log("User Disconnected",socket.handshake.query.user_id);
		});
	})
})

http.listen(3000);