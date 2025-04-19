// Classes
class Card {
  constructor(suit, value) {
    this.suit = suit;
    this.value = value;
  }

  getTitle() {
    return `${faceValuesNames[this.value]} of ${capitalizeFirstLetter(
      this.suit
    )}s`;
  }

  getDescription() {
    switch (this.suit) {
      case "spade":
      case "club":
        return `Deals ${this.value} damage. Weapon needs at least ${
          this.value + 1
        } durability to be used. Reduces weapon durability to ${this.value}.`;
      case "diamond":
        return `Weapon with ${this.value} attack. Durability will be reduced when used with a monster.`;
      case "heart":
        return `Restores up to ${this.value} health. Potions can only be used once per room.`;
    }
  }

  getType() {
    switch (this.suit) {
      case "spade":
      case "club":
        return "monster";
      case "diamond":
        return "weapon";
      case "heart":
        return "potion";
    }
  }

  toCardFace() {
    return `${faceValues[this.value] || this.value}\n${suitsNames[this.suit]}`;
  }
}

class Weapon extends Card {
  constructor(suit, value, isEquipped) {
    super(suit, value);
    this.isEquipped = isEquipped;
    this.durability = MAX_WEAPON_DURABILITY;
  }

  getDescription() {
    return `Weapon with ${this.value} attack. Current durability is ${this.durability}.`;
  }
}

// Constants
const suits = ["spade", "club", "heart", "diamond"];
const faceValues = {
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};
const suitsNames = {
  spade: "♠",
  club: "♣",
  heart: "♥",
  diamond: "♦",
};
const faceValuesNames = {
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
  10: "Ten",
  11: "Jack",
  12: "Queen",
  13: "King",
  14: "Ace",
};
const MAX_WEAPON_DURABILITY = 15;
const MAX_HEALTH = 20;
const OVERLAP_MARGIN_MAP = [1, 1, 1, 1, -24, -36, -43, -48, -51, -53];

const healthEl = document.getElementById("health");
const cardCounterEl = document.getElementById("card-counter");
const weaponEl = document.getElementById("weapon");
const weaponMonstersEl = document.getElementById("weapon-monsters");

const cardDetails = document.getElementById("card-details");
const cardNameEl = document.getElementById("card-name");
const cardTypeEl = document.getElementById("card-type");
const cardDescriptionEl = document.getElementById("card-description");
const cardPrimaryActionEl = document.getElementById("primary-action");
const cardSecondaryActionEl = document.getElementById("secondary-action");

const roomEl = document.getElementById("room");
const logEl = document.getElementById("log");
const runBtn = document.getElementById("run-button");

// Game state
let deck = [];
let health = MAX_HEALTH;
let weapon = null;
let weaponChain = [];
let canDrinkPotion = true;
let currentRoom = [];
let canRun = true;
let isGameOver = false;

// Utility functions
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Debugging functions
function overrideCurrentRoom() {
  currentRoom = [
    new Card("spade", 14),
    new Card("club", 13),
    new Card("spade", 12),
    new Card("diamond", 10),
  ];

  renderRoom();
}

function overrideWeaponChain() {
  weapon = new Weapon("spade", 10, true);

  weaponChain = [
    new Card("spade", 14),
    new Card("club", 13),
    new Card("spade", 12),
    new Card("diamond", 10),
    new Card("diamond", 10),
    new Card("diamond", 10),
    new Card("diamond", 10),
  ];

  updateUI();
}

function increaseWeaponChain() {
  weapon = new Weapon("spade", 10, true);

  weaponChain.push(new Card("diamond", 10));

  updateUI();
}

function buildDeck() {
  for (let i = 2; i <= 14; i++) {
    for (let suit of suits) {
      if (suit === "heart" && i <= 10) {
        deck.push(new Card(suit, i));
      } else if (suit === "diamond" && i <= 10) {
        deck.push(new Card(suit, i));
      } else if (suit === "spade" || suit === "club") {
        deck.push(new Card(suit, i));
      }
    }
  }
  deck = shuffle(deck);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Draws the room cards from the deck and renders it
 */
function drawRoom() {
  currentRoom = deck.splice(0, 4);
  cardCounterEl.textContent = `${deck.length}`;
  if (deck.length === 0) {
    cardCounterEl.classList.remove("back");
    cardCounterEl.classList.add("empty");
  }
  renderRoom();
}

/**
 * Renders the cards in the current room
 */
function renderRoom() {
  roomEl.innerHTML = "";
  currentRoom.forEach((card) => {
    const el = createCardElement(card);
    el.onclick = () => showCardDescription(card);
    roomEl.appendChild(el);
  });
  const emptyCardCount = 4 - currentRoom.length;
  for (let i = 0; i < emptyCardCount; i++) {
    const emptyCard = createEmptyCardElement();
    roomEl.appendChild(emptyCard);
  }
}

/**
 * Creates a card element with a suit and value
 * @param {Card} card
 * @returns card element
 */
function createCardElement(card) {
  const el = document.createElement("div");
  el.classList.add("card");
  el.classList.add(card.suit);
  el.innerText = card.toCardFace();
  return el;
}

/**
 * Creates an empty card element
 * @returns card element
 */
function createEmptyCardElement() {
  const el = document.createElement("div");
  el.classList.add("card");
  el.classList.add("empty");
  return el;
}

function showCardDescription(card) {
  if (!card) return;
  if (isGameOver) return;

  const type = card.getType();

  // reset actions visibility
  cardPrimaryActionEl.style.display = "block";
  cardSecondaryActionEl.style.display = "block";

  cardNameEl.textContent = card.getTitle();
  cardTypeEl.textContent = capitalizeFirstLetter(card.getType());
  cardDescriptionEl.textContent = card.getDescription();
  cardDetails.style.display = "flex";

  if (type === "monster") {
    cardPrimaryActionEl.textContent = "Fight barehanded";
    cardPrimaryActionEl.onclick = () => fightMonster(card, true);
    cardSecondaryActionEl.textContent = "Fight with weapon";
    cardSecondaryActionEl.onclick = () => fightMonster(card, false);

    // hide secondary action if weapon cannot be used
    if (!weapon || weapon.durability <= card.value) {
      cardSecondaryActionEl.style.display = "none";
    }
  }
  if (type === "weapon") {
    cardPrimaryActionEl.textContent = "Equip";
    cardPrimaryActionEl.onclick = () => equipWeapon(card);

    // hide action if weapon is already equipped
    if (card.isEquipped) {
      cardPrimaryActionEl.style.display = "none";
    }
    // no secondary action
    cardSecondaryActionEl.style.display = "none";
  }
  if (type === "potion") {
    cardPrimaryActionEl.textContent = canDrinkPotion ? "Drink" : "Discard";
    cardPrimaryActionEl.onclick = () => drinkPotion(card);

    // no secondary action
    cardSecondaryActionEl.style.display = "none";
  }
}

function showHealthDescription() {
  cardNameEl.textContent = "20-sided die";
  cardTypeEl.textContent = "Health";
  cardDescriptionEl.textContent = "Shows your health points. Capped at 20.";
  cardDetails.style.display = "flex";

  // no actions
  cardPrimaryActionEl.style.display = "none";
  cardSecondaryActionEl.style.display = "none";
}

function showDeckDescription() {
  cardNameEl.textContent = "Deck of cards";
  cardTypeEl.textContent = "Dungeon";
  cardDescriptionEl.textContent = "The source of all cards. Defeat all monsters to win.";
  cardDetails.style.display = "flex";

  // no actions
  cardPrimaryActionEl.style.display = "none";
  cardSecondaryActionEl.style.display = "none";
}

// Player actions
function fightMonster(card, isBarehanded) {
  if (isGameOver) return;
  if (!card) return;

  const type = card.getType();

  if (type !== "monster") {
    log("You can't fight that!");
    return;
  }

  if (isBarehanded) {
    const didSurvive = takeDamage(excess);
    if (!didSurvive) return;
    log(`Fought ${card.getTitle()} barehanded and took ${card.value} damage.`);
  } else {
    if (!weapon) {
      log("Please equip a weapon first.");
      return;
    }

    if (weapon.durability <= card.value) {
      const didSurvive = takeDamage(excess);
      if (!didSurvive) return;
      log(
        `Not enough durability! Fought barehanded and took ${card.value} damage.`
      );
      return;
    }

    log(`Defeated the ${card.getTitle()}.`);
    weaponChain.push(card);
    const excess = card.value - weapon.value;
    if (excess > 0) {
      const didSurvive = takeDamage(excess);
      if (!didSurvive) return;
      log(`Defeated the ${card.getTitle()}, but took ${excess} excess damage.`);
    }
    weapon.durability = card.value;
  }

  playCard(card);
}

function equipWeapon(card) {
  if (isGameOver) return;
  if (!card) return;

  if (card.getType() !== "weapon") {
    log("You can't equip that!");
    return;
  }

  weapon = new Weapon(card.suit, card.value, true);
  weaponChain = [];
  log(`Equipped the ${card.getTitle()}.`);
  playCard(card);
}

function drinkPotion(card) {
  if (isGameOver) return;
  if (!card) return;

  if (card.getType() !== "potion") {
    log("You can't drink that!");
    return;
  }

  let restoredHealth = Math.min(card.value, 20 - health);
  health = Math.min(20, health + card.value);
  canDrinkPotion = false;
  log(`Drank the ${card.getTitle()}, restored ${restoredHealth} health.`);
  playCard(card);
}

function playCard(card) {
  if (isGameOver) return;
  if (!card) return;

  const index = currentRoom.findIndex(
    (roomCard) => roomCard.suit === card.suit && roomCard.value === card.value
  );
  console.log(index, card, currentRoom);
  currentRoom.splice(index, 1);

  cardDetails.style.display = "none";
  updateUI();
  checkIfRoomFinished();
}

function takeDamage(amount) {
  health -= amount;
  if (health <= 0) {
    health = 0;
    log("You died!");
    endGame();
    return false;
  }
  return true;
}

function updateUI() {
  healthEl.textContent = health;
  weaponEl.innerHTML = "";
  weaponMonstersEl.innerHTML = "";
  if (weapon) {
    const weaponDiv = document.createElement("div");
    const weaponCard = createCardElement(weapon);
    weaponCard.onclick = () => showCardDescription(weapon);
    weaponDiv.appendChild(weaponCard);

    weaponChain.forEach((monster, index) => {
      const mCard = createCardElement(monster);

      let overlapMargin = 0;
      if (index !== 0) {
        overlapMargin = OVERLAP_MARGIN_MAP[weaponChain.length] || -60;
      }
      console.log(overlapMargin);
      mCard.style.marginLeft = `${overlapMargin}px`;
      weaponMonstersEl.appendChild(mCard);
    });

    weaponEl.appendChild(weaponDiv);
  }
  renderRoom();
}

function checkIfRoomFinished() {
  if (currentRoom.length === 1) {
    const nextSeed = currentRoom[0];
    // bring the remaining card to the top of the deck so it can be drawn again
    deck.unshift(nextSeed);
    drawRoom();
    canRun = true;
    canDrinkPotion = true;
    runBtn.disabled = false;
  }
}

function log(message) {
  logEl.textContent = `${message}\n${logEl.textContent}`;
}

function endGame() {
  roomEl.innerHTML = "<p>Game Over</p>";
  cardDetails.style.display = "none";
  runBtn.disabled = true;
  isGameOver = true;
}

// Onclick functions
runBtn.onclick = () => {
  if (!canRun) {
    log("You can't run twice in a row!");
    return;
  }
  cardDetails.style.display = "none";
  deck.push(...currentRoom);
  drawRoom();
  canRun = false;
  runBtn.disabled = true;

  log("You ran from the room.");
};

healthEl.onclick = () => {
  showHealthDescription();
}

cardCounterEl.onclick = () => {
  showDeckDescription();
}

buildDeck();
drawRoom();
