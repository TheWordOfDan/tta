// game.js

function Game(){
  this.game_name;
  this.active = false;
  this.connectedUsers = new Array(); //user objects
  this.readyList = new Array(); // strings
  this.host; // string
}

module.exports = Game;
