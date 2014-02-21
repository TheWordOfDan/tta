/*

CivilDeck.js
by Dan

*/

var CivilCard = require('./CivilCard');

function CivilDeck(numPlayers){
  this._numPlayers = numPlayers;
  this.cards = [];
}

CivilDeck.prototype.addCard = function(name, type, age){
  var newCard = new CivilCard(name, type, age);
  
  if (newCard.type == 'wonder'){  
    this.initWonder(newCard);
  }
    
  if (newCard.type == 'yellow'){
    this.initYellowCard(newCard);
  }

  if (newCard.type == 'tech'){
    this.initTech(newCard);
  }

  this.cards.push(newCard);
}

CivilDeck.prototype.initWonder = function(newCard){
  newCard.assignedBlues = 0;
  newCard.productionSteps = [];
  newCard.completed = false;

  if (newCard.name == 'Pyramids'){
    initProductionSteps(newCard, 3);
    newCard.productionSteps[0].cost = 3;
    newCard.productionSteps[1].cost = 2;
    newCard.productionSteps[2].cost = 1;
  }
  if (newCard.name == 'Library of Alexandria'){
    initProductionSteps(newCard, 4);
    newCard.productionSteps[0].cost = 1;
    newCard.productionSteps[1].cost = 2;
    newCard.productionSteps[2].cost = 2;
    newCard.productionSteps[3].cost = 1;
  }
  if (newCard.name == 'Colossus'){
    initProductionSteps(newCard, 2);
    newCard.productionSteps[0].cost = 3;
    newCard.productionSteps[1].cost = 3;
  }
  if (newCard.name == 'Hanging Gardens'){
    initProductionSteps(newCard, 3);
    newCard.productionSteps[0].cost = 2;
    newCard.productionSteps[1].cost = 2;
    newCard.productionSteps[2].cost = 2;
  }

  function initProductionSteps(wonder, numSteps){
    for (var i = 0; i < numSteps; i++){
      var step = new Object();
      step.done = false;
      step.cost = 0;
      wonder.productionSteps.push(step);
    }
  }
}

CivilDeck.prototype.initYellowCard = function(newCard){
  if (newCard.name == 'Ideal Building Site'){
    if (newCard.age == 'A') newCard.oreDiscount = 1;
    if (newCard.age == 'I') newCard.oreDiscount = 2;
  }

  if (newCard.name == 'Rich Land'){
    if (newCard.age == 'A') newCard.oreDiscount = 1;
    if (newCard.age == 'I') newCard.oreDiscount = 2;
  }

  if (newCard.name == 'Frugality'){
    if (newCard.age == 'A') newCard.foodRefund = 1;
    if (newCard.age == 'I') newCard.foodRefund = 2;
  }

  if (newCard.name == 'Patriotism'){
    if (newCard.age == 'A') newCard.tempMilitaryOre = 1;
    if (newCard.age == 'I') newCard.tempMilitaryOre = 2;
  }

  if (newCard.name == 'Work of Art'){
    if (newCard.age == 'A') newCard.cultureBonus = 6;
    if (newCard.age == 'I') newCard.cultureBonus = 5;
  }

  if (newCard.name == 'Revolutionary Idea'){
    if (newCard.age == 'A') newCard.scienceBonus = 1;
    if (newCard.age == 'I') newCard.scienceBonus = 2;
  } 

  if (newCard.name == 'Engineering Genius'){
    if (newCard.age == 'A') newCard.oreDiscount = 2;
    if (newCard.age == 'I') newCard.oreDiscount = 3;
  }

  if (newCard.name == 'Bountiful Harvest'){
    if (newCard.age == 'I') newCard.foodBonus = 3;
  }

  if (newCard.name == 'Mineral Deposits'){
    if (newCard.age == 'I') newCard.oreBonus = 2;
  }

  if (newCard.name == 'Breakthrough'){
    if (newCard.age == 'I') newCard.scienceRefund = 2;
  }
}

CivilDeck.prototype.initTech = function(newCard){
  if (newCard.name == 'Irrigation'){
    newCard.subtype = 'farmOrMine';
    newCard.scienceCost = 3;
  }
}

CivilDeck.prototype.drawCard = function(){
  return this.cards.shift();
}

CivilDeck.prototype.returnEmptyCard = function(){
  var emptyCard = new CivilCard();
  return emptyCard;
}

CivilDeck.prototype.shuffle = function(){
  var tempDeck = [];
  while (this.cards.length != 0){
    var randomNumber = Math.floor(Math.random()*this.cards.length);
    var i = this.cards.splice(randomNumber, 1)[0];
    tempDeck.push(i);
  }
  this.cards = tempDeck;
}

CivilDeck.prototype.initAgeA = function(){
  /* 
  this.addCard('Revolutionary Idea',    'yellow', 'A');
  this.addCard('Patriotism',            'yellow', 'A');
  this.addCard('Engineering Genius',    'yellow', 'A'); 
  this.addCard('Work of Art',           'yellow', 'A');
  this.addCard('Frugality',             'yellow', 'A');
  this.addCard('Frugality',             'yellow', 'A');
  this.addCard('Ideal Building Site',   'yellow', 'A');
  this.addCard('Ideal Building Site',   'yellow', 'A');
  this.addCard('Rich Land',             'yellow', 'A');
  this.addCard('Rich Land',             'yellow', 'A');
  this.addCard('Library of Alexandria', 'wonder', 'A');
  this.addCard('Hanging Gardens',       'wonder', 'A');
  this.addCard('Colossus',              'wonder', 'A');
  this.addCard('Pyramids',              'wonder', 'A');
  this.addCard('Aristotle',             'leader', 'A');
  this.addCard('Julius Caesar',         'leader', 'A');
  this.addCard('Hammurabi',             'leader', 'A');
  this.addCard('Moses',                 'leader', 'A');
  this.addCard('Alexander the Great',   'leader', 'A');
  this.addCard('Homer',                 'leader', 'A');
  this.shuffle();
  */
  this.initAgeI();
}

CivilDeck.prototype.initAgeI = function(){
  /*done*/this.addCard('Bountiful Harvest',   'yellow', 'I');
  /*done*/this.addCard('Breakthrough',        'yellow', 'I');
  this.addCard('Efficient Upgrade',   'yellow', 'I');
  this.addCard('Efficient Upgrade',   'yellow', 'I');
  /*done*/this.addCard('Engineering Genius',  'yellow', 'I');
  /*done*/this.addCard('Frugality',           'yellow', 'I');
  /*done*/this.addCard('Ideal Building Site', 'yellow', 'I');
  /*done*/this.addCard('Mineral Deposits',    'yellow', 'I');
  /*done*/this.addCard('Mineral Deposits',    'yellow', 'I');
  /*done*/this.addCard('Patriotism',          'yellow', 'I');
  /*done*/this.addCard('Revolutionary Idea',  'yellow', 'I');
  /*done*/this.addCard('Rich Land',           'yellow', 'I');
  /*done*/this.addCard('Work of Art',         'yellow', 'I');

  this.addCard('Irrigation', 'tech', 'I');
  this.addCard('Irrigation', 'tech', 'I');

  if (this._numPlayers == 3){

  }

  if (this._numPlayers == 4){
    this.addCard('Irrigation', 'tech', 'I');
  }

  this.shuffle();
}


module.exports = CivilDeck; 
