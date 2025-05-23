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
        return `Deals ${this.value} attack to a monster. Durability will be reduced when used with a monster.`;
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

class DeadMonster extends Card {
  constructor(suit, value) {
    super(suit, value);
  }

  getType() {
    return "dead monster";
  }
}

/* STATE MANAGER */
function createState(initialState = {}) {
  const listeners = new Map();

  const notify = (key, value) => {
    if (listeners.has(key)) {
      listeners.get(key).forEach((fn) => fn(value));
    }
  };

  const state = new Proxy(
    { ...initialState },
    {
      get(target, key) {
        return target[key];
      },
      set(target, key, value) {
        if (target[key] !== value) {
          target[key] = value;
          notify(key, value);
        }
        return true;
      },
    }
  );

  state.subscribe = function (key, callback) {
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    listeners.get(key).add(callback);
    return () => listeners.get(key).delete(callback);
  };

  return state;
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
const OVERLAP_MARGIN_MAP = [
  1, 1, 1, -1, -24, -36, -43, -48, -52, -55, -57, -59,
];
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
const deckContentsEl = document.getElementById("deck-contents");
const logEl = document.getElementById("log");
const runBtn = document.getElementById("run-button");

const settingsBtn = document.getElementById("settings");
const easyModeEl = document.getElementById("easy-mode-toggle");
const textOnlyEl = document.getElementById("text-only-toggle");
const deckContentsToggleEl = document.getElementById("deck-contents-toggle");

const restartButtonSettingsEl = document.getElementById(
  "restart-button-settings"
);
const closeModalBtn = document.getElementById("close-modal-button");
const modalEl = document.getElementById("modal-overlay");

/* GAME SETTINGS */
let easyMode = false;

const settings = createState({});
settings.textOnlyCards = false;
settings.showDeckContents = false;

/* GAME STATE */
const state = createState({});

let remainingMonsters = BASE_MONSTERS;
let canDrinkPotion = true;

/* UTILITY FUNCTIONS */
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getHealthGlowColor(health) {
  const hue = (health / 20) * 120 - 20;
  return `hsl(${hue}, 100%, 50%)`;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/* INITIALIZATION FUNCTIONS */
function initializeGame() {
  console.log("Easy mode:", easyMode);

  // game state
  state.health = MAX_HEALTH;
  state.deck = [];
  state.currentRoom = [];
  state.weapon = null;
  state.weaponChain = [];
  state.logs = "";
  state.canRun = true;
  state.isGameOver = false;
  state.didWin = null;
  state.selectedObject = null;
  remainingMonsters = BASE_MONSTERS;
  canDrinkPotion = true;

  buildDeck();
  drawRoom();
}

/**
 * Populates the deck with cards
 */
function buildDeck() {
  let deck = [];

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
  state.deck = shuffle(deck);
}

/**
 * Draws the room cards from the deck and calls the update function
 */
function drawRoom() {
  state.currentRoom = state.deck.slice(0, 4);
  state.deck = state.deck.slice(4);
}

/* PLAYER ACTIONS */
/**
 * Select an object to show its description
 * @param {Card|Weapon|string} object - The object to show the description for
 */
function selectObject(object) {
  if (!object) return;
  if (state.isGameOver) return;

  state.selectedObject = object;
}

/**
 * Fights a monster card
 * @param {Card} card - The monster card to fight
 * @param {boolean} isBarehanded - Whether to fight barehanded or with a weapon
 */
function fightMonster(card, isBarehanded) {
  if (state.isGameOver) return;
  if (!card) return;

  const type = card.getType();

  if (type !== "monster") {
    log("You can't fight that!");
    return;
  }

  state.selectedObject = null;
  if (isBarehanded) {
    const didSurvive = takeDamage(card.value);
    if (!didSurvive) {
      log(`Fought the ${card.getTitle()} barehanded but did not survive.`);
      return;
    }
    log(
      `Defeated the ${card.getTitle()} barehanded and took ${
        card.value
      } damage.`
    );
  } else {
    if (!state.weapon) {
      log("Please equip a weapon first.");
      return;
    }

    if (state.weapon.durability <= card.value) {
      log("Not enough durability!");
      return;
    }

    const excess = card.value - state.weapon.value;
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
    state.weapon.durability = card.value;
    state.weaponChain = [
      ...state.weaponChain,
      new DeadMonster(card.suit, card.value, false),
    ];
  }

  remainingMonsters--;

  playCard(card);
  checkIfPlayerWon();
}

/**
 * Equips a weapon card
 * @param {Weapon} card - The weapon card to equip
 */
function equipWeapon(card) {
  if (state.isGameOver) return;
  if (!card) return;

  if (card.getType() !== "weapon") {
    log("You can't equip that!");
    return;
  }

  state.selectedObject = null;
  state.weapon = new Weapon(card.suit, card.value, true);
  state.weaponChain = [];

  log(`Equipped the ${card.getTitle()}.`);
  playCard(card);
}

/**
 * Drinks a potion card
 * @param {Card} card - The potion card to drink
 */
function drinkPotion(card) {
  if (state.isGameOver) return;
  if (!card) return;

  if (card.getType() !== "potion") {
    log("You can't drink that!");
    return;
  }

  state.selectedObject = null;
  let restoredHealth = Math.min(card.value, 20 - state.health);
  state.health = Math.min(20, state.health + card.value);
  canDrinkPotion = false;

  log(`Drank the ${card.getTitle()}, restored ${restoredHealth} health.`);
  playCard(card);
}

/**
 * Completes the action of playing a card after the action is done
 * @param {Card} card - The card to play
 */
function playCard(card) {
  if (state.isGameOver) return;
  if (!card) return;

  state.currentRoom = state.currentRoom.filter(
    (roomCard) => roomCard.suit !== card.suit || roomCard.value !== card.value
  );

  // disable Run action after playing a card
  state.canRun = false;

  checkIfRoomFinished();
}

/**
 * Runs away from the current room
 */
function runAway() {
  if (!state.canRun) {
    log("You can't run twice in a row or after you have selected a card!");
    return;
  }

  state.deck = [...state.deck, ...state.currentRoom];
  state.canRun = false;
  state.selectedObject = null;

  drawRoom();
  log("You ran from the room.");
}

/**
 * Takes damage from the player and checks if the player is dead
 * @param {number} amount - The amount of damage to take
 * @return {boolean} - Returns true if the player survived, false if dead
 */
function takeDamage(amount) {
  state.health = Math.max(0, state.health - amount);
  if (state.health === 0) {
    endGame(false);
    return false;
  }
  return true;
}

/* UI FUNCTIONS */
/**
 * Updates the room UI with the current room cards.
 * Clears the room element and populates it with card elements based on the new room state.
 * If the room has fewer than 4 cards, empty card elements are added to fill the space.
 */
function updateRoomUI() {
  roomEl.innerHTML = "";

  state.currentRoom.forEach((card) => {
    const el = createCardElement(card);
    el.onclick = () => selectObject(card);
    roomEl.appendChild(el);
  });

  const emptyCardCount = 4 - state.currentRoom.length;
  for (let i = 0; i < emptyCardCount; i++) {
    const emptyCard = createEmptyCardElement();
    roomEl.appendChild(emptyCard);
  }
}

function updateWeaponChainUI() {
  weaponMonstersEl.innerHTML = "";

  if (state.weaponChain.length > 0) {
    weaponMonstersEl.style.display = "flex";

    state.weaponChain.forEach((monster, index) => {
      const mCard = createCardElement(monster);
      mCard.onclick = () => selectObject(monster);

      // compress the cards depending on the number of cards in the chain
      let overlapMargin = 0;
      if (index !== 0) {
        overlapMargin =
          OVERLAP_MARGIN_MAP[state.weaponChain.length] || MAX_OVERLAP_MARGIN;
      }
      mCard.style.marginLeft = `${overlapMargin}px`;

      weaponMonstersEl.appendChild(mCard);
    });
  } else {
    weaponMonstersEl.style.display = "none";
  }
}

function updateWeaponUI() {
  weaponEl.innerHTML = "";

  if (state.weapon) {
    const weaponCard = createCardElement(state.weapon);
    weaponEl.appendChild(weaponCard);

    dividerEl.style.display = "block";
  } else {
    dividerEl.style.display = "none";
  }
}

/**
 * Creates a card element with a suit and value
 * @param {Card} card - The card object to create an element for
 * @returns card HTML element
 */
function createCardElement(card) {
  const el = document.createElement("div");
  el.classList.add("card");

  if (settings.textOnlyCards) {
    el.innerText = card.toCardFace();
    el.classList.add(card.suit);
  } else {
    el.style.background = `url('assets/deck/${card.suit}-${card.value}.png') no-repeat center center`;
    el.style.backgroundSize = "cover";
  }

  // add emphasis style if card is the selected card
  const isCardSelected =
    state.selectedObject &&
    state.selectedObject instanceof Card &&
    state.selectedObject.suit === card.suit &&
    state.selectedObject.value === card.value;

  if (isCardSelected) {
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

function updateDeckContentsUI() {
  deckContentsEl.innerHTML = "";

  // Create table header for column labels (card values)
  const headerRow = document.createElement("tr");
  // Empty cell for row labels
  const emptyHeaderCell = document.createElement("th");
  headerRow.appendChild(emptyHeaderCell);
  // Create header cells for card values
  for (let j = 2; j <= 14; j++) {
    const headerCell = document.createElement("th");
    headerCell.textContent = faceValues[j] || j;
    headerRow.appendChild(headerCell);
  }
  deckContentsEl.appendChild(headerRow);

  // Populate deck contents with row labels (suits) and card data
  for (let i = 0; i < 4; i++) {
    const row = document.createElement("tr");
    const rowLabelCell = document.createElement("th");
    rowLabelCell.textContent = suitsNames[suits[i]];
    row.appendChild(rowLabelCell);

    for (let j = 2; j <= 14; j++) {
      const cell = document.createElement("td");
      const card = new Card(suits[i], j);
      const isInDeck =
        state.deck.some(
          (deckCard) =>
            deckCard.suit === card.suit && deckCard.value === card.value
        ) ||
        state.currentRoom.some(
          (roomCard) =>
            roomCard.suit === card.suit && roomCard.value === card.value
        );

      cell.innerHTML = isInDeck ? "&#10003;" : "";
      row.appendChild(cell);
    }
    deckContentsEl.appendChild(row);
  }
}

/* STATE SUBSCRIPTIONS */
/**
 * Updates the health UI with the current health value
 */
state.subscribe("health", (newHealth) => {
  let currentHealth = parseInt(healthEl.textContent) || 0;
  const healthDifference = newHealth - currentHealth;
  const step = healthDifference > 0 ? 1 : -1;

  // animate the health change
  const animationDuration = 800;
  const delay = Math.min(100, animationDuration / Math.abs(healthDifference));
  const interval = setInterval(() => {
    if (currentHealth !== newHealth) {
      currentHealth += step;
      healthEl.textContent = currentHealth;
    } else {
      clearInterval(interval);
    }
  }, delay);

  const color = getHealthGlowColor(state.health);
  const glowStyle = `
    0 0 30px ${color},
    0 0 40px ${color},
    0 0 60px ${color},
    0 0 100px ${color}
  `;

  // Apply a stronger glow effect if health is below 10
  if (newHealth < 10) {
    healthEl.style.textShadow = `${glowStyle}, ${glowStyle}`;
  } else {
    healthEl.style.textShadow = glowStyle;
  }
});

state.subscribe("deck", (newDeck) => {
  cardCounterEl.textContent = `${newDeck.length}`;

  if (newDeck.length === 0) {
    cardCounterEl.classList.remove("back");
    cardCounterEl.classList.add("empty");
  } else {
    cardCounterEl.classList.remove("empty");
    cardCounterEl.classList.add("back");
  }
});

state.subscribe("currentRoom", () => {
  updateRoomUI();

  if (settings.showDeckContents) {
    updateDeckContentsUI();
  }
});

/**
 * Updates the weapon UI with the current weapon
 */
state.subscribe("weapon", () => {
  updateWeaponUI();
});

/**
 * Updates the chain of monsters
 */
state.subscribe("weaponChain", () => {
  updateWeaponChainUI();
});

/**
 * Updates the object details text based on the selected object
 */
state.subscribe("selectedObject", (newSelectedObject) => {
  if (newSelectedObject) {
    updateRoomUI();
    updateWeaponUI();
    updateWeaponChainUI();

    cardDetails.style.display = "flex";

    if (newSelectedObject instanceof Card) {
      const type = newSelectedObject.getType();

      // reset actions visibility
      cardPrimaryActionEl.style.display = "block";
      cardSecondaryActionEl.style.display = "block";
      cardPrimaryActionEl.classList.remove("red", "green", "orange");
      cardSecondaryActionEl.classList.remove("red", "green", "orange");

      cardNameEl.textContent = newSelectedObject.getTitle();
      cardTypeEl.textContent = capitalizeFirstLetter(
        newSelectedObject.getType()
      );
      cardDescriptionEl.textContent = newSelectedObject.getDescription();

      if (type === "monster") {
        cardPrimaryActionEl.textContent = "Fight barehanded";
        cardPrimaryActionEl.classList.add("orange");
        cardPrimaryActionEl.onclick = () =>
          fightMonster(newSelectedObject, true);
        cardSecondaryActionEl.textContent = "Fight with weapon";
        cardSecondaryActionEl.classList.add("green");
        cardSecondaryActionEl.onclick = () =>
          fightMonster(newSelectedObject, false);

        // hide secondary action if weapon cannot be used
        if (
          !state.weapon ||
          state.weapon.durability <= newSelectedObject.value
        ) {
          cardSecondaryActionEl.style.display = "none";
        }
      } else if (type === "dead monster") {
        // hide actions if monster is already dead
        cardPrimaryActionEl.style.display = "none";
        cardSecondaryActionEl.style.display = "none";
      } else if (type === "weapon") {
        cardPrimaryActionEl.textContent = "Equip";
        cardPrimaryActionEl.classList.add("green");
        cardPrimaryActionEl.onclick = () => equipWeapon(newSelectedObject);

        // hide action if weapon is already equipped
        if (newSelectedObject.isEquipped) {
          cardPrimaryActionEl.style.display = "none";
        }
        // no secondary action
        cardSecondaryActionEl.style.display = "none";
      } else if (type === "potion") {
        cardPrimaryActionEl.textContent = canDrinkPotion
          ? "Drink"
          : "Drink (no effect)";
        cardPrimaryActionEl.classList.add(canDrinkPotion ? "green" : "red");
        cardPrimaryActionEl.onclick = () => drinkPotion(newSelectedObject);

        // no secondary action
        cardSecondaryActionEl.style.display = "none";
      }
    } else {
      // show description for health, deck or equipped weapon
      switch (newSelectedObject) {
        case "health":
          cardNameEl.textContent = "d20";
          cardTypeEl.textContent = "Health";
          cardDescriptionEl.textContent =
            "A 20-sided die. Shows your health points. Capped at 20.";
          break;
        case "deck":
          cardNameEl.textContent = "Deck of cards";
          cardTypeEl.textContent = "Dungeon";
          cardDescriptionEl.textContent =
            "The source of all cards. Cards are dealt in 'rooms', which are groups of 4 cards. Defeat all 26 monster cards to win.";
          break;
        case "empty-weapon":
          cardNameEl.textContent = "Empty weapon slot";
          cardTypeEl.textContent = "Slot";
          cardDescriptionEl.textContent =
            "Equip a Diamond card as a weapon to fight monsters more effectively.";
          break;
      }
      // hide actions
      cardPrimaryActionEl.style.display = "none";
      cardSecondaryActionEl.style.display = "none";
    }
  } else {
    cardDetails.style.display = "none";
  }
});

/**
 * Updates the run button state based on the canRun property
 */
state.subscribe("canRun", (newCanRun) => {
  runBtn.disabled = !newCanRun;
});

/**
 * Updates the log UI with the current logs
 */
state.subscribe("logs", (newLog) => {
  logEl.textContent = newLog;
});

/**
 * Updates the restart button state based on the isGameOver property
 */
state.subscribe("isGameOver", (isGameOver) => {
  if (isGameOver) {
    restartButtonEl.style.display = "block";
  } else {
    restartButtonEl.style.display = "none";
  }
});

/**
 * Updates the prompt text based on the didWin property
 */
state.subscribe("didWin", (didWin) => {
  if (didWin) {
    promptEl.textContent = "You win!";
  } else {
    if (state.isGameOver) {
      promptEl.textContent = "You died.";
    } else {
      promptEl.textContent =
        "Interact with 3 cards in the room or Run to proceed. Click objects to inspect.";
    }
  }
});

settings.subscribe("textOnlyCards", () => {
  updateRoomUI();
  updateWeaponUI();
  updateWeaponChainUI();
});

settings.subscribe("showDeckContents", () => {
  if (settings.showDeckContents) {
    updateDeckContentsUI();
  } else {
    deckContentsEl.innerHTML = "";
  }
});

/* GAME CHECKER FUNCTIONS */
/**
 * Checks if the player has won the game and ends the game if so
 */
function checkIfPlayerWon() {
  if (remainingMonsters <= 0) {
    log("You defeated all monsters! You win!");
    endGame(true);
  }
}

/**
 * Checks if the room is finished and draws the next room if so
 */
function checkIfRoomFinished() {
  if (state.currentRoom.length === 1) {
    const lastCard = state.currentRoom[0];
    // bring the remaining card to the top of the deck so it can be drawn again
    state.deck = [lastCard, ...state.deck];
    state.canRun = true;

    drawRoom();
    canDrinkPotion = true;
  }
}

/**
 * Ends the game and sets the game over state
 * @param {boolean} didWin - Whether the player won or lost the game
 */
function endGame(didWin) {
  state.canRun = false;
  state.isGameOver = true;
  state.selectedObject = null;
  state.didWin = didWin;
}

/**
 * Logs a message to the game log
 * @param {string} message - The message to log
 */
function log(message) {
  state.logs = `${message}\n${state.logs}`;
}

/* DEBUGGER FUNCTIONS */
function overrideCurrentRoom() {
  currentRoom = [
    new Card("spade", 14),
    new Card("club", 13),
    new Card("spade", 12),
    new Card("diamond", 10),
  ];
}

function overrideWeaponChain() {
  state.weapon = new Weapon("diamond", 10, true);

  state.weaponChain = [
    new Card("club", 2),
    new Card("club", 3),
    new Card("club", 4),
    new Card("club", 5),
    new Card("club", 6),
    new Card("club", 7),
    new Card("club", 8),
  ];
}

function increaseWeaponChain() {
  if (!state.weapon) {
    state.weapon = new Weapon("diamond", 10, true);
    equipWeapon(state.weapon);
  }

  weaponChain.push(new Card("spade", 10));
}

/* EVENT LISTENERS */
runBtn.onclick = () => {
  runAway();
};

restartButtonEl.onclick = () => {
  initializeGame();
};

healthEl.onclick = () => {
  selectObject("health");
};

cardCounterEl.onclick = () => {
  selectObject("deck");
};

weaponEl.onclick = () => {
  selectObject(state.weapon || "empty-weapon");
};

closeModalBtn.onclick = () => {
  modalEl.style.display = "none";
};

settingsBtn.onclick = () => {
  modalEl.style.display = "flex";
};

easyModeEl.addEventListener("change", (e) => {
  easyMode = e.target.checked;
});

textOnlyEl.addEventListener("change", (e) => {
  settings.textOnlyCards = e.target.checked;
});

deckContentsToggleEl.addEventListener("change", (e) => {
  settings.showDeckContents = e.target.checked;
});

restartButtonSettingsEl.onclick = () => {
  modalEl.style.display = "none";
  initializeGame();
};

initializeGame();
