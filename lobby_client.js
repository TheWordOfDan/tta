var socket = io.connect('http://127.0.0.1:3000');
var game_socket;
var connected = false;
var lobby;
var currentUser;
var currentGame;

//--------debug_code_mode--------
var debug_game_code_mode = true;
if (debug_game_code_mode) {
  socket.emit('debug_game_code');
  var $login_screen_bg = $('#login_screen_bg');
  $login_screen_bg.remove();
}

socket.on('debug_setCurrentUser', function(data){

  currentUser = JSON.parse(data); 

});

//------------------------------

/* */if (!debug_game_code_mode){/* */

var $connectButton = $('#connectButton');
var $usernameIn = $('#usernameIn');
$usernameIn.keyup(function(event){
  if (event.keyCode == '13'){
//    login();
  }
});
$usernameIn.focus();

$connectButton.click(function(){
  login();
});

function login(){
  var username = $('#usernameIn').attr('value');
  socket.emit('login_attempt', {text:username});
}

//----------SOCKETS----------
//----------'login_success'----------
socket.on('login_success', function(){

  connected = true;

  $('#login_screen_bg').remove();

  var chat_text = $('<input type = "text" id = "chat_text" />');
  chat_text.keyup(function(event){
    if (event.keyCode == '13'){
      var data = {text:chat_text.attr('value'),
                  username:currentUser.username
                  };
      chat_text.val('');
      chat_text.focus();
      socket.emit('chat_text', data);
    }
  });
  chat_text.appendTo('#text');
  chat_text.focus();

  var create_game = $('<button>Start game</button>');
  create_game.click(function(){
    createGame();
  });
  create_game.appendTo('#top_bar');
  
});

//----------'update_user'----------
socket.on('update_user', function(data){
  currentUser = JSON.parse(data);      
  var msg = '*** ' + currentUser.username + ' has connected ***';
  var msg_data = {text:msg, username:'system'};
  socket.emit('chat_text', msg_data);
});

//----------'update_lobby'----------
socket.on('update_lobby', function(data){
  if (connected){

    lobby = JSON.parse(data);
 
    if (currentGame){
      for (var i = 0; i < lobby.connectedGames.length; i++){
        if (lobby.connectedGames[i].game_name == currentGame.game_name){
          currentGame = lobby.connectedGames[i];
        }
      }
    }

    updateLobbyView();

  }
});

//----------'update_chat'-----------
socket.on('update_chat', function(data){

  var appendThis = $('<p></p>');

  if (data.username == 'system'){
    appendThis.text(data.text);
    appendThis.addClass('system_message');
  } else {
    appendThis.text(data.username + ' - ' + data.text);
  }

  appendThis.appendTo('#chat');
  var $chat = $('#chat');
  $chat[0].scrollTop = $chat[0].scrollHeight;
});

//----------'game_created'----------
socket.on('game_created', function(data){

  currentGame = JSON.parse(data);
  viewGame(currentGame);

});

//----------MISC----------
//----------updateLobbyView----------
function updateLobbyView(){

  var prevUserCards = $(document.getElementById('user_list'));
  prevUserCards.children().detach();
  
  for (var i = 0; i < lobby.connectedUsers.length; i++){

    var newUserCard = $('<div class = "userCard"></div>');
    newUserCard.text(lobby.connectedUsers[i].username);
    if (currentUser.username == lobby.connectedUsers[i].username){
      newUserCard.addClass('current_user');
    }
    newUserCard.appendTo('#user_list');

  }

  var prevGameCards = $(document.getElementById('game_list'));
  prevGameCards.children().detach();

  for (var i = 0; i < lobby.connectedGames.length; i++){

    var newGameCard = $('<div class = "gameCard"></div>');  
    newGameCard.click(function(){
      var clicked_game_name = $(this).text();
      viewGame(clicked_game_name);
    });
    newGameCard.text(lobby.connectedGames[i].game_name);
    newGameCard.appendTo('#game_list');

  }

  var $inGame = $('.overlay_bg');
  if ($inGame[0]){
    var game = $('#game_name').text();
    var showThisGame;
    for (var i = 0; i < lobby.connectedGames.length; i++){
      if (lobby.connectedGames[i].game_name == game){
        showThisGame = lobby.connectedGames[i];
      }
    }

    $inGame.remove();
    if (showThisGame){
      viewGame(showThisGame);  
    }
  }

}

//----------createGame()-----------
function createGame(){

  var game_settings = new Array();
  var HOST = 0;
  var GAME_NAME = 1;

  var $overlay_bg = $('<div class = "overlay_bg"></div>');
  $overlay_bg.appendTo('#body');      

  var $container = $('<div class = "container"></div>');
  $container.addClass('game_settings_container');
  $container.appendTo($overlay_bg);

  var $label1 = $('<label></label>');
  $label1.text('Enter a game name:');

  var $text1 = $('<input type = "text" />');
  $text1.attr('value', currentUser.username + "'s Game");

  var $button_done = $('<button>Done!</button>');
  $button_done.click(function(){
    game_settings[HOST] = currentUser;
    game_settings[GAME_NAME] = $text1.attr('value');
    var json_game_data = JSON.stringify(game_settings);
    socket.emit('create_game', json_game_data);
    $overlay_bg.remove();
  });

  var $button_cancel = $('<button>Cancel</button>');
  $button_cancel.click(function(){
    $overlay_bg.remove();
  });

  $label1.appendTo($container);
  $text1.appendTo($container);
  $button_done.appendTo($container);
  $button_cancel.appendTo($container);
  
  $text1.focus();

}

//-----------viewGame----------
function viewGame(clicked_game){

  if (typeof clicked_game === 'string'){
    for (var i = 0; i < lobby.connectedGames.length; i++){
      if (lobby.connectedGames[i].game_name == clicked_game){
        clicked_game = null;
        clicked_game = lobby.connectedGames[i];
      }
    }
  }

  var $overlay_bg = $('<div class = "overlay_bg"></div>');
  $overlay_bg.appendTo('#body');

  var $container = $('<div class = "container"></div>');
  $container.addClass('game_settings_container');
  $container.appendTo($overlay_bg);

  var $title = $('<p id = "game_name"></p>');
  $title.text(clicked_game.game_name);
  $title.appendTo($container);

  // TODO: chat
  
  var $div1 = $('<div></div>');
  var $label1 = $('<label></label>');
  connectedPlayers = clicked_game.connectedUsers.length;  
  $label1.text('Connected players - ' + connectedPlayers);
  $label1.appendTo($div1);
  for (var i = 0; i < clicked_game.connectedUsers.length; i++){

    var $div1_subdiv1 = $('<div></div>')
    $div1_subdiv1.text(clicked_game.connectedUsers[i].username);
    if (clicked_game.readyList.indexOf(clicked_game.connectedUsers[i].username) != -1){
      $div1_subdiv1.addClass('ready');
    }
    if (clicked_game.host == clicked_game.connectedUsers[i].username){
      var temp = $div1_subdiv1.text();
      temp = temp + ' (host)';
      $div1_subdiv1.text(temp);
    }
    $div1_subdiv1.appendTo($div1);
  }

  $div1.appendTo($container);

  if (clicked_game == currentGame){

    var $div2 = $('<div></div>');
    var $label2 = $('<label>Ready</label>');
    var $checkbox2 = $('<input type = "checkbox" />');
    if (clicked_game.readyList.indexOf(currentUser.username) != -1){
      $checkbox2.prop('checked', true);
    }
    $checkbox2.change(function(){
      if ($checkbox2.prop('checked')){
        
        var gameIndex = lobby.connectedGames.indexOf(clicked_game);
        lobby.connectedGames[gameIndex].readyList.push(currentUser.username);
        var json_lobby = JSON.stringify(lobby);
        socket.emit('lobby_update_request', json_lobby);

      } else {
        
        var gameIndex = lobby.connectedGames.indexOf(clicked_game);
        var readyUserIndex = clicked_game.readyList.indexOf(currentUser.username);
        lobby.connectedGames[gameIndex].readyList.splice(readyUserIndex, 1);
        var json_lobby = JSON.stringify(lobby);
        socket.emit('lobby_update_request', json_lobby);

      }

    });

    $label2.appendTo($div2);
    $checkbox2.appendTo($div2);
    $div2.appendTo($container);

  }

  if (clicked_game != currentGame){

    var $join_button = $('<button>Join</button>');
    $join_button.click(function(){

      // TODO reject if
      //  - game full
      //  - game private? Separate array for private games?

      clicked_game.connectedUsers.push(currentUser);
      currentGame = clicked_game;
      for (var i = 0; i < lobby.connectedGames.length; i++){
        if (lobby.connectedGames[i].game_name == currentGame.game_name){
          lobby.connectedGames[i] = currentGame;
          break;
        }
      }
      var json_lobby = JSON.stringify(lobby);
      socket.emit('lobby_update_request', json_lobby);
    });
    $join_button.appendTo($container);

  }

  var $close_button = $('<button>Close</button>');
  if (clicked_game == currentGame){
    $close_button.text('Disconnect');
  } else {
    $close_button.text('No, thanks');
  }
  $close_button.click(function(){
    if (clicked_game == currentGame){

      currentGame = null;
      var who;
      for (var i = 0; i < clicked_game.connectedUsers.length; i++){
        if (clicked_game.connectedUsers[i].username == currentUser.username){
          who = clicked_game.connectedUsers.splice(i, 1);
          break;
        }
      }
      
      if (clicked_game.connectedUsers.length == 0){
        var gameIndex = lobby.connectedGames.indexOf(clicked_game);
        lobby.connectedGames.splice(gameIndex, 1);
      } else {
        if (clicked_game.host == who[0].username){
          clicked_game.host = clicked_game.connectedUsers[0].username;  
        }
      }

      var json_lobby = JSON.stringify(lobby);
      socket.emit('lobby_update_request', json_lobby);

    } else if (currentGame != clicked_game){
      $overlay_bg.remove();       
    }
    
  });
  if (clicked_game.readyList.indexOf(currentUser.username) != -1){
    $close_button.prop('disabled', 'disabled');
  }
  $close_button.appendTo($container);

  if (clicked_game.readyList.length == clicked_game.connectedUsers.length){
    if (clicked_game.host == currentUser.username){
      var $start = $('<button>Start Game!</button>');
      $start.click(function(){

          //TODO reject if only one player

          var json_game = JSON.stringify(clicked_game);
          socket.emit('final_game_settings', json_game);

      });
      $start.appendTo($container);
    }
  }

}

/* */} /* */ //debug game code
