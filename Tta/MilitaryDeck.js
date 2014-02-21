/*

MilitaryDeck.js
by Dan

*/

var MilitaryCard = require('./MilitaryCard');

function MilitaryDeck(numPlayers){

  this.discardedCards = [];
  this.currentEvents = [];
  this.futureEvents = [];

  this._numPlayers = numPlayers;
  this._cards = [];  

}

MilitaryDeck.prototype._addCard = function(name, age, type){
  var newCard = new MilitaryCard(name, age, type);
  newCard.gameText = this._assignGameText(newCard);
  this._assignEvalCode(newCard);
  this._cards.push(newCard);
}

MilitaryDeck.prototype._assignEvalCode = function(newCard){
  var interfaceCode = function(){
    var socket = _this._socket;
    var newCard = card;
    var $pane = $mini_game;
    var $okay = $okay_button;
    $okay.hide();
    var $choices = $('<div id = "choices"></div>');
    $choices.appendTo($pane);
  }.toString().slice(12, -1);

  var twoButtons = function(){
    var $button1 = $('<button></button>');
    $button1.appendTo($choices);
    $button1.click(function(){
      socket.emit('political_decision', newCard.name, 0);
    });
    var $button2 = $('<button></button>');
    $button2.appendTo($choices);
    $button2.click(function(){
      socket.emit('political_decision', newCard.name, 1);
    });
  }.toString().slice(12, -1);

  if (newCard.name == 'Development of Markets'){
    newCard.evalFlag = true;
    newCard.evalCode = interfaceCode + twoButtons + function(){
      $button1.text('Produce 2 Resources');
      $button2.text('Produce 2 Food');
    }.toString().slice(12, -1);
  }

  if (newCard.name == 'Development of Religion'){
    newCard.evalFlag = true;
    newCard.evalCode = interfaceCode + twoButtons + function(){
      if (currentPlayer.workerPool > 0){
        $button1.text('Build Age A Temple');
        $button2.text('No, thanks');
        var $worker_pool = $('<div></div>');
        $worker_pool.text('Available workers: ' 
                          + currentPlayer.workerPool);
        $worker_pool.before($choices);
      } else {
        $button1.hide();
        $button2.hide();
        socket.emit('political_decision', newCard.name, -1);
      }
    }.toString().slice(12, -1);
  }

  if (newCard.name == 'Development of Warfare'){
    newCard.evalFlag = true;
    newCard.evalCode = interfaceCode + twoButtons + function(){
      if (currentPlayer.workerPool > 0){
        $button1.text('Build Warrior');
        $button2.text('No, thanks');
        var $worker_pool = $('<div></div>');
        $worker_pool.text('Available workers: ' 
                          + currentPlayer.workerPool);
        $worker_pool.before($choices);
      } else {
        $button1.hide();
        $button2.hide();
        socket.emit('political_decision', newCard.name, -1);
      }
    }.toString().slice(12, -1);
  }

}

MilitaryDeck.prototype._assignGameText = function(newCard){

    var returnText = '';
    if (newCard.name == 'Development of Agriculture'){
      returnText = 'Each civilization produces 2 food.';
    }

    if (newCard.name == 'Development of Crafts'){
      returnText = 'Each civilization produces 2 resources.';
    }

    if (newCard.name == 'Development of Markets'){
      returnText = function(){/*
      Each civilization produces 2 food or 2 resources (player's choice).
      */}.toString().slice(14, -3);
    }

    if (newCard.name == 'Development of Politics'){
      returnText = function(){/*
      Each player draws 3 military cards. Active player doesn't
      discard military cards this round.
      */}.toString().slice(14, -3);
    }

    if (newCard.name == 'Development of Religion'){
      returnText = function(){/*
      Each player with an unused worker may immediately build an age A
      temple for free.
      */}.toString().slice(14, -3);
    }

    if (newCard.name == 'Development of Science'){
      returnText = 'Each civilization scores 2 science.';
    }

    if (newCard.name == 'Development of Settlement'){
      returnText = 'Each civilization increases its population for free.';
    }

    if (newCard.name == 'Development of Trade Routes'){
      returnText = function(){/*
      Each civilization scores 1 science and produces 1 resource and
      1 food.
      */}.toString().slice(14, -3);
    }

    if (newCard.name == 'Development of Warfare'){
      returnText = function(){/*
      Each player with an unused worker may immediately build a Warrior
      unit for free.
      */}.toString().slice(14, -3);
    }

    if (newCard.name == 'No Event'){
      returnText = 'No event.';
    }

    return returnText;

}

MilitaryDeck.prototype.initAgeA = function(){

  this._addCard('Development of Agriculture',  'A', 'event');
  this._addCard('Development of Crafts',       'A', 'event');
  this._addCard('Development of Markets',      'A', 'event');
  this._addCard('Development of Politics',     'A', 'event');
  this._addCard('Development of Religion',     'A', 'event');
  this._addCard('Development of Science',      'A', 'event');
  this._addCard('Development of Settlement',   'A', 'event');
  this._addCard('Development of Trade Routes', 'A', 'event');
  this._addCard('Development of Warfare',      'A', 'event');
  this._addCard('No Event', 'A', 'event');
  this._shuffle();
  for (var i = 0; i < this._numPlayers + 2; i++){
    this.currentEvents.push(this._cards.pop()); 
  }
  while (this._cards.length > 0){
    this._cards.pop();
  }

}

MilitaryDeck.prototype.initAgeI = function(){
  this._addCard('Barbarians',              'I', 'event');
  this._addCard('Border Conflict',         'I', 'event');
  this._addCard('Crusades',                'I', 'event');
  this._addCard('Cultural Influence',      'I', 'event');
  this._addCard('Foray',                   'I', 'event');
  this._addCard('Good Harvest',            'I', 'event');
  this._addCard('Immigration',             'I', 'event');
  this._addCard('New Deposits',            'I', 'event');
  this._addCard('Pestilence',              'I', 'event');
  this._addCard('Raiders',                 'I', 'event');
  this._addCard('Rats',                    'I', 'event');
  this._addCard('Rebellion',               'I', 'event');
  this._addCard('Reign of Terror',         'I', 'event');
  this._addCard('Scientific Breakthrough', 'I', 'event');
  this._addCard('Uncertain Borders',       'I', 'event');
  this._addCard('Developed Territory',     'I', 'territory');
  this._addCard('Fertile Territory',       'I', 'territory');
  this._addCard('Historic Territory',      'I', 'territory');
  this._addCard('Inhabited Territory',     'I', 'territory');
  this._addCard('Strategic Territory',     'I', 'territory');
  this._addCard('Wealthy Territory',       'I', 'territory');

  this._shuffle(); 
}

MilitaryDeck.prototype.drawCard = function(){
  var card = this._cards.pop();
  return card;
}

MilitaryDeck.prototype._shuffle = function(){
  var tempDeck = [];
  while (this._cards.length != 0){
    var randomNumber = Math.floor(Math.random()*this._cards.length);
    var i = this._cards.splice(randomNumber, 1)[0];
    tempDeck.push(i);
  }
  this._cards = tempDeck;
}

module.exports = MilitaryDeck;
