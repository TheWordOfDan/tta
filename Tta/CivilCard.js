/*

CivilCard.js
by Dan

*/

// Civil card class
function CivilCard(name, type, age){
  this.name = name;
  this.type = type;
  this.age = age;
  this.rowIndex;
  this.handIndex;
  this.drafted = false;
  this.draftedThisTurn = false;
  this.civilActionCost;
}

module.exports = CivilCard;
