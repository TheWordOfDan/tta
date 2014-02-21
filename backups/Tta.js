/*

Tta.js
by Dan

*/

// Notes:
//  - User objects from app.js

function Tta(){

  this.gameName;
  this.connectedPlayers = new Array(); // Array of User objects
  this.connectedSockets = {};
  this.Player = {};  

  this.firstPlayer; // String
  this.currentPlayer; // String
  this.turnCycle = new Array(); // Array of strings
  this.turnCyclePosition = 0;
  this.completedTurnCycles = 0;
  
  this.changeIndex = 0;

}

Tta.prototype.initTta = function(){

  for (var i = 0; i < this.connectedPlayers.length; i++){
    this.Player[this.connectedPlayers[i].username] = this.connectedPlayers[i];
    this.extendConnectedPlayers(this.connectedPlayers[i]);
  }

  for (i in this.connectedSockets){
    this.connectedSockets[i].emit('init_tta');
  }

  this.initSockets();
  this.initNewGame();

}

Tta.prototype.extendConnectedPlayers = function(player){

  player.tech = {};
  var agriculture = new Tech('Agriculture', 2),
           bronze = new Tech('Bronze', 2),
       philosophy = new Tech('Philosophy', 1),
          warrior = new Tech('Warrior', 1);
  player.tech[agriculture.name] = agriculture;
  player.tech[bronze.name] = bronze;
  player.tech[philosophy.name] = philosophy;
  player.tech[warrior.name] = warrior;
  //player.blueTech = {};
  //player.govTech = {};

  player.popBank = 18;
  player.workerPool = 1;

  player.totalBlues = 18;
  player.blueBank = 18;

  player.culture = 0;
  player.food = 0;
  player.foodDistro = {1:0}; // add in 2, 3 and 5 as tech is discovered

}

Tta.prototype.initSockets = function(){
    
  var _this = this;  
  for (socket in this.connectedSockets){
    this.connectedSockets[socket].on('pass_turn', function(){
      _this.passTurn();
    });

    this.connectedSockets[socket].on('push_chat_update', function(msgData){
      _this.pushChatUpdate(msgData);  
    });

    this.connectedSockets[socket].on('increase_pop', function(){
      _this.increasePop();
    });

    this.connectedSockets[socket].on('build', function(buildWhat){
      _this.build(buildWhat);
    });

    this.connectedSockets[socket].on('destroy', function(destroyWhat){
      _this.destroy(destroyWhat);
    });
  }
  
}

Tta.prototype.initNewGame = function(){
  this.initTurnCycle();
  this.firstPlayer = this.turnCycle[0]; 
  this.currentPlayer = this.firstPlayer; 
  this.pushGameState();
}

Tta.prototype.initTurnCycle = function(){
  
  //TODO randomize this at some point

  for (var i = 0; i < this.connectedPlayers.length; i++){
    this.turnCycle.push(this.connectedPlayers[i].username);
  }

}

Tta.prototype.passTurn = function(){
  
  // food/consumption
  var producedFood = 0, consumption = 0, netFood = 0; 
  for (var i = 0; i < this.Player[this.currentPlayer]
                          .tech['Agriculture']
                          .assignedPop; i++){
    this.Player[this.currentPlayer].foodDistro[1]++;
    producedFood++;
  }
  // TODO Irrigation, Selective Breeding and Mechanized Agriculture loops
  var i = 17;
  while (i > 1){
    if (this.Player[this.currentPlayer].popBank < i) consumption++;
    i -= 4;
  }
  if (this.Player[this.currentPlayer].popBank == 0) consumption = 6;

  netFood = producedFood - consumption;
  if (this.Player[this.currentPlayer].food + netFood < 0){
    var foodDeficit = this.Player[this.currentPlayer].food + netFood;
    var culturePenalty = foodDeficit*4;
    this.Player[this.currentPlayer].culture -= culturePenalty;
    this.Player[this.currentPlayer].food = 0;
  }

  sortDistro(this.Player[this.currentPlayer].foodDistro);
  this.spendBlues(consumption, 
                  this.Player[this.currentPlayer].foodDistro);
  this.Player[this.currentPlayer].food = this.bluesToNumber(this.Player[this.currentPlayer].foodDistro); 

  var producedFoodNotice = this.currentPlayer 
                         + ' produced ' + netFood + ' food '
                         + '(' + producedFood + ' produced - '
                         + consumption + ' consumption).';

  this.pushChatUpdate({source:'system', text:producedFoodNotice});
 
  // ore/corruption
  /*
  for (var i = 0; i < this.Player[this.currentPlayer]
                          .tech['Bronze']
                          .assignedPop; i++){
    this.Player[this.currentPlayer].blueBank--
    this.Player[this.currentPlayer].tech['Bronze'].assignedBlues++;
  }
 */
  
  // Assign blues to blue bank and tech cards to draw later. 
  this.assignBlues();

  // pass the turn
  var turnPassedNotice = this.currentPlayer + ' has passed the turn.';

  this.turnCyclePosition++;
  if (this.turnCyclePosition > this.turnCycle.length - 1){
    this.turnCyclePosition = 0;
    this.completedTurnCycles++;
  }
  this.currentPlayer = this.turnCycle[this.turnCyclePosition];
  this.pushGameState();

  var msgData = {source:'system', text:turnPassedNotice};
  this.pushChatUpdate(msgData); 

  // Misc functions
  function sortDistro(resourceDistro){
    var tempDistro = {};
    var tempArray = [];
    for (denom in resourceDistro){
      tempArray.push(+denom);
    }
    var preSort = tempArray;
    tempArray.sort();
    if (preSort == tempArray) return;
    for (i = 0; i < tempArray.length; i++){
      tempDistro[tempArray[i]] = resourceDistro[tempArray[i]];
    }
    resourceDistro = tempDistro;
  }
  
}

Tta.prototype.spendBlues = function(target, resourceDistro, resource){
  // NOTE: assumes this a valid spend.
  if (target == 0) return;
  var tempArray = new Array();
  for (denom in resourceDistro){
    for (var i = 0; i < resourceDistro[denom]; i++){
      tempArray.push(denom)  
    }
  }
  var runningTotal = 0;
  while (runningTotal < target){
    var temp = +tempArray.shift();
    runningTotal += temp;
    resourceDistro[temp]--;
  }
  var change = runningTotal - target;
  if (change != 0){
    var denominations = new Array();
    for (denom in resourceDistro){
      denominations.push(+denom);
    }
    denominations.sort();
    var currentDenom = denominations.pop();
    while (change != 0){
      change -= currentDenom;
      resourceDistro[currentDenom]++;
      if (change < 0){
        change += currentDenom;
        resourceDistro[currentDehom]--;
        currentDenom = denominations.pop();
      }
    }
  }
}

Tta.prototype.bluesToNumber = function(resourceDistro){
  var number = 0;
  for (denom in resourceDistro){
    number += (+denom)*resourceDistro[denom];
  }
  return number;
}

Tta.prototype.assignBlues = function(){
  var nonBankBlues = 0;
    for (denom in this.Player[this.currentPlayer].foodDistro){
      nonBankBlues += this.Player[this.currentPlayer].foodDistro[denom];
    }
    //TODO another loop for ore
    this.Player[this.currentPlayer].blueBank = this.Player[this.currentPlayer].totalBlues - nonBankBlues;

  for (denom in this.Player[this.currentPlayer].foodDistro){
    if (+denom === 1){
       this.Player[this.currentPlayer].tech['Agriculture'].assignedBlues = this.Player[this.currentPlayer].foodDistro[denom];
    }
    //TODO loops for the other farm techs
  }
}

Tta.prototype.increasePop = function(){

  // if sufficient civil actions
  var cost = 2;
  var i = 17;
  while (i > 5){
    if (this.Player[this.currentPlayer].popBank < i) cost++;
    i -= 4;
  }
  if (this.Player[this.currentPlayer].popBank < 5) cost = 7;
  if (this.Player[this.currentPlayer].food < cost){
    //this.pushGameState(this.currentPlayer);
    var msg = {source:'system',
               text:'Failed to increase population: not enough food!'};
    this.actionFailure(msg);
  } else if (this.Player[this.currentPlayer].popBank == 0){
    //this.pushGameState(this.currentPlayer);
    var msg = {source:'system',
               text:'Failed to increase population: yellow bank empty!'};
  } else {
    this.spendBlues(cost, 
                    this.Player[this.currentPlayer].foodDistro,
                    this.Player[this.currentPlayer].food)
    this.Player[this.currentPlayer].food = this.bluesToNumber(this.Player[this.currentPlayer].foodDistro);
    this.assignBlues();

    this.Player[this.currentPlayer].popBank--;
    this.Player[this.currentPlayer].workerPool++;
    this.pushGameState();
    var increasedPopNotice = this.currentPlayer 
                           + ' has increased population.';
    var msgData = {source:'system', text:increasedPopNotice};
    this.pushChatUpdate(msgData);
  }
}

Tta.prototype.build = function(buildWhat){
  
  // If sufficient ore, civil actions
  this.Player[this.currentPlayer].workerPool--
  this.Player[this.currentPlayer].tech[buildWhat].assignedPop++;
  this.pushGameState();
  var buildSomethingNotice = this.currentPlayer
                           + ' has built a '
                           + buildWhat + '.';
  var msgData = {source:'system', text:buildSomethingNotice};
  this.pushChatUpdate(msgData);

}

Tta.prototype.destroy = function(destroyWhat){
  
  // If sufficient civil actions
  this.Player[this.currentPlayer].tech[destroyWhat].assignedPop--;
  this.Player[this.currentPlayer].workerPool++;
  this.pushGameState();
  var destroySomethingNotice = this.currentPlayer
                             + ' has destroyed a '
                             + destroyWhat + '.';
  var msgData = {source:'system', text:destroySomethingNotice};
  this.pushChatUpdate(msgData);
}

Tta.prototype.actionFailure = function(msg){
  this.connectedSockets[this.Player[this.currentPlayer].socketId]
      .emit('chat_update', msg);
}

Tta.prototype.pushChatUpdate = function(msgData){
  for (i in this.connectedSockets){
    this.connectedSockets[i].emit('chat_update', msgData);
  }
}

Tta.prototype.pushGameState = function(target){

  // Build a game state object and push it to the clients 
  var gameState = new Object();
  gameState.firstPlayer = this.firstPlayer;
  gameState.currentPlayer = this.currentPlayer;
  gameState.completedTurnCycles = this.completedTurnCycles;
  gameState.Player = this.Player;

  var json_gameState = JSON.stringify(gameState);

  if (target){
    this.connectedSockets[this.Player[target].socketId].emit('game_state_update', json_gameState);
    return;
  }

  for (i in this.connectedSockets){
    this.connectedSockets[i].emit('game_state_update', json_gameState);
  }

}

// Tech class
function Tech(nameIn, assignedPopIn){
  this.name = nameIn;
  this.assignedPop = assignedPopIn;
  this.assignedBlues = 0;
}

module.exports = Tta;
