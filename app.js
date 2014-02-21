var http = require('http');
var fs = require('fs');
var path = require('path');

var Lobby = require('./Lobby');
var User = require('./User');
var Game = require('./Game');

var Tta = require('./Tta/Tta');

var lobby = new Lobby();
var connectedClients = {}; 
var connectedGames = {};

// ---------------SERVER--------------------------

var server = http.createServer(function(request, response){

  var filename = request.url;

  if (filename == '/' || filename == '/index.html'){
    fs.readFile('./index.html', function(error, data){
      response.writeHead(200, {'Content-Type': 'text/html'});
      response.write(data);
      response.end();
    });
  }

  if (filename == '/style.css'){
    fs.readFile('./style.css', function(error, data){
      response.writeHead(200, {'Content-Type': 'text/css'});
      response.write(data);
      response.end();
    });
  }

  if (filename == '/lobby_client.js'){
    fs.readFile('./lobby_client.js', function(error, data){
      response.writeHead(200, {'Content-Type': 'text/javascript'});
      response.write(data);
      response.end();
    });
  }

  if (filename == '/tta_client.js'){
    fs.readFile('./tta_client.js', function(error, data){
      response.writeHead(200, {'Content-Type': 'text/javascript'});
      response.write(data);
      response.end();
    });
  }

  if (filename == '/tta_style.css'){
    fs.readFile('./tta_style.css', function(error, data){
      response.writeHead(200, {'Content-Type': 'text/css'});
      response.write(data);
      response.end();
    });
  }

}).listen(3000, '127.0.0.1');
console.log('Server running at http://127.0.0.1:3000');

// ---------------SOCKETS------------------------
var io = require('socket.io').listen(server);
var sockets = io.sockets;

io.sockets.on('connection', function(socket){

  socket.on('login_attempt', function(data){

    //TODO check credentials 

    //TODO disallow duplicate usernames
    
    connectedClients[socket.id] = socket;

    var user = new User(data.text, socket.id);
    lobby.connectedUsers.push(user);
    socket.join('lobby');
    var json_user = JSON.stringify(user);
    var json_lobby = JSON.stringify(lobby);
    socket.emit('login_success');
    socket.emit('update_user', json_user);
    socket.emit('update_lobby', json_lobby);
    socket.broadcast.to('lobby').emit('update_lobby', json_lobby);
  
  });

  socket.on('chat_text', function(data){

    socket.emit('update_chat', data);
    socket.broadcast.to('lobby').emit('update_chat', data);

  });

  socket.on('create_game', function(data){

   // TODO check for duplicate game names
   
    var game_data = JSON.parse(data);

    var new_game = new Game();
    new_game.host = game_data[0].username;
    new_game.connectedUsers.push(game_data[0]);
    new_game.game_name = game_data[1];

    var json_new_game = JSON.stringify(new_game);
    socket.emit('game_created', json_new_game);

    lobby.connectedGames.push(new_game);
    var json_lobby = JSON.stringify(lobby);
    socket.emit('update_lobby', json_lobby);
    socket.broadcast.to('lobby').emit('update_lobby', json_lobby);
    
    var msg = '*** ' + game_data[0].username 
                    + ' has created the game "'
                    + game_data[1] + '" ***';
    var json_msg_data = {text:msg, username:'system'};
    socket.emit('update_chat', json_msg_data);
    socket.broadcast.to('lobby').emit('update_chat', json_msg_data);
  });

  socket.on('lobby_update_request', function(data){
    lobby = JSON.parse(data);

    socket.emit('update_lobby', data);
    socket.broadcast.to('lobby').emit('update_lobby', data);
  }); 

  socket.on('final_game_settings', function(data){

    var new_game = JSON.parse(data);

    if (connectedGames[new_game.game_name]){
      //return failure
    } else {

      for (var i = 0; i < lobby.connectedGames.length; i++){
        if (lobby.connectedGames[i].game_name == new_game.game_name){
          lobby.connectedGames.splice(i, 1);
          break;
        }
      }

      var lobby_usernames = new Array();
      for (var i = 0; i < lobby.connectedUsers.length; i++){
        lobby_usernames.push(lobby.connectedUsers[i].username);
      }

      for (var i = 0; i < new_game.connectedUsers.length; i++){
        var targetIndex;
        var targetName = new_game.connectedUsers[i].username;
        targetIndex = lobby_usernames.indexOf(targetName);
        lobby_usernames.splice(targetIndex, 1);
        lobby.connectedUsers.splice(targetIndex, 1);
      }

      var json_lobby = JSON.stringify(lobby);
      socket.emit('update_lobby', json_lobby);
      socket.broadcast.to('lobby').emit('update_lobby', json_lobby);
      
      var tta = new Tta()
      tta.gameName = new_game.game_name;
      tta.connectedPlayers = new_game.connectedUsers;
      connectedGames[tta.gameName] = tta;

      for (var i = 0; i < tta.connectedPlayers.length; i++){
        var targetSocket = tta.connectedPlayers[i].socketId;
        connectedClients[targetSocket].join(tta.gameName);
        connectedClients[targetSocket].leave('lobby');
        tta.connectedSockets[targetSocket] = connectedClients[targetSocket];
      }
      
      //tta.initTta();
      connectedGames[tta.gameName].initTta();
    }

  });

  //---------DEBUG_MODE----------
  /*
     Create and send a dummy game to the client to test the game code
  */
  socket.on('debug_game_code', function(){
  
    console.log('Debugging game code!');  

    connectedClients[socket.id] = socket;

    var numConnectedClients = 0;
    for (i in connectedClients){
      numConnectedClients++;
    }
  
    if (numConnectedClients == 4){
      
      var tta = new Tta();
      tta.gameName = 'Four player test case';

      for (var i = 0; i < numConnectedClients; i++){
        var new_user = new User();
        tta.connectedPlayers.push(new_user); 
      }

      tta.connectedPlayers[0].username = 'Anton';
      tta.connectedPlayers[1].username = 'Bruno';
      tta.connectedPlayers[2].username = 'Caesar';
      tta.connectedPlayers[3].username = 'Dora';

      var temp = 0;
      for (i in connectedClients){
        tta.connectedPlayers[temp].socketId = i;
        temp++;
      }

      for (var i = 0; i < tta.connectedPlayers.length; i++){
        var targetSocket = tta.connectedPlayers[i].socketId;
        var json_player = JSON.stringify(tta.connectedPlayers[i]);
        connectedClients[targetSocket].emit('debug_setCurrentUser', json_player);
      }

      connectedGames[tta.gameName] = tta;
      
      for (var i = 0; i < tta.connectedPlayers.length; i++){
        var targetSocket = tta.connectedPlayers[i].socketId;
        connectedClients[targetSocket].join(tta.gameName);
        tta.connectedSockets[targetSocket] = connectedClients[targetSocket];
      }

      //tta.initTta();
      connectedGames[tta.gameName].initTta();
          
    }  

  });
  //----------END DEBUG MODE----------

  socket.on('disconnect', function(){

    // TODO crashes when duplicate name attempts to disconnect

    delete connectedClients[socket.id];

    var leavingLobby;
    for (var i = 0; i < lobby.connectedUsers.length; i++){
      if (lobby.connectedUsers[i].socketId == socket.id){
        leavingLobby = lobby.connectedUsers.splice(i, 1)[0];
        break;
      }
    }

    if (leavingLobby){
      var json_lobby = JSON.stringify(lobby);
      socket.broadcast.to('lobby').emit('update_lobby', json_lobby);

      //TODO deal with ctrl-w quit or unexpected disconnect
        // don't forget to search the readyList

      var sys_msg = '*** ' + leavingLobby.username 
                           + ' has disconnected ***';
      json_sys_msg = {text:sys_msg, username:'system'};
      socket.broadcast.to('lobby').emit('update_chat', json_sys_msg);  
    }

  });

});

