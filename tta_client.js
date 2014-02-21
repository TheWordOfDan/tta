/*
 
tta_client.js 
by Dan
 
*/

/*

NOTES:
  - socket from lobby_client.js
  - currentUser from lobby_client.js

*/

/*

TODO
  - user chat

*/


var tta; 

socket.on('init_tta', function(){
  tta = new Tta_client(currentUser, socket);
});

// class Tta_client
function Tta_client(currentUserIn, socketIn){
  this._socket = socketIn;
  this._UserInterface = new UserInterface(currentUserIn, socketIn);
  this._initSocket();
}

Tta_client.prototype._initSocket = function(){
  var _this = this;

  this._socket.on('game_state_update', function(gameState){
    _this._updateGameState(gameState);
  });

  this._socket.on('turn_cycle', function(gameState, numTurnCycles){
    if (numTurnCycles != 0){
      var fadeArray = _this._UserInterface.cycleCardRow();    
      /*
      fadeOut executes the callback function for every single element
      in the array!!
      */
      var alreadyDrawn = false;
      $(fadeArray).fadeOut('1000', function(){
        if (!alreadyDrawn){
          _this._updateGameState(gameState);
          alreadyDrawn = true;
        }
      });
    } else {
      _this._updateGameState(gameState);
    }
  });

  this._socket.on('military_hand_update', function(militaryHand){
    _this._UserInterface.militaryHand = JSON.parse(militaryHand);  
  });

  this._socket.on('political_phase', function(flag){
    _this._UserInterface.politicalPhase(flag); 
  });

  this._socket.on('group_political', function(card){
    _this._UserInterface.groupPolitical(card);
  });

  /*
  this._socket.on('check_in', function(playerName){
    _this._UserInterface.checkIn(playerName);
  });
  */

  this._socket.on('minigame_state_update',
    function(json_gameState){
      var gameState = JSON.parse(json_gameState);
      _this._UserInterface.miniGameStateUpdate(gameState);
    }
  );

  this._socket.on('chat_update', function(msgData, flag){
    _this._updateChat(msgData, flag); 
  });
  
}

Tta_client.prototype._updateGameState = function(gameState){
  this._UserInterface.gameState = JSON.parse(gameState);
  var $gameStatePane = this._UserInterface.buildGameStatePane();
  $('#gameStatePane').replaceWith($gameStatePane);
}

Tta_client.prototype._updateChat = function(msgData, flag){
  var msgSource = msgData.source;
  var msgText = msgData.text;
  var $newChatText = $('<p></p>');
  $newChatText.addClass(flag);
  if (msgSource == 'system'){
    $newChatText.addClass('system_message');
    var username = msgText.substr(0, msgText.indexOf(' '));
    var $username = $('<span></span>');
    $username.addClass('system_message_username');
    $username.text(username);
    msgText = msgText.replace(username, '');
    $newChatText.text(msgText);
    $username.prependTo($newChatText);
    $newChatText.appendTo('#chatPane');
  } else {
    //TODO user chat
  }
  var foo = $('#chatPane')[0];
  foo.scrollTop = foo.scrollHeight;
}

// class UserInterface
function UserInterface(currentUserIn, socketIn){

  this.gameState = new Object();
  this.militaryHand = new Array();
  this.viewingPoliticalPane = false;
  this.viewingGroupPane = false;

  this._tta_currentUser = currentUserIn;
  this._socket = socketIn;
  this._initGUI();

}

UserInterface.prototype._initGUI = function(){
  $('#lobby').detach();
  $('<div id = "gameBoard"></div>').appendTo('#body');
  $('<div id = "gameStatePane"></div>').appendTo('#gameBoard');
  //$('<div id = "playerPane"></div>').appendTo('#gameBoard');
  $('<div id = "chatPane"></div>').appendTo('#gameBoard');
}

UserInterface.prototype.cycleCardRow = function(){
  var gameState = this.gameState;
  var numPlayers = 0;
  for (players in gameState.Player){
    numPlayers++;
  }
  var numCycledCards = 5 - numPlayers;
  var cardRowChildren = $('#card_row').children();
  for (var i = 0; i < numCycledCards; i++){
    $(cardRowChildren[i]).addClass('toFade'); 
  }
  for (var i = 0; i < gameState.cardRow.length; i++){
    if ($(cardRowChildren[i]).hasClass('drafted_card')){
      $(cardRowChildren[i]).addClass('toFade');
    }
  }
  var toFade = [];
  for (var i = 0; i < gameState.cardRow.length; i++){
    if ($(cardRowChildren[i]).hasClass('toFade')){
      toFade.push(cardRowChildren[i]);
    }
  }
  return toFade;
}

UserInterface.prototype.buildGameStatePane = function(){

  var clientName = this._tta_currentUser.username;
  var gameState = this.gameState;
  var _this = this;

  var hasTheTurn = false;
  if (gameState.currentPlayer == clientName){
    hasTheTurn = true;
  }

  var $gameStatePane = $('<div id = "gameStatePane"></div>');

  // Draw card row
  var $cardRow = $('<div id = "card_row"></div>');
  for (var i = 0; i < gameState.cardRow.length; i++){
    var $cardView = $('<div class = "card"></div>');
    $cardView.text(gameState.cardRow[i].name);
    if (gameState.cardRow[i].type == 'yellow'){
      var $age = $('<div></div>');
      $age.text('(' + gameState.cardRow[i].age + ')');
      $age.appendTo($cardView);
    }
    $cardView.data('rowIndex', i);
    $cardView.addClass(gameState.cardRow[i].type);
    if (gameState.cardRow[i].type == 'tech'){
      $cardView.addClass(gameState.cardRow[i].subtype);
    }
    $cardView.mouseover(function(){
      $(this).addClass('stand_out');
      var $_this = $(this);
      $(this).mouseleave(function(){
        $_this.removeClass('stand_out');
      });
    }); 
    if (gameState.cardRow[i].drafted == true){
      $cardView.addClass('drafted_card');
      $cardView.droppable({
        accept:'.card',
        drop:function(){
          if($('.from_hand')[0]){
            var handIndex = $($('.from_hand')[0]).data('handIndex');
            $('.from_hand').remove();
            _this._socket.emit('undraft_card', handIndex); 
          }
        }
      });
    }
    $cardView.dblclick(function(){
      if (hasTheTurn){
        if (!$(this).hasClass('drafted_card')){
          _this._socket.emit('draft_card', $(this).data('rowIndex'));
        } 
      }
    });
    $cardView.appendTo($cardRow);
  }
  var $action_cost_div1 = $('<div id = "action_cost_div1"></div>');
  $action_cost_div1.addClass('action_cost_div');
  var $container1 = $('<div id = "cost_container1"></div>');
  $container1.addClass('action_cost_container');
  $container1.appendTo($action_cost_div1);
  $action_cost_div1.appendTo($cardRow);

  var $action_cost_div2 = $('<div id = "action_cost_div2"></div>');
  $action_cost_div2.addClass('action_cost_div');
  var $container2 = $('<div id = "cost_container2"></div>');
  $container2.addClass('action_cost_container');
  $container2.appendTo($action_cost_div2);
  $action_cost_div2.appendTo($cardRow);

  var $action_cost_div3 = $('<div id = "action_cost_div3"></div>');
  $action_cost_div3.addClass('action_cost_div');
  var $container3 = $('<div id = "cost_container3"></div>');
  $container3.addClass('action_cost_container');
  $container3.appendTo($action_cost_div3);
  $action_cost_div3.appendTo($cardRow);

  for (var i = 0; i < 6; i++){
    var $token = $('<div class = "card_row_token"></div>');
    if (i == 0 || i == 1 || i == 3){
      $token.addClass('anchor');
    }
    if (i == 0){
      $token.appendTo($container1);
    }
    if (i > 0 && i < 3){
      $token.appendTo($container2);
    }
    if (i > 2 && i < 6){
      $token.appendTo($container3);
    }
  }

  $cardRow.appendTo($gameStatePane);

  // Draw client pane
  var $client_pane = $('<div id = "client_pane"></div>');
  var $client = $('<div class = "client"></div>');
  $client.text(clientName);
  $client.appendTo($client_pane);
  var $currentPlayer = $('<div class = "current_player"></div>');
  var currentPlayerText = '(Current player: ' 
                          + gameState.currentPlayer + ')';
  $currentPlayer.text(currentPlayerText);
  $currentPlayer.appendTo($client_pane);
  if (hasTheTurn){
    var $passTurn = $('<button>Pass turn!</button>');
    $passTurn.click(function(){
      _this._socket.emit('pass_turn');        
    });
    $passTurn.appendTo($client_pane);
  }
  $client_pane.appendTo($gameStatePane);

  // Draw stats pane
  var $stats = $('<div id = "stats"></div>');
  var $current_age = $('<div></div>');
  $current_age.text('Current age: ' + gameState.currentAge);
  $current_age.appendTo($stats);
  var $food_label = $('<div></div>');
  $food_label.text('Food: ' + gameState.Player[clientName].food);
  $food_label.appendTo($stats);
  var $ore_label = $('<div></div>');
  $ore_label.text('Resources: ' + gameState.Player[clientName].ore);
  if (gameState.Player[clientName].tempMilitaryOre != 0){ 
    var $temp_mil_ore = $('<span></span>');
    $temp_mil_ore.text('(+'+ gameState.Player[clientName].tempMilitaryOre 
                      +' military only)');
    $temp_mil_ore.appendTo($ore_label);
  }
  $ore_label.appendTo($stats);
  var $culture = $('<div></div>');
  $culture.text('Culture: ' 
                + gameState.Player[clientName].culture + ' (' 
                + gameState.Player[clientName].culturePerTurn  
                + '/turn)');
  $culture.appendTo($stats);
  var $science = $('<div></div>');
  $science.text('Science: '
                + gameState.Player[clientName].science + ' ('
                + gameState.Player[clientName].sciencePerTurn
                + '/turn)');
  $science.appendTo($stats);
  $strength = $('<div></div>');
  $strength.text('Strength: ' 
                 + gameState.Player[clientName].militaryStrength);
  $strength.appendTo($stats);
  $stats.appendTo($gameStatePane);

  // Leader
  var $leader_pane = $('<div id = "leader_tile"><div>');
  if (gameState.Player[clientName].leader != null){
    $leader_pane.text(gameState.Player[clientName].leader.name);
  }
  $leader_pane.appendTo($gameStatePane);

  // Completed turn cycles label
  var $completedTurnCycles = $('<div></div>');
  $completedTurnCycles.text('Completed turn cycles: '
                            + gameState.completedTurnCycles);  
  $completedTurnCycles.appendTo($gameStatePane);                          

  // Draw pop techs
  var $tech = $('<div></div>');
  for (tech in gameState.Player[clientName].tech){
    var $techCard = $('<div class = "tech_card"></div>');
    var techName = tech;
    var techType = gameState.Player[clientName].tech[techName].type;
    $techCard.addClass(techType);
    var $techNameLabel = $('<div></div>');
    $techNameLabel.text(techName);
    $techNameLabel.appendTo($techCard);
    $techCard.addClass(tech);
    if (gameState.Player[clientName].tech[techName].type == 'military'){
      $techCard.addClass('military');
    }
    var numPop = gameState.Player[clientName]
                          .tech[techName]
                          .assignedPop;
    if (numPop != 0){
      var $pop = $('<div></div>');
      $pop.appendTo($techCard);
      for (var i = 0; i < numPop; i++){
        var $token = $('<div class = "pop_token"></div>');
        $token.data('destroy_reference', techName);
        if ($techCard.hasClass('military')){
          $token.data('military', true);
        }
        $token.appendTo($pop);
        if (hasTheTurn) {
          $token.draggable({
            revert:true, 
            start:function(){
              $(this).addClass('being_dragged');
              $(this).addClass('destroy');
            }, 
            stop:function(){
              $(this).removeClass('destroy');
              $(this).removeClass(techName);
            }
          });
        }
      }
    }
    var numBlues = gameState.Player[clientName]
                            .tech[techName]
                            .assignedBlues;
    if (numBlues != 0){
      var $blues = $('<div></div>');
      $blues.appendTo($techCard);
      for (var i = 0; i < numBlues; i++){
        var $token = $('<div class = "blue_token"></div>');
        $token.appendTo($blues); 
      }
    }
    $techCard.appendTo($tech);
    $techCard.droppable({
      accept: '.pop_token',
      drop: function(){
        if ($('.from_worker_pool')[0]){
          $('.being_dragged').remove(); // fix for error message
          if ($(this).hasClass('military')){
            _this._socket.emit('build', $(this).text(), 0, 0, 'military');
          } else {
            _this._socket.emit('build', $(this).text(), 0, 0);
          }
        }
        if ($('.destroy')[0]){
          var upgradeThis = $('.destroy')[0].data('destroy_reference');
          var toThis = $(this).text();
          $('.destroy').remove();
          _this._socket.emit('upgrade', upgradeThis, toThis);
        }
      }
    });
  }
  $tech.appendTo($gameStatePane);

  // Draw pop bank
  var popBank = gameState.Player[clientName].popBank;
  var $pop_bank = $('<div id = "pop_bank"></div>');
  for (var i = 0; i < 5; i++){
    var $pop_bank_2x2 = $('<div class = "pop_bank_2x2"></div>');
    for (var j = 0; j < 4; j++){
      var $pop_bank_slot = $('<div class = "pop_bank_slot"></div>');
      var newClass = 'slot' + (j+1);
      $pop_bank_slot.addClass(newClass);
      if (popBank > 0){
        $pop_bank_slot.addClass('pop_token');
        popBank--
      }
      $pop_bank_slot.appendTo($pop_bank_2x2);
    }
    $pop_bank_2x2.appendTo($pop_bank);
  }
  $pop_bank.dblclick(function(){
    if (hasTheTurn){
      _this._socket.emit('increase_pop');  
    }
  });
  $pop_bank.appendTo($gameStatePane);

  // Draw worker pool
  var $worker_pool = $('<div id = "worker_pool"></div>');
  $worker_pool.text('Worker pool: ');
  var netHappiness = gameState.Player[clientName].happyFaces -
                          gameState.Player[clientName].unhappyFaces;
  for (var i = 0; i < gameState.Player[clientName].workerPool; i++){
    var $token = $('<div class = "pop_token"></div>');
    if (netHappiness < 0){
      $token.addClass('unhappy');
      netHappiness++;
    }
    $token.appendTo($worker_pool);
    if (hasTheTurn) {
      $token.draggable({revert: true, start:function(){
        $(this).addClass('being_dragged');
        $(this).addClass('from_worker_pool');
      }, stop: function(){
        $(this).removeClass('being_dragged');
        $(this).removeClass('from_worker_pool');
      }});
    }
  }
  $worker_pool.appendTo($gameStatePane);
  $worker_pool.droppable({
    accept:'.pop_token',
    drop: function(){
      if (!$('.from_worker_pool')[0]){
        var destroyWhat = $('.destroy').data('destroy_reference');
        if ($('.destroy').data('military')){
          _this._socket.emit('destroy', destroyWhat, 'military');
        } else {
          $('.destroy').remove();
          _this._socket.emit('destroy', destroyWhat);
        }
      }
    }
  });

  // Draw blue bank
  var blueBank = gameState.Player[clientName].blueBank; 
  var $blue_bank = $('<div id = "blue_bank"></div>');
  for (var i = 0; i < 5; i++){
  var $blue_bank_2x2 = $('<div class = "pop_bank_2x2"></div>');
    if (i == 2) $blue_bank_2x2.addClass('firstDiv');
    if (i == 3) $blue_bank_2x2.addClass('secondDiv');
    if (i == 4) $blue_bank_2x2.addClass('thirdDiv');
    for (var j = 0; j < 4; j++){
      var $blue_bank_slot = $('<div class = "pop_bank_slot"></div>');
      var newClass = 'slot' + (j + 1);
      $blue_bank_slot.addClass(newClass);
      if (blueBank > 0){
        $blue_bank_slot.addClass('blue_token');
        blueBank--
      }
      $blue_bank_slot.appendTo($blue_bank_2x2);
    }
  $blue_bank_2x2.appendTo($blue_bank);
  }
  $blue_bank.appendTo($gameStatePane);

  // Draw government
  var $govt = $('<div id = "govt_card"></div>');
  $govt.text(gameState.Player[clientName].govTech.name);
  $govt.appendTo($gameStatePane);
  
  // Draw actions
  var $actions = $('<div></div>');
  var $white_actions = $('<div></div>');
  var totalCivilActions = gameState.Player[clientName].totalCivilActions;
  var spentCivilActions = gameState.Player[clientName].spentCivilActions;
  for (var i = 0; i < totalCivilActions; i++){
    var $token = $('<div class = "white_token"></div>');
    if (spentCivilActions > 0){
      $token.addClass('used_white_token');
      spentCivilActions--;
    }
    $token.prependTo($white_actions);
  } 
  $white_actions.appendTo($actions);

  var $red_actions = $('<div></div>');
  var tempActions = gameState.Player[clientName].tempMilitaryActions;
  var milActions = gameState.Player[clientName].totalMilitaryActions 
                 + gameState.Player[clientName].tempMilitaryActions;
  var spentMilActions = gameState.Player[clientName].spentMilitaryActions;
  var closeParenthFlag = false;
  for (var i = 0; i < milActions; i++){
    var $token = $('<div class = "red_token"></div>');
    if (spentMilActions > 0){
      $token.addClass('used_red_action');
      spentMilActions--;
    }
    if (tempActions != 0){
      if (!closeParenthFlag){
        var $close_parenth = $('<span>)</span>');
        $close_parenth.prependTo($red_actions); 
        closeParenthFlag = true;
      }
      $token.prependTo($red_actions);
      tempActions--;
      if (tempActions == 0){
        var $open_parenth = $('<span>(</span>');
        $open_parenth.prependTo($red_actions);
      }
    } else {
      $token.prependTo($red_actions);
    }
  }
  $red_actions.appendTo($actions);
  $actions.appendTo($gameStatePane);

  // Civil hand
  var $civil_hand = $('<div id = "civil_hand"></div>');
  for (var i = 0; i < gameState.Player[clientName].civilHand.length; i++){
    var $card = $('<div class = "card"></div>');
    $card.text(gameState.Player[clientName].civilHand[i].name);
    if (gameState.Player[clientName].civilHand[i].type == 'yellow'){
      var $age = $('<div></div>');
      $age.text('(' + gameState.Player[clientName].civilHand[i].age
              + ')');
      $age.appendTo($card);
    }
    $card.data('handIndex', i);
    $card.data('rowIndex', gameState.Player[clientName]
                                    .civilHand[i]
                                    .rowIndex);
    $card.addClass(gameState.Player[clientName].civilHand[i].type);
    if (gameState.Player[clientName].civilHand[i].type == 'tech'){
      $card.addClass(gameState.Player[clientName].civilHand[i].subtype);
    }
    if (gameState.Player[clientName].civilHand[i].draftedThisTurn == true){
      $card.addClass('drafted_this_turn');
      if (gameState.Player[clientName].civilHand[i].type == 'yellow'){
        $card.addClass('grayed_out');
      }
    }
    $card.mouseover(function(){
      if (hasTheTurn){
        if ($(this).hasClass('drafted_this_turn')){
          var rowIndex = $(this).data('rowIndex');
          var $cardRowSlot = $($('#card_row').children()[rowIndex]);
          $cardRowSlot.addClass('stand_out');
          $(this).addClass('stand_out');
          $(this).mouseleave(function(){
            $cardRowSlot.removeClass('stand_out');
            $(this).removeClass('stand_out');
          });
        }
      }
    });
    $card.dblclick(function(){
      if (hasTheTurn){
        var handIndex = $(this).data('handIndex');
        var card = gameState.Player[clientName].civilHand[handIndex];
        if (card.name == 'Ideal Building Site'||
            card.name == 'Rich Land' ||
            card.name == 'Breakthrough' ||
            card.name == 'Efficient Upgrade'){
          _this.yellowCardAdditionalInput(card, handIndex); 
        } else {
          if (card.type == 'tech'){
            _this._socket.emit('discover_tech', handIndex, 'noFlag');
          } else {
            _this._socket.emit('play_civil_card', handIndex);
          }
        }
      }
    });
    if (hasTheTurn){
      $card.draggable({revert:true, start:function(){
        $(this).addClass('from_hand');  
      }, stop:function(){
        $(this).removeClass('from_hand');
      }});  
    }
    $card.appendTo($civil_hand);
  }
  $civil_hand.appendTo($gameStatePane);
  
  // Wonders
  var $wonders = $('<div id = "wonders_list"></div>');
  for (var i = 0; i < gameState.Player[clientName].wonders.length; i++){
    var $tile = $('<div class = "wonder_tile"></div>');
    $tile.data('wonderIndex', i);
    $tile.addClass('wonder');
    var $name = $('<div></div>');
    $name.text(gameState.Player[clientName].wonders[i].name);
    $name.appendTo($tile);
    if (!gameState.Player[clientName].wonders[i].completed){
      for (var j = 0; j < gameState.Player[clientName]
                                   .wonders[i]
                                   .productionSteps
                                   .length; j++){
        if (gameState.Player[clientName]
                     .wonders[i]
                     .productionSteps[j]
                     .done){
          var $blue_token = $('<div class = "blue_token"></div>');
          $blue_token.appendTo($tile);
        } 
        else {
          var $slot = $('<div><div>');
          $slot.text(gameState.Player[clientName]
                              .wonders[i]
                              .productionSteps[j]
                              .cost);
          $slot.appendTo($tile);
        }
      }
    }
    $tile.dblclick(function(){
      if (hasTheTurn){
        _this._socket.emit('build_wonder_stage', 
                           $(this).data('wonderIndex'));
      }
    });
    $tile.appendTo($wonders);
  }
  $wonders.appendTo($gameStatePane);
  return $gameStatePane;
}

UserInterface.prototype.yellowCardAdditionalInput = function(whichCard, handIndex){
  var clientName = this._tta_currentUser.username;
  var gameState = this.gameState;
  var _this = this;
  var $overlay_bg = $('<div id = "overlay_bg"></div>');
  var $overlay_container= $('<div class = "overlay_container"></div>');
  $overlay_container.addClass('yellow');
  $overlay_container.addClass('yellow_card');
  var $cardName = $('<div></div>');
  $cardName.text(whichCard.name + ' (' + whichCard.age + ')');
  $cardName.appendTo($overlay_container);
  var $cancel_button = $('<button>Cancel</button>');
  $cancel_button.click(function(){
    $overlay_bg.remove(); 
  });
  $cancel_button.appendTo($overlay_container);

  if (whichCard.draftedThisTurn){
    $cardName.text($cardName.text() + ' - drafted this turn');
    $cardName.addClass('grayed_out');
    $cardName.addClass('drafted_this_turn');
    $overlay_container.appendTo($overlay_bg);
    $overlay_bg.appendTo('#body');
    return;
  }
  
  if (whichCard.name == 'Ideal Building Site')
    idealBuildingSite();

  if (whichCard.name == 'Rich Land'){
    idealBuildingSite('richLand');
  }

  if (whichCard.name == 'Breakthrough'){
    breakthrough();
  }

  if (whichCard.name == 'Efficient Upgrade'){
    efficientUpgrade(); 
  }

  $overlay_container.appendTo($overlay_bg);
  $overlay_bg.appendTo('#body');

  function efficientUpgrade(){
    // Upgrade what to what
  }

  function breakthrough(){
    // Available science, target technologies
    var $instructions = $('<div class = "instructions"></div>');
    $instructions.text('Choose a technology to Breakthrough:');
    $instructions.appendTo($overlay_container);

    var $science = $('<div></div>');
    $science.text('Available science: ' + gameState.Player[clientName].science);
    $science.appendTo($overlay_container);

    var $techs = $('<div></div>');
    for (var i = 0; i < gameState.Player[clientName].civilHand.length; i++){
      if (gameState.Player[clientName].civilHand[i].type == 'tech'){
        var $tech_tile = $('<div class = "tech_tile"></div>');
        var tech = gameState.Player[clientName].civilHand[i];
        $tech_tile.data('handIndex', i);
        $tech_tile.text(tech.name + ' (cost: ' + tech.scienceCost + ')');
        $tech_tile.addClass(tech.subtype);
        $tech_tile.mouseover(function(){
          $(this).addClass('stand_out');
          var $_this = $(this);
          $(this).mouseleave(function(){
            $_this.removeClass('stand_out'); 
          });
        });
        $tech_tile.dblclick(function(){
          decisionMade(whichCard.name, $(this).data('handIndex'));
        });
        $tech_tile.appendTo($techs);
      }
    }
    $techs.appendTo($overlay_container);

    $confirmation = $('<div class = "confirmation"></div>');
    $confirmation.appendTo($overlay_container);

    function decisionMade(whichTech, techHandIndex){
      var $confirmation = $('<div class = "confirmation"></div>');
      var sciCost = gameState.Player[clientName]
                             .civilHand[techHandIndex]
                             .scienceCost; 
      var sciRefund = whichCard.scienceRefund;
      $confirmation.text('Discover ' + whichTech + ' for ' + sciCost + ' science, then gain back ' + sciRefund + ' science afterwards: ');
      var $confirm_button = $('<button>Confirm</button>');
      $confirm_button.click(function(){
        var breakthroughIndex = handIndex;
        _this._socket.emit('discover_tech', 
                           techHandIndex, 
                           'breakthrough', 
                           breakthroughIndex); 
        $overlay_bg.remove();
      });
      $confirm_button.appendTo($confirmation);
      $('.confirmation').replaceWith($confirmation);
    }

  }

  // Ideal Building Site and Rich Land
  function idealBuildingSite(richLandFlag){
    if (richLandFlag == 'richLand') richLandFlag = true;

    var $civil_actions = $('<div></div>');
    var totalActions = gameState.Player[clientName].totalCivilActions;
    var spentActions = gameState.Player[clientName].spentCivilActions;
    if (totalActions - spentActions == 0){
      $civil_actions.text('Available civil actions: 0');
      $civil_actions.addClass('action_failure');
      $civil_actions.appendTo($overlay_container);
      return;
    }
    for (var i = 0; i < totalActions; i++){
      var $token = $('<div class = "white_token"></div>');
      $token.appendTo($civil_actions);
      if (i >= totalActions - spentActions){
        $token.addClass('used_white_token');
      }
    }
    $civil_actions.appendTo($overlay_container);

    var $worker_pool = $('<div></div>');
    $worker_pool.text('Available population: '); 
    if (gameState.Player[clientName].workerPool == 0){
      $worker_pool.text('Available population: 0');
      $worker_pool.addClass('action_failure');
      $worker_pool.appendTo($overlay_container);
      return;
    }
    for (var i = 0; i < gameState.Player[clientName].workerPool; i++){
      var $token = $('<div class = "pop_token"></div>');
      if (i == 0) $token.addClass('anchor');
      $token.appendTo($worker_pool);
      $token.draggable({revert:true, start:function(){
        $(this).addClass('');  
      }, stop:function(){
      
      }});
    }
    $worker_pool.appendTo($overlay_container)
  
    var $available_ore = $('<div></div>');
    $available_ore.text('Available resources: ' 
                      + gameState.Player[clientName].ore);
    $available_ore.appendTo($overlay_container);

    var $ore_discount = $('<div></div>');
    $ore_discount.text('Resource discount: ' 
                     + whichCard.oreDiscount)
    $ore_discount.appendTo($overlay_container);

    var $instructions = $('<div class = "instructions"></div>');
    $instructions.text('Drag available yellow token to target.');
    $instructions.appendTo($overlay_container);

    var $candidates = $('<div></div>');
    var candidates;
    if (!richLandFlag) 
      candidate = 'building';
    else
      candidate = 'farmOrMine';

    for (tech in gameState.Player[clientName].tech){
      if (gameState.Player[clientName].tech[tech].type == candidate){
        var $tech_tile = $('<div class = "tech_tile"></div>');
        var cost = gameState.Player[clientName].tech[tech].oreCost;
        $tech_tile.addClass(candidate);
        $tech_tile.text(tech);
        $tech_tile.mouseover(function(){
          $(this).addClass('stand_out');
          var $_this = $(this);
          $(this).mouseleave(function(){
            $_this.removeClass('stand_out'); 
          });
        });
        $tech_tile.droppable({drop:function(){
          $('.ui-draggable-dragging').remove();            
          $($worker_pool.children()).draggable('destroy');
          var buildWhat = $(this).text();
          decisionMade(buildWhat);
        }});
        $tech_tile.appendTo($overlay_container);
      }
    }

    function decisionMade(buildWhat){
      var $confirmation = $('<div class = "confirmation"></div>'); 
      var cost = gameState.Player[clientName].tech[buildWhat].oreCost;
      var discount = whichCard.oreDiscount;
      var finalCost = cost - discount;
      $confirmation.text('Build ' + buildWhat + ' for a total of '
                                  + finalCost + ' resources: '); 
      var $confirmButton = $('<button>Confirm</button>');
      $confirmButton.click(function(){
        _this._socket.emit('build', buildWhat, discount, handIndex);
        $overlay_bg.remove();
      });
      $confirmButton.appendTo($confirmation);
      $confirmation.appendTo($overlay_container);
    }
  }
}

UserInterface.prototype.politicalPhase = function(flag){
  var gameState = this.gameState;
  var clientName = this._tta_currentUser.username;
  var currentPlayer = gameState.Player[clientName];
  var _this = this;

  if (this.viewingPoliticalPane)
    $('#overlay_bg').remove();

  if (this.viewingGroupPane)
    $('#overlay_bg').remove();

  this.viewingPoliticalPane = true;
  
  var discardedCards = [];

  var $overlay_bg = $('<div id = "overlay_bg"></div>');
  $overlay_bg.appendTo('#body');
  $overlay_bg.droppable({
    drop:function(){
      if ($('.ui-draggable-dragging') != null){
        var handIndex = $('.ui-draggable-dragging').data('handIndex');
        $('.ui-draggable-dragging').remove();
        discardCard(handIndex);
      }
    }
  });
  
  var $overlay_container = $('<div id = "political_pane"></div>');
  $overlay_container.appendTo($overlay_bg);

  var $political_pane = this.drawPoliticalPane(flag);
  $overlay_container.replaceWith($political_pane);
  
  function discardCard(handIndex){
    discardedCards.push(_this.militaryHand.splice(handIndex, 1)[0]);
    var handSize = _this.militaryHand.length;
    var maxHandSize = currentPlayer.maxMilitaryHandSize;
    if (handSize > maxHandSize){
      var $newPane = _this.drawPoliticalPane('discard_phase');
      $('#political_pane').replaceWith($newPane);
    } else {
      var json_militaryHand = JSON.stringify(_this.militaryHand);
      var json_discardedCards = JSON.stringify(discardedCards);
      _this._socket.emit('push_military_hand', 
                         json_militaryHand,
                         json_discardedCards);
      _this.viewingPoliticalPane = false;
      $overlay_bg.remove();
    }
  }
}

UserInterface.prototype.drawPoliticalPane = function(flag){
  var gameState = this.gameState;
  var clientName = this._tta_currentUser.username;
  var currentPlayer = gameState.Player[clientName];
  var _this = this;

  var $political_pane = $('<div id = "political_pane"></div>');
  
  var $name = $('<div></div>');
  $name.appendTo($political_pane);

  // Draw instructions text
  var $instructions = $('<div></div>');
  $instructions.addClass('instructions');
  $instructions.appendTo($political_pane);

    // Draw military hand
  var $military_hand = $('<div id = "military_hand"></hand>');
  for (var i = 0; i < this.militaryHand.length; i++){
    var $card = $('<div class = "card"></div>');
    $card.text(this.militaryHand[i].name);
    $card.addClass(this.militaryHand[i].type);
    $card.data('handIndex', i);
    $card.appendTo($military_hand);
  }
  $military_hand.appendTo($political_pane);

  if (flag == 'political_phase'){
    $name.text('Political Phase');    
    $instructions.text('Play a card or pass political phase.');
    var $military_cards = $military_hand.children();
    $( $military_cards ).dblclick(function(){
      var handIndex = $(this).data('handIndex');
      var chosenCard = _this.militaryHand.splice(handIndex, 1)[0];
      if (chosenCard.type == 'event' ||
          chosenCard.type == 'territory'){
        _this._socket.emit('play_event', handIndex);  
        checkHandSize();
      }
    });
    $( $military_cards ).hover(
      function(){
        $(this).addClass('stand_out');
      },
      function(){
        $(this).removeClass('stand_out');
      }
    );

    var $passButton = $('<button>Pass political phase</button>');
    $passButton.click(function(){
      checkHandSize(); 
    });
    $passButton.appendTo($political_pane);

  } // End political phase

  if (flag == 'discard_phase'){
    $name.text('Discard Phase');
    var maxHandSize = currentPlayer.maxMilitaryHandSize;
    $instructions.text('Discard down to max hand size (' 
                      + maxHandSize 
                      + ')');
    $( $military_hand.children() ).draggable({
      revert:true
    });
  }

  $political_pane.droppable({
    greedy:true, 
    drop:function(){
      //nothing!!
    }
  }); 

  return $political_pane;

  function checkHandSize(){
    var handSize = _this.militaryHand.length;
    var maxHandSize = currentPlayer.maxMilitaryHandSize;
    if (handSize > maxHandSize){
      var $discard_phase = _this.drawPoliticalPane('discard_phase');
      $('#political_pane').replaceWith($discard_phase);
    } else {
      _this.viewingPoliticalPane = false;
      $('#overlay_bg').remove();
    } 
  }
}

UserInterface.prototype.groupPolitical = function(card){
  var gameState = this.gameState;
  var clientName = this._tta_currentUser.username;
  var currentPlayer = gameState.Player[clientName];
  var _this = this;

  if (this.viewingGroupPane){
    $('#overlay_bg').remove();
  }

  this.viewingGroupPane = true;

  card = JSON.parse(card);
  var $overlay_bg = $('<div id = "overlay_bg"></div>');
  var $political_pane = $('<div id = "political_pane"></div>');
  var $savedPoliticalPane;
  if (this.viewingPoliticalPane){
    $savedPoliticalPane = $('#political_pane').detach();
    $political_pane.appendTo($('#overlay_bg'));
  } else {
    $overlay_bg.appendTo($('#body'));
    $political_pane.appendTo($overlay_bg);
  }

  var $name = $('<div></div>');
  $name.appendTo($political_pane);

  var $instructions = $('<div></div>');
  $instructions.addClass('instructions');
  $instructions.appendTo($political_pane);

  if (card.type == 'event'){
    $name.text('Revealed Event'); 
    $instructions.text('The following event was just revealed:');

    var $card = $('<div></div>');
    $card.addClass('card');
    $card.addClass(card.type);
    $card.text(card.name);
    $card.appendTo($political_pane);

    var $okay_button = $('<button id = "okay_button">Ok</button>');
    $okay_button.click(function(){
      _this.viewingGroupPane = false;
      if (_this.viewingPoliticalPane){
        if (card.name == 'Development of Politics'){
          $overlay_bg.remove();
        } else {
          $('#political_pane').replaceWith($savedPoliticalPane);
        }
      } else {
        $overlay_bg.remove();      
      }

    });
    $okay_button.appendTo($political_pane);

    var $mini_game = $('<div id = "mini_game"></div>');
    $mini_game.appendTo($political_pane);

    var $game_text = $('<div></div>');
    $game_text.text(card.gameText);
    $game_text.appendTo($mini_game);

    if (card.evalFlag == true){
      eval(card.evalCode);
    }

    var $mini_game_history = $('<div id = "mini_game_history"></div>');
    $mini_game_history.appendTo($mini_game);

    var $mini_game_state = $('<div id = "mini_game_state"></div>');
    $mini_game_state.appendTo($mini_game);
  }
}

UserInterface.prototype.miniGameStateUpdate = function(gameState){
  var hasTheTurn = false;
  if (gameState.currentPlayer == this._tta_currentUser.username){
    hasTheTurn = true;
  }
  
  if (hasTheTurn){
    $('#choices').show();
  } else {
    $('#choices').hide();
  }

  var $mini_game_state = $('<div id = "mini_game_state"></div>');

  var $last_move = $('<div></div>');
  $last_move.text(gameState.lastMove);
  $last_move.appendTo('#mini_game_history');

  if (gameState.gameFinished){
    $('#choices').hide();
    var $quit_button = $('<button>Done here!</button>');
    $quit_button.click(function(){
      $('#okay_button').click();
    });
    $quit_button.appendTo($mini_game_state);
  } else {
    var $currentPlayer = $('<div></div>');
    $currentPlayer.text(gameState.currentPlayer + ' is up.'); 
    $currentPlayer.appendTo($mini_game_state);
  }
  $('#mini_game_state').replaceWith($mini_game_state); 
}

