/* CLASSES */
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

/* CONSTANTS */
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
const BASE_MONSTERS = 26;
const OVERLAP_MARGIN_MAP = [1, 1, 1, -1, -24, -36, -43, -48, -52, -55, -57, -59];
const MAX_OVERLAP_MARGIN = -60;

/* UI ELEMENTS */
const healthEl = document.getElementById("health");
const cardCounterEl = document.getElementById("card-counter");
const promptEl = document.getElementById("prompt");
const restartButtonEl = document.getElementById("restart-button");

const weaponEl = document.getElementById("weapon");
const dividerEl = document.getElementById("divider");
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

const settingsBtn = document.getElementById("settings");
const easyModeEl = document.getElementById("easy-mode-toggle");
const restartButtonSettingsEl = document.getElementById("restart-button-settings");
const closeModalBtn = document.getElementById("close-modal-button");
const modalEl = document.getElementById("modal-overlay");

/* GAME SETTINGS */
let easyMode = false;

/* GAME STATE */
let deck = [];
let health = MAX_HEALTH;
let remainingMonsters = BASE_MONSTERS;
let weapon = null;
let weaponChain = [];
let canDrinkPotion = true;
let currentRoom = [];
let selectedCard = null;
let canRun = true;
let isGameOver = false;

/* UTILITY FUNCTIONS */
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getHealthGlowColor(health) {
  const hue = (health / 20) * 100;
  return `hsl(${hue}, 100%, 50%)`;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/* DEBUGGER FUNCTIONS */
function overrideCurrentRoom() {
  currentRoom = [
    new Card("spade", 14),
    new Card("club", 13),
    new Card("spade", 12),
    new Card("diamond", 10),
  ];

  updateRoomUI();
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
  if (!weapon) {
    weapon = new Weapon("diamond", 10, true);
    equipWeapon(weapon);
  }

  weaponChain.push(new Card("spade", 10));

  updateUI();
}

/* INITIALIZATION FUNCTIONS */
function initializeGame() {
  console.log("Easy mode:", easyMode);

  // game state
  health = MAX_HEALTH;
  remainingMonsters = BASE_MONSTERS;
  weapon = null;
  weaponChain = [];
  canDrinkPotion = true;
  currentRoom = [];
  canRun = true;
  isGameOver = false;
  deck = [];

  // UI state
  restartButtonEl.style.display = "none";
  promptEl.textContent = "Interact with 3 cards in the room or Run to proceed. Click objects to inspect.";
  logEl.textContent = "";
  dividerEl.style.display = "none";
  runBtn.disabled = false;

  buildDeck();
  drawRoom();
  updateUI();
}

/**
 * Populates the deck with cards
 */
function buildDeck() {
  for (let i = 2; i <= 14; i++) {
    for (let suit of suits) {
      if (suit === "heart" && (i <= 10 || easyMode)) {
        deck.push(new Card(suit, i));
      } else if (suit === "diamond" && (i <= 10 || easyMode)) {
        deck.push(new Card(suit, i));
      } else if (suit === "spade" || suit === "club") {
        deck.push(new Card(suit, i));
      }
    }
  }
  deck = shuffle(deck);
}

/**
 * Draws the room cards from the deck and calls the update function
 */
function drawRoom() {
  currentRoom = deck.splice(0, 4);

  updateRoomUI();
}

/**
 * Creates a card element with a suit and value
 * @param {Card} card
 * @returns card HTML element
 */
function createCardElement(card) {
  const el = document.createElement("div");
  el.classList.add("card");
  el.classList.add(card.suit);
  // el.innerText = card.toCardFace();
  el.style.background = `url('deck/${card.suit}-${card.value}.png') no-repeat center center`;
  el.style.backgroundSize = "cover";

  // add emphasis style if card is the selected card
  if (selectedCard && selectedCard.suit === card.suit && selectedCard.value === card.value) {
    switch (card.suit) {
      case "spade":
        el.classList.add("selected-monster");
        break;
      case "club":
        el.classList.add("selected-monster");
        break;
      case "heart":
        el.classList.add("selected-potion");
        break;
      case "diamond":
        el.classList.add("selected-weapon");
        break;
    }
  }
  return el;
}

/**
 * Creates an empty card element
 * @returns card HTML element
 */
function createEmptyCardElement() {
  const el = document.createElement("div");
  el.classList.add("card");
  el.classList.add("empty");
  return el;
}

/**
 * Displays the card description and actions based on the card type
 * @param {Card} card
 */
function showCardDescription(card) {
  if (!card) return;
  if (isGameOver) return;

  selectedCard = card;

  const type = card.getType();

  // reset actions visibility
  cardPrimaryActionEl.style.display = "block";
  cardSecondaryActionEl.style.display = "block";
  cardPrimaryActionEl.classList.remove("red", "green", "orange");
  cardSecondaryActionEl.classList.remove("red", "green", "orange");
  
  cardNameEl.textContent = card.getTitle();
  cardTypeEl.textContent = capitalizeFirstLetter(card.getType());
  cardDescriptionEl.textContent = card.getDescription();
  cardDetails.style.display = "flex";

  if (type === "monster") {
    cardPrimaryActionEl.textContent = "Fight barehanded";
    cardPrimaryActionEl.classList.add("orange");
    cardPrimaryActionEl.onclick = () => fightMonster(card, true);
    cardSecondaryActionEl.textContent = "Fight with weapon";
    cardSecondaryActionEl.classList.add("green");
    cardSecondaryActionEl.onclick = () => fightMonster(card, false);

    // hide secondary action if weapon cannot be used
    if (!weapon || weapon.durability <= card.value) {
      cardSecondaryActionEl.style.display = "none";
    }
  } else if (type === "weapon") {
    cardPrimaryActionEl.textContent = "Equip";
    cardPrimaryActionEl.classList.add("green");
    cardPrimaryActionEl.onclick = () => equipWeapon(card);

    // hide action if weapon is already equipped
    if (card.isEquipped) {
      cardPrimaryActionEl.style.display = "none";
    }
    // no secondary action
    cardSecondaryActionEl.style.display = "none";
  } else if (type === "potion") {
    cardPrimaryActionEl.textContent = canDrinkPotion ? "Drink" : "Drink (no effect)";
    cardPrimaryActionEl.classList.add(canDrinkPotion ? "green" : "red");
    cardPrimaryActionEl.onclick = () => drinkPotion(card);

    // no secondary action
    cardSecondaryActionEl.style.display = "none";
  }

  updateRoomUI();
}

/**
 * Displays the description of a miscellaneous object (health, deck, weapon)
 * @param {string} object - The object to show the description for
 */
function showMiscDescription(object) {
  selectedCard = null;

  switch (object) {
    case "health":
      cardNameEl.textContent = "d20";
      cardTypeEl.textContent = "Health";
      cardDescriptionEl.textContent = "A 20-sided die. Shows your health points. Capped at 20.";
      break;
    case "deck":
      cardNameEl.textContent = "Deck of cards";
      cardTypeEl.textContent = "Dungeon";
      cardDescriptionEl.textContent =
        "The source of all cards. Cards are dealt in 'rooms', which are groups of 4 cards. Defeat all 26 monster cards to win.";
      break;
    case "weapon":
      if (weapon) {
        showCardDescription(weapon);
      } else {
        cardNameEl.textContent = "Empty weapon slot";
        cardTypeEl.textContent = "Slot";
        cardDescriptionEl.textContent = "Equip a Diamond card as a weapon to fight monsters more effectively.";
      }
      break;
  }

  cardDetails.style.display = "flex";
  // hide actions
  cardPrimaryActionEl.style.display = "none";
  cardSecondaryActionEl.style.display = "none";

  updateRoomUI();
}

/* PLAYER ACTIONS */
function fightMonster(card, isBarehanded) {
  if (isGameOver) return;
  if (!card) return;

  const type = card.getType();

  if (type !== "monster") {
    log("You can't fight that!");
    return;
  }

  if (isBarehanded) {
    const didSurvive = takeDamage(card.value);
    if (!didSurvive) {
      log(`Fought the ${card.getTitle()} barehanded but did not survive.`);
      return;
    }
    log(`Fought the ${card.getTitle()} barehanded and took ${card.value} damage.`);
  } else {
    if (!weapon) {
      log("Please equip a weapon first.");
      return;
    }

    if (weapon.durability <= card.value) {
      log("Not enough durability!");
      return;
    }

    const excess = card.value - weapon.value;
    if (excess > 0) {
      const didSurvive = takeDamage(excess);
      if (!didSurvive) {
        log(`Fought the ${card.getTitle()} but did not survive.`);
        return;
      }
      log(`Defeated the ${card.getTitle()}, but took ${excess} excess damage.`);
    } else {
      log(`Defeated the ${card.getTitle()}.`);
    }
    weapon.durability = card.value;
    weaponChain.push(card);
  }

  remainingMonsters--;

  playCard(card);
  checkIfPlayerWon();
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

  dividerEl.style.display = "block";
  selectedCard = null;

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

/**
 * Completes the action of playing a card after the action is done
 * @param {Card} card the card to play
 * @returns 
 */
function playCard(card) {
  if (isGameOver) return;
  if (!card) return;

  const index = currentRoom.findIndex(
    (roomCard) => roomCard.suit === card.suit && roomCard.value === card.value
  );
  currentRoom.splice(index, 1);

  // disable Run action after playing a card
  canRun = false;

  cardDetails.style.display = "none";
  runBtn.disabled = true;

  updateUI();
  checkIfRoomFinished();
}

/**
 * Takes damage from the player and checks if the player is dead
 * @param {number} amount - The amount of damage to take
 * @return {boolean} - Returns true if the player survived, false if dead
 */
function takeDamage(amount) {
  health -= amount;
  if (health <= 0) {
    health = 0;
    endGame(false);
    return false;
  }
  return true;
}

/* UI FUNCTIONS */
function updateUI() {
  updateHealthUI();
  updateDeckUI();
  updateWeaponUI();

  updateRoomUI();
}

/**
 * Updates the health UI with the current health value
 */
function updateHealthUI() {
  healthEl.textContent = health;
  const color = getHealthGlowColor(health);
  healthEl.style.textShadow = `
    0 0 30px ${color},
    0 0 30px ${color},
    0 0 40px ${color},
    0 0 60px ${color},
    0 0 100px ${color}
  `;
}

/**
 * Updates the deck UI with the current number of cards in the deck
 */
function updateDeckUI() {
  cardCounterEl.textContent = `${deck.length}`;
  if (deck.length === 0) {
    cardCounterEl.classList.remove("back");
    cardCounterEl.classList.add("empty");
  }
}

/**
 * Updates the weapon UI with the current weapon and its chain of monsters
 */
function updateWeaponUI() {
  weaponEl.innerHTML = "";
  weaponMonstersEl.innerHTML = "";

  if (weapon) {
    const weaponCard = createCardElement(weapon);
    weaponEl.appendChild(weaponCard);
  }

  if (weaponChain.length > 0) {
    weaponMonstersEl.style.display = "flex";

    weaponChain.forEach((monster, index) => {
      const mCard = createCardElement(monster);

      // compress the cards depending on the number of cards in the chain
      let overlapMargin = 0;
      if (index !== 0) {
        overlapMargin = OVERLAP_MARGIN_MAP[weaponChain.length] || MAX_OVERLAP_MARGIN;
      }
      mCard.style.marginLeft = `${overlapMargin}px`;

      weaponMonstersEl.appendChild(mCard);
    });
  } else {
    weaponMonstersEl.style.display = "none";
  }
}

/**
 * Updates the cards in the current room
 */
function updateRoomUI() {
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

function log(message) {
  logEl.textContent = `${message}\n${logEl.textContent}`;
}

/* GAME CHECKER FUNCTIONS */
function checkIfPlayerWon() {
  if (remainingMonsters <= 0) {
    log("You defeated all monsters! You win!");
    endGame(true);
  }
}

function checkIfRoomFinished() {
  if (currentRoom.length === 1) {
    const nextSeed = currentRoom[0];
    // bring the remaining card to the top of the deck so it can be drawn again
    deck.unshift(nextSeed);
    drawRoom();
    updateDeckUI();
    canRun = true;
    canDrinkPotion = true;
    runBtn.disabled = false;
  }
}

function endGame(didWin) {
  if (didWin) {
    promptEl.textContent = "You win!";
  } else {
    promptEl.textContent = "You died.";
  }
  cardDetails.style.display = "none";
  runBtn.disabled = true;
  restartButtonEl.style.display = "block";
  isGameOver = true;
  updateUI();
}

/* EVENT LISTENERS */
runBtn.onclick = () => {
  if (!canRun) {
    log("You can't run twice in a row or after you have selected a card!");
    return;
  }
  cardDetails.style.display = "none";
  deck.push(...currentRoom);
  drawRoom();
  canRun = false;
  runBtn.disabled = true;

  log("You ran from the room.");
};

restartButtonEl.onclick = () => {
  initializeGame();
}

healthEl.onclick = () => {
  showMiscDescription("health");
}

cardCounterEl.onclick = () => {
  showMiscDescription("deck");
}

weaponEl.onclick = () => {
  showMiscDescription("weapon");
}

closeModalBtn.onclick = () => {
  modalEl.style.display = "none";
}

settingsBtn.onclick = () => {
  modalEl.style.display = "flex";
}

easyModeEl.addEventListener("change", (e) => {
  easyMode = e.target.checked;
});

restartButtonSettingsEl.onclick = () => {
  modalEl.style.display = "none";
  initializeGame();
}

initializeGame();
