/*

Tta.js
by Dan

*/

/*

NOTES:
  - User objects from app.js

*/

/*

TODO

 - iron 
 - end of age A
 - view military hand while not in political phase
 - consolidate culturePerTurn, sciencePerTurn and strength 
   into activePop??
 - randomize the turn cycle

*/

var CivilDeck = require('./CivilDeck');
var MilitaryDeck = require('./MilitaryDeck');
var MiniGame = require('./MiniGame');

// Tta class
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
  this.currentAge = 'A';

  this.cardRow = [];
  
  this.changeIndex = 0;

}

Tta.prototype.initTta = function(){
  for (var i = 0; i < this.connectedPlayers.length; i++){
    this.Player[this.connectedPlayers[i]
                    .username] = this.connectedPlayers[i];
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
  var agriculture = new Tech('Agriculture', 2, 2, 0, 'farmOrMine', 'farm'),
           bronze = new Tech('Bronze', 2, 2, 0, 'farmOrMine', 'mine'),
       philosophy = new Tech('Philosophy', 1, 3, 0, 'building', 'lab'),
         religion = new Tech('Religion', 0, 3, 0, 'building', 'temple'),
          warrior = new Tech('Warrior', 1, 2, 0, 'military', 'infantry');
  player.tech[agriculture.name] = agriculture;
  player.tech[bronze.name] = bronze;
  player.tech[philosophy.name] = philosophy;
  player.tech[religion.name] = religion;
  player.tech[warrior.name] = warrior;
  //player.blueTech = {}; 

  player.numBuildings = {};
  player.numBuildings['labs'] = 1;
  player.numBuildings['temples'] = 0;

  player.militaryDistros = {};
  var infantry = {1:1}; // by military strength
  player.militaryDistros['infantry'] = infantry;
  player.militaryDistros['cavalry'] = {};
  player.militaryDistros['artillery'] = {};
  player.miscStrengthSrcs = [];
  player.leader;
  player.govTech;
  var despotism = new GovTech('Despotism', 4, 2, 2, 0);
  player.govTech = despotism;
  player.totalCivilActions = 4;
  player.spentCivilActions = 0;
  player.totalMilitaryActions = 2;
  player.spentMilitaryActions = 0;
  player.tempMilitaryActions = 0;
  player.militaryStrength = 1;
  player.colonyBonus = 0;
  player.popBank = 18;
  player.workerPool = 1;
  player.unhappyFaces = 0;
  player.happyFaces = 0;
  player.totalBlues = 18;
  player.blueBank = 18;
  player.culture = 0;
  player.culturePerTurn = 0;
  player.culturePerTurnSrcs = [];
  player.science = 0;
  player.sciencePerTurn = 1;
  player.sciencePerTurnSrcs = [1]; //philosophy!!
  player.food = 0;
  player.foodDistro = {1:0}; // add in 2, 3 and 5 as tech is discovered
  player.ore = 0;
  player.tempMilitaryOre = 0;
  player.oreDistro = {1:0};
  player.maxCivilHandSize = 4;
  player.maxMilitaryHandSize = 2;
  player.civilHand = [];
  player.wonders = [];
}

Tta.prototype.initSockets = function(){
  var _this = this;  
  for (socket in this.connectedSockets){
    
    this.connectedSockets[socket].on('pass_turn', 
      function(){
        _this.passTurn();
      }
    );
    
    this.connectedSockets[socket].on('push_chat_update', 
      function(msgData){
        _this.pushChatUpdate(msgData);  
      }
    );
    
    this.connectedSockets[socket].on('increase_pop', 
      function(){
        _this.increasePop();
      }
    );
    
    this.connectedSockets[socket].on('build', 
      function(buildWhat, oreDiscount, ibsIndex, military){
        _this.build(buildWhat, oreDiscount, ibsIndex, military);
      }
    );
    
    this.connectedSockets[socket].on('destroy', 
      function(destroyWhat, military){
        _this.destroy(destroyWhat, military);
      }
    );
    
    this.connectedSockets[socket].on('build_wonder_stage', 
      function(wonderIndex){
        _this.buildWonderStage(wonderIndex, 1, 0);
      }
    );
    
    this.connectedSockets[socket].on('draft_card', 
      function(rowIndex){
        _this.draftCard(rowIndex);      
      }
    );
    
    this.connectedSockets[socket].on('undraft_card', 
      function(handIndex){
        _this.undraftCard(handIndex);
      }
    );

    this.connectedSockets[socket].on('play_civil_card', 
      function(handIndex){
        _this.playCivilCard(handIndex);  
      }
    );

    this.connectedSockets[socket].on('discover_tech',
      function(handIndex, flag, scienceRefund){
        _this.discoverTech(handIndex, flag, scienceRefund);
      }
    );

  //Political phase
    this.connectedSockets[socket].on('push_military_hand', 
      function(militaryHand, discardedCards){
        _this.updateMilitaryHand(militaryHand, discardedCards);    
      }
    );

    this.connectedSockets[socket].on('play_event',
      function(handIndex){
        _this.playEvent(handIndex);  
      }
    );
  
    this.connectedSockets[socket].on('political_decision',
      function(cardName, decisionIndex){
        _this.politicalDecision(cardName, decisionIndex, this.id);    
      }
    );

  }
}

Tta.prototype.initNewGame = function(){
  this.initTurnCycle();
  this.firstPlayer = this.turnCycle[0]; 
  this.currentPlayer = this.firstPlayer; 
  this.civilDeck = new CivilDeck(this.turnCycle.length); 
  this.civilDeck.initAgeA();
  this.initCardRow();
  this.militaryDeck = new MilitaryDeck(this.turnCycle.length);
  this.militaryDeck.initAgeA();
  this.militaryDeck.initAgeI();

  this.MiniGame = new MiniGame(this.connectedPlayers.length, 
                               this.connectedSockets,
                               this.turnCycle);

  // These aren't a part of a game state object!!
  this.militaryHands = {};
  for (player in this.Player){
    this.militaryHands[player] = [];
  }

  for (var i = 0; i < this.connectedPlayers.length; i++){
    this.connectedPlayers[i].spentCivilActions = 3 - i;
  }
  msg = this.sysMsgfy(this.currentPlayer + "'s turn has begun.");
  this.pushChatUpdate(msg);
  this.pushGameState();
}

Tta.prototype.initCardRow = function(){
  for (var i = 0; i < 13; i++){
    var newCard = this.civilDeck.drawCard();
    newCard.rowIndex = i;
    this.cardRow.push(newCard);
  }
}

Tta.prototype.initTurnCycle = function(){
  for (var i = 0; i < this.connectedPlayers.length; i++){
    this.turnCycle.push(this.connectedPlayers[i].username);
  }
}

Tta.prototype.passTurn = function(){
  //TODO rare corner case: empty blue bank
  var currentPlayer = this.Player[this.currentPlayer];

  var happiness = currentPlayer.happyFaces - currentPlayer.unhappyFaces;
  if (happiness + currentPlayer.popBank < 0){
    //TODO civil disorder!
  }

  //------FOOD/CONSUMPTION----- 
  var producedFood = 0, consumption = 0, netFood = 0; 
  for (var i = 0; i < currentPlayer.tech['Agriculture'].assignedPop; i++){
    currentPlayer.foodDistro[1]++;
    producedFood++;
  }
  if (currentPlayer.tech['Irrigation'] != null){
    for (var i = 0; i < currentPlayer.tech['Irrigation']
                                     .assignedPop; i++){
      currentPlayer.foodDistro[2]++;
      producedFood += 2;
    }
  }
  // TODO Selective Breeding and Mechanized Agriculture loops
  var i = 17;
  while (i > 1){
    if (currentPlayer.popBank < i) consumption++;
    i -= 4;
  }
  if (currentPlayer.popBank == 0) consumption = 6;
  netFood = producedFood - consumption;
  if (currentPlayer.food + netFood < 0){
    var foodDeficit = currentPlayer.food + netFood;
    var culturePenalty = foodDeficit*4;
    currentPlayer.culture -= culturePenalty;
    currentPlayer.food = 0;
  } // TODO bugfix: after culture penalty still pays consumption
  sortDistro(currentPlayer.foodDistro);
  this.spendBlues(consumption, currentPlayer.foodDistro);
  currentPlayer.food = this.bluesToNumber(currentPlayer.foodDistro); 
  var producedFoodNotice = this.currentPlayer 
                         + ' produced ' + netFood + ' food '
                         + '(' + producedFood + ' produced - '
                         + consumption + ' consumption).';
  this.pushChatUpdate({source:'system', text:producedFoodNotice});
  this.computeBlueBank();

  //------ORE/CORRUPTION----- 
  var producedOre = 0, corruption = 0, netOre = 0;
  for (var i = 0; i < currentPlayer.tech['Bronze'].assignedPop; i++){
    currentPlayer.oreDistro[1]++;
    producedOre++;
    currentPlayer.blueBank--; // or else corruption won't compute correctly
  }

  if (currentPlayer.blueBank < 9) corruption += 2;
  if (currentPlayer.blueBank < 5) corruption += 2;
  if (currentPlayer.blueBank == 0) corruption = 6;
  netOre = producedOre - corruption;

  if (currentPlayer.ore + netOre < 0){
    currentPlayer.ore = 0;
    for (denom in currentPlayer.oreDistro){
      currentPlayer.oreDistro[denom] = 0;
    }
    var msg = this.sysMsgfy(this.currentPlayer + ' had negative resources: reset to zero!'); 
    this.pushChatUpdate(msg);
    this.computeBlueBank();
    this.assignBlues();
  } else {
    sortDistro(currentPlayer.oreDistro);
    this.spendBlues(corruption, currentPlayer.oreDistro);
    currentPlayer.ore = this.bluesToNumber(currentPlayer.oreDistro);
    var producedOreNotice = this.currentPlayer
                          + ' produced ' + netOre + ' resources '
                          + '(' + producedOre + ' produced - '
                          + corruption + ' corruption).';
    this.pushChatUpdate({source:'system', text:producedOreNotice});
    this.computeBlueBank();
    this.assignBlues();
  }

  currentPlayer.tempMilitaryActions = 0;
  currentPlayer.tempMilitaryOre = 0;
  if (currentPlayer.leader != null){
    if (currentPlayer.leader.name == 'Homer'){
      currentPlayer.tempMilitaryOre = 1;
    }
  }
  currentPlayer.culture += currentPlayer.culturePerTurn;
  currentPlayer.science += currentPlayer.sciencePerTurn;
  currentPlayer.spentCivilActions = 0;
  currentPlayer.spentMilitaryActions = 0;

  // Draw military cards
  if (this.completedTurnCycles > 0){
    var numCards = currentPlayer.totalMilitaryActions;
    if (numCards > 3) numCards = 3;
    for (var i = 0; i < numCards; i++){
      var newCard = this.militaryDeck.drawCard();
      this.militaryHands[this.currentPlayer].push(newCard);
    }
    this.pushMilitaryHand(this.currentPlayer);
  }

  // unflag cards drafted this turn
  for (var i = 0; i < currentPlayer.civilHand.length; i ++){
    currentPlayer.civilHand[i].draftedThisTurn = false;
  }

  // pass the turn
  var turnPassedNotice = this.currentPlayer + ' has passed the turn.';

  this.turnCyclePosition++;
  if (this.turnCyclePosition > this.turnCycle.length - 1){
    this.turnCyclePosition = 0;
    this.completedTurnCycles++;
  }
  this.currentPlayer = this.turnCycle[this.turnCyclePosition];

  var msgData = {source:'system', text:turnPassedNotice};
  this.pushChatUpdate(msgData); 

  msgData.text = this.currentPlayer + "'s turn has begun.";
  this.pushChatUpdate(msgData);

  // BEGINNING OF NEW TURN

  //Update the card row
  if (this.completedTurnCycles != 0){
    var tempCardRow = [];
    var removeCardCount = 0;
    var numCycledCards = 5 - this.connectedPlayers.length;
    /*
    disabled for debugging
    */
    //removeCardCount += numCycledCards;
    //for (var i = 0; i < numCycledCards; i++){
      //this.cardRow.shift();
    //}
    while (this.cardRow.length != 0){
      var temp = this.cardRow.shift();
      if (!temp.drafted){
        tempCardRow.push(temp);
      } else {
        removeCardCount++;
      }
    }
    this.cardRow = tempCardRow;
    for (var i = 0; i < removeCardCount; i++){
      var newCard = this.civilDeck.drawCard();
      if (newCard == null){
        this.advanceAge(); 
        newCard = this.civilDeck.drawCard();
      } 
      this.cardRow.push(newCard);
    }
    for (var i = 0; i < this.cardRow.length; i++){
      this.cardRow[i].rowIndex = i;
    }
  }

  this.pushGameState();
  /*
  disabled for debugging
  */
  //this.pushGameState('turnCycle');
  
  if (this.completedTurnCycles > 1) {
    this.politicalPhase('political_phase');
  }

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

Tta.prototype.politicalPhase = function(flag){
  var currentPlayer = this.Player[this.currentPlayer];
  var socketId = currentPlayer.socketId; 
  this.connectedSockets[socketId].emit('political_phase', flag); 
}

Tta.prototype.advanceAge = function(){
  if (this.currentAge == 'A'){
    this.currentAge = 'I';
    this.civilDeck.initAgeI();
  }
}

Tta.prototype.spendBlues = function(target, resourceDistro, resource){
/*
Note: assumes that this is a valid spend
*/
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

Tta.prototype.computeBlueBank = function(){
    var currentPlayer = this.Player[this.currentPlayer];
    var nonBankBlues = 0;
    for (denom in currentPlayer.foodDistro){
      nonBankBlues += currentPlayer.foodDistro[denom];
    }
    for (denom in currentPlayer.oreDistro){
      nonBankBlues += currentPlayer.oreDistro[denom];
    }
    for (var i = 0; i < currentPlayer.wonders.length; i++){
      nonBankBlues += currentPlayer.wonders[i].assignedBlues;  
    }
    currentPlayer.blueBank = currentPlayer.totalBlues - nonBankBlues;
}

Tta.prototype.assignBlues = function(){
  // Convert food distro to tech card blues
  var currentPlayer = this.Player[this.currentPlayer];
  for (denom in currentPlayer.foodDistro){
    if (+denom === 1){
      currentPlayer.tech['Agriculture']
                   .assignedBlues = currentPlayer.foodDistro[denom];
    }
    if (+denom === 2){
      currentPlayer.tech['Irrigation']
                   .assignedBlues = currentPlayer.foodDistro[denom]; 
    }
    //TODO loops for the other farm techs
  }

  for (denom in this.Player[this.currentPlayer].oreDistro){
    if (+denom === 1){
      this.Player[this.currentPlayer]
          .tech['Bronze']
          .assignedBlues = this.Player[this.currentPlayer]
                               .oreDistro[denom];
    }
    //TODO loops for the other mine techs
  }
}

Tta.prototype.spendCivilAction = function(numActions){
  var civilActions = this.Player[this.currentPlayer].totalCivilActions;
  var spentActions = this.Player[this.currentPlayer].spentCivilActions;
  if (numActions == 0){
    return true;
  }
  if (numActions != null){
    spentActions += numActions;
  } else {
    spentActions++;
  }
  if (spentActions > civilActions){
    return false;
  }  
  if (numActions != null){
    this.Player[this.currentPlayer].spentCivilActions += numActions;
  } else {
    this.Player[this.currentPlayer].spentCivilActions++;
  }
  return true;
}

Tta.prototype.spendMilitaryAction = function(){
  var currentPlayer = this.Player[this.currentPlayer];
  var militaryActions = currentPlayer.totalMilitaryActions 
                      + currentPlayer.tempMilitaryActions;
  var spentActions = currentPlayer.spentMilitaryActions;

  spentActions++;
  if (spentActions > militaryActions){
    return false;
  }

  if (currentPlayer.tempMilitaryActions != 0){
    currentPlayer.tempMilitaryActions--;
  } else {
    currentPlayer.spentMilitaryActions++;
  }
  return true;
}

Tta.prototype.calculateStrength = function(){
  var currentPlayer = this.Player[this.currentPlayer];
  var strength = 0;
  for (distro in currentPlayer.militaryDistros){
    for (denom in currentPlayer.militaryDistros[distro]){
      strength += +denom*currentPlayer.militaryDistros[distro][+denom];   
    }
  }
  for (var i = 0; i < currentPlayer.miscStrengthSrcs.length; i++){
    strength += currentPlayer.miscStrengthSrcs[i];  
  }

  if (currentPlayer.leader != null){
    if (currentPlayer.leader.name == 'Alexander the Great'){
      for (denom in currentPlayer.militaryDistros['infantry']){
        strength += currentPlayer.militaryDistros['infantry'][+denom];  
      }
      for (denom in currentPlayer.militaryDistros['cavalry']){
        strength += currentPlayer.militaryDistros['cavalry'][+denom];
      }
    }

    if (currentPlayer.leader.name == 'Julius Caesar'){
      strength++;
    }
  }
  currentPlayer.militaryStrength = strength;
}

Tta.prototype.calculateCulturePerTurn = function(){
  var currentPlayer = this.Player[this.currentPlayer];
  var culturePerTurn = 0;

  for (var i = 0; i < currentPlayer.culturePerTurnSrcs.length; i++){
    culturePerTurn += currentPlayer.culturePerTurnSrcs[i];
  }

  if (currentPlayer.leader != null){
    if (currentPlayer.leader.name == 'Homer'){
      var validWarriors = currentPlayer.militaryDistros['infantry'][1];
      if (validWarriors > 2) validWarriors = 2;
      culturePerTurn += validWarriors;
    }
  }
  currentPlayer.culturePerTurn = culturePerTurn;
}

Tta.prototype.calculateSciencePerTurn = function(){
  var currentPlayer = this.Player[this.currentPlayer];
  var sciencePerTurn = 0;

  for (var i = 0; i < currentPlayer.sciencePerTurnSrcs.length; i++){
    sciencePerTurn += currentPlayer.sciencePerTurnSrcs[i];
  }

  // leaders such as leo and isaac newton
  
  currentPlayer.sciencePerTurn = sciencePerTurn;
}

Tta.prototype.increasePop = function(flag, foodRefund, handIndex){
  var frugality = false;
  if (flag == 'frugality') frugality = true;

  var currentPlayer = this.Player[this.currentPlayer];
  var cost = 2;
  if (currentPlayer.leader != null){
    if (currentPlayer.leader.name == 'Moses'){
      cost = 1;
    } 
  }
  var i = 17;
  while (i > 5){
    if (currentPlayer.popBank < i) cost++;
    i -= 4;
  }
  if (currentPlayer.popBank < 5) cost = 7;
  if (currentPlayer.food < cost){
    var msg = {source:'system',
               text:'Failed to increase population: not enough food!'};
    this.actionFailure(msg);
    return;
  } 
  if (currentPlayer.popBank == 0){
    var msg = {source:'system',
               text:'Failed to increase population: yellow bank empty!'};
    this.actionFailure(msg);
    return;
  }  
  var spendCivilAction = this.spendCivilAction();
  if (!spendCivilAction){
    var msg = {source:'system',
               text:'Failed to increase population: no civil actions!'};
    this.actionFailure(msg);
    return;
  }
  this.spendBlues(cost, currentPlayer.foodDistro, currentPlayer.food)
  currentPlayer.food = this.bluesToNumber(currentPlayer.foodDistro);
  this.computeBlueBank();
  this.assignBlues();

  currentPlayer.popBank--;
  var unhappyFaces = 0;
  if (currentPlayer.popBank < 17) unhappyFaces++;
  var j = 13;
  while (j > 0){
    if (currentPlayer.popBank < j) unhappyFaces++;
    j -= 2;
  }
  currentPlayer.unhappyFaces = unhappyFaces;
  currentPlayer.workerPool++;

  if (frugality){
    this.createResources(foodRefund, currentPlayer.foodDistro);
    currentPlayer.food = this.bluesToNumber(currentPlayer.foodDistro);
    this.computeBlueBank();
    this.assignBlues();
    
    currentPlayer.civilHand.splice(handIndex, 1);
    var msg = this.sysMsgfy(this.currentPlayer 
                          + ' increased population with Frugality.');
    this.pushChatUpdate(msg);
  } else {
    var msg = this.sysMsgfy(this.currentPlayer 
                          + ' increased population.');
    this.pushChatUpdate(msg);
  }

  this.pushGameState();
}

Tta.prototype.build = function(buildWhat, oreDiscount, ibsIndex, military){
  var currentPlayer = this.Player[this.currentPlayer];

  if (buildWhat == 'Philosophy' ||
      buildWhat == 'Alchemy' ||
      buildWhat == 'Scientific Method' ||
      buildWhat == 'Computers'){
    var maxLabs = currentPlayer.govTech.maxBuildings;
    if (currentPlayer.numBuildings['labs'] + 1 > maxLabs){
      var msg = this.sysMsgfy('Unable to build ' + buildWhat 
                              + ': too many labs! (Limit ' + maxLabs
                              + ' for this government type.)');
      this.actionFailure(msg);
      return;
    }
  }

  if (buildWhat == 'Religion' ||
      buildWhat == 'Theology' ||
      buildWhat == 'Organized Religion'){
    var maxTemples = currentPlayer.govTech.maxBuildings;
    if (currentPlayer.numBuildings['temples'] + 1 > maxTemples){
      var msg = this.sysMsgfy('Unable to build ' + buildWhat
                              + ': too many temples! (Limit ' + maxTemples
                              + ' for this government type.)');
      this.actionFailure(msg);
      return;
    }
  }

  var availableOre = currentPlayer.ore;
  var cost = currentPlayer.tech[buildWhat].oreCost;
  if (oreDiscount != 0){
    cost -= oreDiscount;
    if (cost < 0) cost = 0;
  }
  if (military && currentPlayer.tempMilitaryOre != 0){
    cost -= currentPlayer.tempMilitaryOre;
    currentPlayer.tempMilitaryOre = 0;
    if (cost < 0){
      currentPlayer.tempMilitaryOre -= cost;
      cost = 0;
    }
  }
  if (availableOre < cost){
    var msg = {source:'system',
               text:'Unable to build ' 
                    + buildWhat + ': not enough resources!'};
    this.actionFailure(msg);
    return;
  }
  if (!military){
    var spendCivilAction = this.spendCivilAction()
    if (!spendCivilAction){
      var msg = {source:'system',
                 text:'Failed to build ' 
                      + buildWhat + ': no civil actions!'};
      this.actionFailure(msg);
      return;
    }
  } 
  else {
    if (!this.spendMilitaryAction()){
      var msg = {source:'system',
                 text:'Failed to build ' 
                      + buildWhat + ': no military actions!'};
      this.actionFailure(msg);
      return;
    }
  }
  //this.sortDistro??
  this.spendBlues(cost, currentPlayer.oreDistro);
  currentPlayer.ore = this.bluesToNumber(currentPlayer.oreDistro);
  this.computeBlueBank();
  this.assignBlues();

  currentPlayer.workerPool--
  currentPlayer.tech[buildWhat].assignedPop++;
  this.triggerEffect(buildWhat, 'build');
  if (oreDiscount != 0){
    var card = currentPlayer.civilHand.splice(ibsIndex, 1)[0];
    var withWhat = ' with ' + card.name + '.';
    var msg = this.sysMsgfy(this.currentPlayer + ' built ' 
                                               + buildWhat
                                               + withWhat);
    this.pushChatUpdate(msg);
  } else {
    var msg = this.sysMsgfy(this.currentPlayer + ' built '
                            + buildWhat + '.');
    this.pushChatUpdate(msg);
  }
  this.pushGameState();
}

Tta.prototype.destroy = function(destroyWhat, military){
  if (!military){
    var spendCivilAction = this.spendCivilAction()
    if (!spendCivilAction){
      var msg = {source:'system',
                 text:'Failed to destroy ' 
                      + destroyWhat 
                      + ': no civil actions!'};
      this.actionFailure(msg);
      return;
    }
  } else {
    if (!this.spendMilitaryAction()){
      var msg = {source:'system',
                 text:'Failed to destroy ' 
                 + destroyWhat
                 + ': no military actions!'};
      this.actionFailure(msg);
      return;
    }
  }
  this.Player[this.currentPlayer].tech[destroyWhat].assignedPop--;
  this.Player[this.currentPlayer].workerPool++;
  this.triggerEffect(destroyWhat, 'destroy');
  this.pushGameState();
  var destroySomethingNotice = this.currentPlayer
                             + ' has destroyed a '
                             + destroyWhat + '.';
  var msgData = {source:'system', text:destroySomethingNotice};
  this.pushChatUpdate(msgData);
}

Tta.prototype.buildWonderStage = function(wonderIndex, 
                                          numActions, 
                                          costMod, 
                                          engGenIndex){
  var currentPlayer = this.Player[this.currentPlayer];
  for (var i = 0; i < currentPlayer.wonders[wonderIndex]
                                   .productionSteps
                                   .length; i++){
    if (!currentPlayer.wonders[wonderIndex].productionSteps[i].done){
      var cost = currentPlayer.wonders[wonderIndex]
                              .productionSteps[i]
                              .cost;
      cost -= costMod;
      if (cost < 0) cost = 0;
      if (currentPlayer.ore < cost){
        var msg = {source:'system',
                   text:'Unable to build stage of ' 
                      + currentPlayer.wonders[wonderIndex].name
                      + ': insufficient resources!'};
        this.actionFailure(msg);
        return;
      }
      if (!this.spendCivilAction(numActions)){
        var msg = {source:'system',
                   text:'Failure to build stage of '
                      + currentPlayer.wonders[wonderIndex].name
                      + ': no civil actions!'};
        this.actionFailure(msg);
        return;
      }
      this.spendBlues(cost, currentPlayer.oreDistro); 
      currentPlayer.ore = this.bluesToNumber(currentPlayer.oreDistro);
      currentPlayer.wonders[wonderIndex].productionSteps[i].done = true;
      currentPlayer.wonders[wonderIndex].assignedBlues++;
      this.computeBlueBank();
      this.assignBlues();
      
      if (costMod != 0){
        currentPlayer.civilHand.splice(engGenIndex, 1);
        var msg = this.sysMsgfy(this.currentPlayer + ' built a stage of '
                              + currentPlayer.wonders[wonderIndex].name
                              + ' with Engineering Genius.');
        this.pushChatUpdate(msg);
      } else {
        var msg = this.sysMsgfy(this.currentPlayer + ' built a stage of '
                              + currentPlayer.wonders[wonderIndex].name
                              + '.');
        this.pushChatUpdate(msg);
      }
      break;
    }
  }
  if (currentPlayer.wonders[wonderIndex]
                   .assignedBlues == currentPlayer.wonders[wonderIndex]
                                                  .productionSteps
                                                  .length){
    currentPlayer.wonders[wonderIndex].completed = true;  
    currentPlayer.wonders[wonderIndex].assignedBlues = 0;
    this.computeBlueBank();
    this.triggerEffect(currentPlayer.wonders[wonderIndex].name, 'build');
    var msg = {source:'system',
               text:this.currentPlayer + ' completed '
                  + currentPlayer.wonders[wonderIndex].name
                  + '.'};
    this.pushChatUpdate(msg);
  }
  this.pushGameState();
}

Tta.prototype.createResources = function(howMuch, resourceDistro){
  var denominations = [];
  for (denom in resourceDistro){
    denominations.push(+denom);
  }
  denominations.sort();
  var currentDenom = denominations.pop();
  while (howMuch != 0){
    howMuch -= currentDenom;
    resourceDistro[currentDenom]++;
    if (howMuch < 0){
      howMuch += denom;
      resourceDistro[currentDenom]--;
      currentDenom = denominations.pop();
    }
  }
}

Tta.prototype.draftCard = function(rowIndex){
  var currentPlayer = this.Player[this.currentPlayer];
  var actionCost = 1;
  if (rowIndex > 4) actionCost++;
  if (rowIndex > 8) actionCost++;

  if (this.cardRow[rowIndex].type == 'wonder'){
    for (var i = 0; i < currentPlayer.wonders.length; i++){
      if (!currentPlayer.wonders[i].completed){
        var msg = {source:'system',
                   text:"Can't take wonder: already one in progress!"};
        this.actionFailure(msg);
        return;
      }
    }
    actionCost += currentPlayer.wonders.length;
    if (!this.spendCivilAction(actionCost)){
      var msg = {source:'system',
                 text:'Unable to take wonder: not enough civil actions!'};
      this.actionFailure(msg);
      return;
    }
    var tempCard = this.cardRow[rowIndex];
    var transparentCard = tempCard;
    currentPlayer.wonders.push(tempCard);
    transparentCard.drafted = true;
    this.cardRow[rowIndex] = transparentCard;
    var msg = {source:'system',
               text:this.currentPlayer + ' took ' + tempCard.name
                                       + ' from the card row.'};
    this.pushChatUpdate(msg);
    this.pushGameState();
    return;
  } 

  if (currentPlayer.civilHand.length == currentPlayer.maxCivilHandSize){
    var msg = {source:'system',
                 text:'Unable to draft card: hand full!'};
    this.actionFailure(msg);
    return;
  }

  if (this.cardRow[rowIndex].type == 'leader'){
    if (currentPlayer.leader != null){
      if (currentPlayer.leader.age = this.cardRow[rowIndex].age){
        var msg = {source:'system',
                   text:'Unable to draft leader: already have leader!'};
        this.actionFailure(msg);
        return;
      }
    }

    for (var i = 0; i < currentPlayer.civilHand.length; i++){
      if (currentPlayer.civilHand[i].type == 'leader'){
        if (currentPlayer.civilHand[i].age == this.currentAge){
          var msg = {source:'system',
                     text:'Unable to draft leader: already have leader!'};
          this.actionFailure(msg);
          return;
        }
      }
    }
  }

  if (!this.spendCivilAction(actionCost)){
    var msg = {source:'system',
                 text:'Unable to draft card: not enough civil actions!'};
    this.actionFailure(msg);
    return;
  }

  var tempCard = this.cardRow[rowIndex];
  var transparentCard = tempCard;
  tempCard.draftedThisTurn = true;
  tempCard.rowIndex = rowIndex;
  currentPlayer.civilHand.push(tempCard);

  transparentCard.drafted = true;
  this.cardRow[rowIndex] = transparentCard;

  var msg = {source:'system',
             text:this.currentPlayer + ' took ' + tempCard.name
                                     + ' from the card row.'};
  this.pushChatUpdate(msg);
  this.pushGameState();

}

Tta.prototype.undraftCard = function(handIndex){

  var currentPlayer = this.Player[this.currentPlayer];
  var actionRefund = 1;
  var rowIndex = currentPlayer.civilHand[handIndex].rowIndex;
  if (rowIndex > 4) actionRefund++;
  if (rowIndex > 8) actionRefund++;
  currentPlayer.spentCivilActions -= actionRefund;  
  
  var tempCard = currentPlayer.civilHand.splice(handIndex, 1)[0];
  tempCard.drafted = false;
  tempCard.draftedThisTurn = false;
  tempCard.handIndex = null;
  this.cardRow[tempCard.rowIndex] = tempCard;
  var msg = {source:'system',
             text:this.currentPlayer + ' put ' + tempCard.name
                                     + ' back in the card row.'};
  this.pushChatUpdate(msg);
  this.pushGameState();

}

Tta.prototype.playCivilCard = function(handIndex){
  if (this.completedTurnCycles == 0){
    var msg = this.sysMsgfy('Cannot play card: still turn 0!');
    this.actionFailure(msg);
    return;
  }

  if (!this.spendCivilAction()){
    var msg = this.sysMsgfy('Cannot play card: no civil actions!');
    this.actionFailure(msg);
    return;
  }

  var currentPlayer = this.Player[this.currentPlayer];
  var whichCard = currentPlayer.civilHand[handIndex];

  if (whichCard.type == 'leader'){
    currentPlayer.leader = whichCard;
    currentPlayer.civilHand.splice(handIndex, 1);
    this.triggerEffect(whichCard.name, 'build');
    var msg = this.sysMsgfy(this.currentPlayer + ' has elected ' 
                                               + whichCard.name);
    this.pushChatUpdate(msg);
    this.pushGameState();
    return;
  } else if (whichCard.type == 'yellow'){
    if (whichCard.draftedThisTurn){
      var msg = this.sysMsgfy('Unable to play card: drafted this turn!');
      currentPlayer.spentCivilActions--;
      this.actionFailure(msg);
      return;
    }
    this.yellowCards(whichCard);
    return;
  } 
}

Tta.prototype.discoverTech = function(handIndex, flag, breakthroughIndex){

  var currentPlayer = this.Player[this.currentPlayer];
  var whichTech = currentPlayer.civilHand[handIndex];
  
  if (whichTech.scienceCost > currentPlayer.science){
    var msg = this.sysMsgfy('Insufficient science to discover ' + whichTech.name + '!');
    this.actionFailure(msg);
    return;
  }

  if (currentPlayer.leader == null || 
     (currentPlayer.leader != null && 
      currentPlayer.leader.name != 'Isaac Newton')
     ){
    if (!this.spendCivilAction()){
      var msg = this.sysMsgfy('Cannot discover ' + whichTech.name + ': insufficient civil actions!');
      this.actionFailure(msg);
      return;
    }
  }

  if (whichTech.name == 'Irrigation'){
    var tech = new Tech('Irrigation', 0, 4, 3, 'farmOrMine', 'farm');
    currentPlayer.tech['Irrigation'] = tech;
    currentPlayer.foodDistro[2] = 0;
  }

  var msg = techDiscoverMsg(this.currentPlayer, whichTech.name);
  if (flag == 'breakthrough'){
    var scienceRefund = currentPlayer.civilHand[breakthroughIndex]
                                     .scienceRefund;
    currentPlayer.science += scienceRefund;
    msg = msg.slice(0, -1);
    msg = msg + ' with Breakthrough and got refunded ' 
              + scienceRefund 
              + ' science.';
    currentPlayer.civilHand[breakthroughIndex] = null;
  } 
  
  msg = this.sysMsgfy(msg);
  this.pushChatUpdate(msg);
  currentPlayer.science -= currentPlayer.civilHand[handIndex].scienceCost;
  currentPlayer.civilHand[handIndex] = null;
  var tempHand = [];
  for (var i = 0; i < currentPlayer.civilHand.length; i++){
    if (currentPlayer.civilHand[i] != null){
      tempHand.push(currentPlayer.civilHand[i]);
    }
  }
  currentPlayer.civilHand = tempHand;
  this.pushGameState();
  
  function techDiscoverMsg(currentPlayer, whichTech){
    var returnThis = currentPlayer + ' discovered ' + whichTech + '.';
    return returnThis;
  }

}

Tta.prototype.actionFailure = function(msg){
  this.pushGameState(this.currentPlayer);
  this.connectedSockets[this.Player[this.currentPlayer].socketId]
      .emit('chat_update', msg, 'action_failure');
}

Tta.prototype.sysMsgfy = function(textOfMessage){
  var msg = {source:'system', text:textOfMessage}
  return msg;
}

Tta.prototype.pushChatUpdate = function(msgData){
  for (i in this.connectedSockets){
    this.connectedSockets[i].emit('chat_update', msgData);
  }
}

Tta.prototype.pushGameState = function(flag){
  var turnCycle = false;
  if (flag == 'turnCycle') turnCycle = true;

  var gameState = new Object();
  gameState.firstPlayer = this.firstPlayer;
  gameState.currentPlayer = this.currentPlayer;
  gameState.completedTurnCycles = this.completedTurnCycles;
  gameState.Player = this.Player;
  gameState.cardRow = this.cardRow;
  gameState.currentAge = this.currentAge;
  var json_gameState = JSON.stringify(gameState);

  if (flag != null && !turnCycle){
    var targetSocket = this.Player[flag].socketId;
    this.connectedSockets[targetSocket].emit('game_state_update', 
                                              json_gameState);
  }
  
  if (turnCycle){
    for (i in this.connectedSockets){
      this.connectedSockets[i].emit('turn_cycle', 
                                    json_gameState,
                                    this.completedTurnCycles);
    }
  } else {
    for (i in this.connectedSockets){
      this.connectedSockets[i].emit('game_state_update', json_gameState);
    }
  }
}

Tta.prototype.pushMilitaryHand = function(player){
  var socketId = this.Player[player].socketId;
  var JSON_militaryHand = JSON.stringify(this.militaryHands[player]);
  this.connectedSockets[socketId].emit('military_hand_update', 
                                     JSON_militaryHand);
}

Tta.prototype.yellowCards = function(whatCard, source, target){
  var currentPlayer = this.Player[this.currentPlayer];
  var cardIndex = currentPlayer.civilHand.indexOf(whatCard);
  if (whatCard.name == 'Work of Art'){
    currentPlayer.culture += whatCard.cultureBonus;  
    currentPlayer.civilHand.splice(cardIndex, 1);
    var msg = this.sysMsgfy(this.currentPlayer 
                          + ' played Work of Art.');
    this.pushChatUpdate(msg);
    this.pushGameState();
  }
  if (whatCard.name == 'Revolutionary Idea'){
    currentPlayer.science += whatCard.scienceBonus;
    currentPlayer.civilHand.splice(cardIndex, 1);
    var msg = this.sysMsgfy(this.currentPlayer
                          + ' played Revolutionary Idea.');
    this.pushChatUpdate(msg);
    this.pushGameState();
  }
  if (whatCard.name == 'Engineering Genius'){
    var wonderIndex;
    for (var i = 0; i < currentPlayer.wonders.length; i++){
      if (currentPlayer.wonders[i].completed == false){
        wonderIndex = i;
        break;
      }
    }
    if (wonderIndex == null){
      var msg = this.sysMsgfy('Cannot play card: no active wonders!');
      currentPlayer.spentCivilActions--;
      this.actionFailure(msg);
      return;
    }
    this.buildWonderStage(wonderIndex, 
                          0, 
                          whatCard.oreDiscount, 
                          cardIndex);
  }
  if (whatCard.name == 'Frugality'){
    this.increasePop('frugality', whatCard.foodRefund, cardIndex);
  }
  if (whatCard.name == 'Patriotism'){
    currentPlayer.tempMilitaryActions++;
    currentPlayer.tempMilitaryOre += whatCard.tempMilitaryOre;
    currentPlayer.civilHand.splice(cardIndex, 1);
    var msg = this.sysMsgfy(this.currentPlayer + ' played Patriotism.');
    this.pushChatUpdate(msg);
    this.pushGameState();
  }
  if (whatCard.name == 'Bountiful Harvest'){
    this.createResources(whatCard.foodBonus, currentPlayer.foodDistro);
    currentPlayer.food = this.bluesToNumber(currentPlayer.foodDistro);
    this.computeBlueBank();
    this.assignBlues();
    currentPlayer.civilHand.splice(cardIndex, 1);
    var msg = genericNote(this.currentPlayer, whatCard);
    msg = msg + ' and gained ' + whatCard.foodBonus + ' food.';
    msg = this.sysMsgfy(msg);
    this.pushChatUpdate(msg);
    this.pushGameState();
  }
  if (whatCard.name == 'Mineral Deposits'){
    this.createResources(whatCard.oreBonus, currentPlayer.oreDistro);
    currentPlayer.ore = this.bluesToNumber(currentPlayer.oreDistro);
    this.computeBlueBank();
    this.assignBlues();
    currentPlayer.civilHand.splice(cardIndex, 1);
    var msg = genericNote(this.currentPlayer, whatCard);
    msg = msg + ' and gained ' + whatCard.oreBonus + ' resources.';
    msg = this.sysMsgfy(msg);
    this.pushChatUpdate(msg);
    this.pushGameState();
  }
  function genericNote(currentPlayer, whatCard){
    var returnThis = currentPlayer 
                + ' played ' 
                + whatCard.name 
                + ' (' 
                + whatCard.age + ') ';
    return returnThis;
  }

}

Tta.prototype.triggerEffect = function(whatCard, whatAction){
  var currentPlayer = this.Player[this.currentPlayer];
    if (whatCard == 'Philosophy'){
      if (whatAction == 'build'){
        currentPlayer.sciencePerTurnSrcs.push(1);
        this.calculateSciencePerTurn();
        currentPlayer.numBuildings['labs']++;
      }
      if (whatAction == 'destroy'){
        removeScienceSource(1); 
        this.calculateSciencePerTurn();
        currentPlayer.numBuildings['labs']--;
      }
    }
    if (whatCard == 'Religion'){
      if (whatAction == 'build'){
        currentPlayer.happyFaces++;
        currentPlayer.culturePerTurnSrcs.push(1);
        this.calculateCulturePerTurn();
        currentPlayer.numBuildings['temples']++;
      }
      if (whatAction == 'destroy'){
        currentPlayer.happyFaces--;
        removeCultureSource(1);
        this.calculateCulturePerTurn();
        currentPlayer.numBuildings['temples']--;
      }
    }
    if (whatCard == 'Warrior'){
      if (whatAction == 'build'){
        currentPlayer.militaryDistros['infantry'][1]++;
        this.calculateStrength();
        this.calculateCulturePerTurn(); //pretty much just for Homer
      }
      if (whatAction == 'destroy'){
        currentPlayer.militaryDistros['infantry'][1]--;
        this.calculateStrength();
        this.calculateCulturePerTurn();
      }
    }
    if (whatCard == 'Pyramids'){
      if (whatAction == 'build'){
        currentPlayer.totalCivilActions++;
        currentPlayer.maxCivilHandSize++;
      }
      if (whatAction == 'destroy'){
        currentPlayer.totalCivilActions--;
        currentPlayer.maxCivilHandSize--;
      }
    }
    if (whatCard == 'Library of Alexandria'){
      if (whatAction == 'build'){
        currentPlayer.sciencePerTurnSrcs.push(1);
        this.calculateSciencePerTurn();
        currentPlayer.culturePerTurnSrcs.push(1);
        this.calculateCulturePerTurn();
        currentPlayer.maxCivilHandSize++;
        currentPlayer.maxMilitaryHandSize++;
      }
      if (whatAction == 'destroy'){
        removeScienceSource(1); 
        this.calculateSciencePerTurn();
        removeCultureSource(1);
        this.calculateCulturePerTurn();
        currentPlayer.maxCivilHandSize--;
        currentPlayer.maxMilitaryHandSize--;
      } 
    }
    if (whatCard == 'Colossus'){
      if (whatAction == 'build'){
        currentPlayer.miscStrengthSrcs.push(1);
        this.calculateStrength();
        currentPlayer.colonyBonus++;
        currentPlayer.culturePerTurnSrcs.push(1);
        this.calculateCulturePerTurn();
      }
      if (whatAction == 'destroy'){
        removeStrenthSource(1);
        this.calculateStrength();
        currentPlayer.colonyBonus--;
        removeCultureSource(1);
        this.calculateCulturePerTurn();
        currentPlayer.culturePerTurn--;
      }
    }
    if (whatCard == 'Hanging Gardens'){
      if (whatAction == 'build'){
        currentPlayer.culturePerTurnSrcs.push(1);
        this.calculateCulturePerTurn();
        currentPlayer.happyFaces += 2;
      }
      if (whatAction == 'destroy'){
        removeCultureSource(1);
        this.calculateCulturePerTurn();
        currentPlayer.happyFaces -= 2;
      }
    }
    if (whatCard == 'Julius Caesar'){
      if (whatAction == 'build'){
        this.calculateStrength();
        currentPlayer.totalMilitaryActions++;
        currentPlayer.maxMilitaryHandSize++;
      }
      if (whatAction == 'destroy'){
        this.calculateStrength();
        currentPlayer.totalMilitaryActions--;
        currentPlayer.maxMilitaryHandSize--;
      }
    }
/*
    if (whatCard == 'Moses'){
      // Effect under this.increasePop(); 
    }
*/
    if (whatCard == 'Hammurabi'){
      if (whatAction == 'build'){
        currentPlayer.totalCivilActions++;
        currentPlayer.maxCivilHandSize++;
        currentPlayer.totalMilitaryActions--;
        currentPlayer.maxMilitaryHandSize--;
      }
      if (whatAction == 'destroy'){
        currentPlayer.totalCivilActions--;
        currentPlayer.maxCivilHandSize--;
        currentPlayer.totalMilitaryActions--;
        currentPlayer.maxMilitaryHandSize--;
      }
    }
    if (whatCard == 'Alexander the Great'){
      this.calculateStrength();
    }
    if (whatCard == 'Homer'){
      if (whatAction == 'build'){
        this.calculateCulturePerTurn();
        currentPlayer.tempMilitaryOre++;
      }
      if (whatAction == 'destroy'){
        this.calculateCulturePerTurn();
        // kill leaders end of age after homer produces temp ore
        currentPlayer.tempMilitaryOre--; 
      }
    }

  function removeCultureSource(size){
    for (var i = 0; i < currentPlayer.culturePerTurnSrcs.length; i++){
      if (currentPlayer.culturePerTurnSrcs[i] == size){
        currentPlayer.culturePerTurnSrcs.splice(i, 1);
        break;
      }
    }
  }

  function removeScienceSource(size){
    for (var i = 0; i < currentPlayer.sciencePerTurnSrcs.length; i++){
      if (currentPlayer.sciencePerTurnSrcs[i] == size){
        currentPlayer.sciencePerTurnSrcs.splice(i, 1);
        break;
      }
    }
  }

  function removeStrengthSource(size){
    for (var i = 0; i < currentPlayer.miscStrengthSrcs.length; i++){
      if (currentPlayer.miscStrengthSrcs[i] == size){
        currentPlayer.miscStrengthSrcs.splice(i, 1);
        break;
      }
    }
  }
}

// Political Phase!
Tta.prototype.updateMilitaryHand = function(militaryHand, discardedCards){
  militaryHand = JSON.parse(militaryHand);
  discardedCards = JSON.parse(discardedCards);
  for (var i = 0; i < discardedCards.length; i++){
    this.militaryDeck.discardedCards.push(discardedCards.pop());
  }
  this.militaryHands[this.currentPlayer] = militaryHand;
}

Tta.prototype.playEvent = function(handIndex){
  var eventCard = this.militaryHands[this.currentPlayer]
                      .splice(handIndex, 1)[0]
  this.pushMilitaryHand(this.currentPlayer);
  this.militaryDeck.futureEvents.push(eventCard);

  var msg = this.sysMsgfy(this.currentPlayer + ' played an event.');
  this.pushChatUpdate(msg);

  var triggeredEvent = this.militaryDeck.currentEvents.pop();
  this.triggerEventEffect(triggeredEvent);
  this.groupPolitical(null, triggeredEvent);
  if (triggeredEvent.evalFlag){
    this.MiniGame.pushGameState();
  }
}

Tta.prototype.groupPolitical = function(targets, card){
  var json_card = JSON.stringify(card);

  if (targets == null){

    for (i in this.connectedSockets){
      this.connectedSockets[i].emit('group_political', json_card);
    }

  }
}

Tta.prototype.triggerEventEffect = function(whichEventCard){
  if (whichEventCard.name == 'Development of Agriculture'){
    var savedCurrentPlayer = this.currentPlayer; 
    for (var i = 0; i < this.turnCycle.length; i++){
      this.currentPlayer = this.turnCycle[i];
      var _currentPlayer = this.Player[this.currentPlayer];
      this.createResources(2, _currentPlayer.foodDistro);
      _currentPlayer.food = this.bluesToNumber(_currentPlayer.foodDistro);
      this.computeBlueBank();
      this.assignBlues();
    }
    this.currentPlayer = savedCurrentPlayer;
    updatePlayers(this.currentPlayer, whichEventCard.name, this);
  }

  if (whichEventCard.name == 'Development of Crafts'){
    var savedCurrentPlayer = this.currentPlayer;
    for (var i = 0; i < this.turnCycle.length; i++){
      this.currentPlayer = this.turnCycle[i];
      var _currentPlayer = this.Player[this.currentPlayer];
      this.createResources(2, _currentPlayer.oreDistro);
      _currentPlayer.ore = this.bluesToNumber(_currentPlayer.oreDistro);
      this.computeBlueBank();
      this.assignBlues();
    }
    this.currentPlayer = savedCurrentPlayer;
    updatePlayers(this.currentPlayer, whichEventCard.name, this);
  }

  if (whichEventCard.name == 'Development of Markets'){
    this.MiniGame.initMiniGame(whichEventCard.name, this.currentPlayer);
  }

  if (whichEventCard.name == 'Development of Politics'){
    var savedCurrentPlayer = this.currentPlayer;
    for (var i = 0; i < this.turnCycle.length; i++){
      this.currentPlayer = this.turnCycle[i];
      for (var j = 0; j < 3; j++){
        var newCard = this.militaryDeck.drawCard();
        this.militaryHands[this.currentPlayer].push(newCard);
      }
      this.pushMilitaryHand(this.currentPlayer);
    }
    this.currentPlayer = savedCurrentPlayer;
    updatePlayers(this.currentPlayer, whichEventCard.name, this);
  }

  if (whichEventCard.name == 'Development of Religion'){
    this.MiniGame.initMiniGame(whichEventCard.name, this.currentPlayer);
  }

  if (whichEventCard.name == 'Development of Science'){
    var savedCurrentPlayer = this.currentPlayer;
    for (var i = 0; i < this.turnCycle.length; i++){
      this.currentPlayer = this.turnCycle[i];
      var _currentPlayer = this.Player[this.currentPlayer];
      _currentPlayer.science += 2;
    }
    this.currentPlayer = savedCurrentPlayer;
    updatePlayers(this.currentPlayer, whichEventCard.name, this);
  }

  if (whichEventCard.name == 'Development of Settlement'){
    var savedCurrentPlayer = this.currentPlayer;
    for (var i = 0; i < this.turnCycle.length; i++){
      this.currentPlayer = this.turnCycle[i];
      var _currentPlayer = this.Player[this.currentPlayer];
      _currentPlayer.popBank--;
      var unhappyFaces = 0;
      if (_currentPlayer.popBank < 17) unhappyFaces++;
      var j = 13;
      while (j > 0){
        if (_currentPlayer.popBank < j) unhappyFaces++;
        j -= 2;
      }
      _currentPlayer.unhappyFaces = unhappyFaces;
      _currentPlayer.workerPool++;
    }
    this.currentPlayer = savedCurrentPlayer;
    updatePlayers(this.currentPlayer, whichEventCard.name, this);
  }

  if (whichEventCard.name == 'Development of Trade Routes'){
    var savedCurrentPlayer = this.currentPlayer;
    for (var i = 0; i < this.turnCycle.length; i++){
      this.currentPlayer = this.turnCycle[i];
      var _currentPlayer = this.Player[this.currentPlayer];
      _currentPlayer.science++;
      this.createResources(1, _currentPlayer.oreDistro);
      this.createResources(1, _currentPlayer.foodDistro);
      _currentPlayer.food = this.bluesToNumber(_currentPlayer.foodDistro);
      _currentPlayer.ore = this.bluesToNumber(_currentPlayer.oreDistro);
      this.computeBlueBank();
      this.assignBlues();
    }
    this.currentPlayer = savedCurrentPlayer;
    updatePlayers(this.currentPlayer, whichEventCard.name, this);
  }

  if (whichEventCard.name == 'Development of Warfare'){
    this.MiniGame.initMiniGame(whichEventCard.name, this.currentPlayer);
  }

  if (whichEventCard.name == 'No Event'){
    updatePlayers(this.currentPlayer, whichEventCard.name, this);
  }

  function updatePlayers(currentPlayer, whichEventCard, _this){
    var msg = _this.sysMsgfy(currentPlayer 
                            + ' revealed ' 
                            + whichEventCard
                            + '.');
    _this.pushChatUpdate(msg);
    _this.pushGameState();
  }

}

Tta.prototype.politicalDecision = 
function(miniGame, decisionIndex, socketId){
  var playerName;
  for (var i = 0; i < this.connectedPlayers.length; i++){
    if (socketId == this.connectedPlayers[i].socketId){
      playerName = this.connectedPlayers[i].username;
    }
  }
  if (this.MiniGame.checkIn(miniGame, 
                            decisionIndex, 
                            playerName, 
                            socketId)){
    if (miniGame == 'Development of Markets'){
      var gameResult = this.MiniGame.results;
      var savedCurrentPlayer = this.currentPlayer;
      for (var i = 0; i < gameResult.length; i++){
        this.currentPlayer = gameResult[i].player;
        var _currentPlayer = this.Player[this.currentPlayer];
        if (gameResult[i].decision == 0){
          this.createResources(2, _currentPlayer.oreDistro);
          _currentPlayer.ore = this.bluesToNumber(_currentPlayer.oreDistro);
          this.computeBlueBank();
          this.assignBlues();
        } else {
          this.createResources(2, _currentPlayer.foodDistro);
          _currentPlayer.food = this.bluesToNumber(_currentPlayer.foodDistro);
          this.computeBlueBank();
          this.assignBlues();
        }
      }
      this.currentPlayer = savedCurrentPlayer;
      var msg = this.sysMsgfy(this.currentPlayer 
                            + ' revealed ' 
                            + miniGame + '.');
      this.pushChatUpdate(msg);
      this.pushGameState();
    }
  
    if (miniGame == 'Development of Religion'){
      var results = this.MiniGame.results;
      var savedCurrentPlayer = this.currentPlayer;

      for (var i = 0; i < results.length; i++){
        this.currentPlayer = results[i].player;
        var _currentPlayer = this.Player[this.currentPlayer];
        if (results[i].decision == 0){
          var maxTemples = _currentPlayer.govTech.maxBuildings;
          if (_currentPlayer.numBuildings['temples'] + 1 > maxTemples){
            var msg = this.sysMsgfy(function(){/*
            No free temple: you already have the max amount of temples!
            */}.toString().slice(14, -3));
            this.actionFailure(msg);
          } else {
            _currentPlayer.workerPool--;
            _currentPlayer.tech['Religion'].assignedPop++;
            this.triggerEffect('Religion', 'build');
          }
        }
      }
      this.currentPlayer = savedCurrentPlayer;
      var msg = this.sysMsgfy(this.currentPlayer 
                            + ' revealed ' 
                            + miniGame + '.');
      this.pushChatUpdate(msg);
      this.pushGameState();
    }

    if (miniGame == 'Development of Warfare'){
      var results = this.MiniGame.results;
      var savedCurrentPlayer = this.currentPlayer

      for (var i = 0; i < results.length; i++){
        this.currentPlayer = results[i].player;
        var _currentPlayer = this.Player[this.currentPlayer];
        if (results[i].decision == 0){
          _currentPlayer.workerPool--;
          _currentPlayer.tech['Warrior'].assignedPop++;
          this.triggerEffect('Warrior', 'build');
        }
      }
      this.currentPlayer = savedCurrentPlayer;
      var msg = this.sysMsgfy(this.currentPlayer 
                            + ' revealed ' 
                            + miniGame + '.');
      this.pushChatUpdate(msg);
      this.pushGameState();
    }

  }
}

// Tech class
function Tech(name, assignedPop, oreCost, sciCost, type, subtype){
  this.name = name;
  this.assignedPop = assignedPop;
  this.oreCost = oreCost;
  this.sciCost = sciCost;
  this.type = type;
  this.subtype = subtype;
  this.assignedBlues = 0;
}

// GovTech class
function GovTech(name, numWhites, numReds, maxBuildings, sciCost){
  this.name = name;
  this.numWhites = numWhites;
  this.numReds = numReds;
  this.maxBuildings = maxBuildings;
  this.sciCost = sciCost;
}

module.exports = Tta;
