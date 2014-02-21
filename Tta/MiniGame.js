/*

MiniGame.js
by Dan

*/

function MiniGame(numPlayers, connectedSockets, turnCycle){

  this._connectedSockets = connectedSockets;
  this._turnCycle = turnCycle;

  this._unalteredTurnCycle = turnCycle;

  this._firstPlayer;
  this._currentPlayer;
  this._lastMove;
  this._gameFinished = false;

  this.results = [];
}

MiniGame.prototype.initMiniGame = function(whichGame, firstPlayer){
  this._turnCycle = this._unalteredTurnCycle;
  this._gameFinished = false;
  this._lastMove = '';
  this._resetGameResults();
  this._firstPlayer = firstPlayer;
  this._currentPlayer = firstPlayer;
}

MiniGame.prototype.checkIn =
function(miniGame, decisionIndex, playerName, socketId){

  if (decisionIndex == -1){
    for (var i = 0; i < this._turnCycle.length; i++){
      if (this._turnCycle[i] == playerName){
        this._turnCycle.splice(i, 1);
        var temp = {player:playerName, decision:decisionIndex};
        this._lastMove = this.generateLastMoveString(miniGame, temp);
        this.pushGameState();
        return false;;
      }
    }
  }  
  
  var resultsNode = {};
  resultsNode.player = playerName;
  resultsNode.decision = decisionIndex;
  this._lastMove = this.generateLastMoveString(miniGame, resultsNode); 
  this.results.push(resultsNode);
  this._passTurn();  

  if (this._currentPlayer == this._firstPlayer){
    this._gameFinished = true;
  }

  this.pushGameState();
  
  if (this._gameFinished){
    return true;
  }
  return false;
}

MiniGame.prototype.generateLastMoveString = function(miniGame, resultsNode){
  var lastMove = '';
  if (miniGame == 'Development of Markets'){
    if (resultsNode.decision == 0){
      lastMove = resultsNode.player + ' chose 2 resources.';
    } else {
      lastMove = resultsNode.player + ' chose 2 food.';
    }
  }
  
  if (miniGame == 'Development of Religion'){
    if (resultsNode.decision == 0){
      lastMove = resultsNode.player + ' chose the free temple.';
    } else if (resultsNode.decision == 1) {
      lastMove = resultsNode.player + ' declined.';
    } else if (resultsNode.decision == -1) {
      lastMove = resultsNode.player + ' had no free workers.';
    }
  }

  if (miniGame == 'Development of Warfare'){
    if (resultsNode.decision == 0){
      lastMove = resultsNode.player + ' chose the free Warrior.';
    } else if (resultsNode.decision == 1) {
      lastMove = resultsNode.player + ' declined.';
    } else if (resultsNode.decision == -1) {
      lastMove = resultsNode.player + ' had no free workers.';
    }
  }

  return lastMove;
  
}

MiniGame.prototype._passTurn = function(){
  for (var i = 0; i < this._turnCycle.length; i++){
    if (this._currentPlayer == this._turnCycle[i]){
      
      if (i + 1 == this._turnCycle.length){
        this._currentPlayer = this._turnCycle[0];
      } else {
        this._currentPlayer = this._turnCycle[i+1];
      }
      
      break;
    }
  }
}

MiniGame.prototype.pushGameState = function(){  
  var gameState = {};
  gameState.currentPlayer = this._currentPlayer;
  gameState.lastMove = this._lastMove;
  gameState.gameFinished = this._gameFinished;

  var json_gameState = JSON.stringify(gameState);
  for (socket in this._connectedSockets){
    this._connectedSockets[socket].emit('minigame_state_update',
                                         json_gameState);
  }
}

MiniGame.prototype._resetGameResults = function(){
  while (this.results.length != 0){
    this.results.pop();
  }
}

module.exports = MiniGame;
