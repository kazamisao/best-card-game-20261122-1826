// Tests for Pasang & Purnama (best-card-game-20261122-1826).
// Written BEFORE the implementation: each test names one behaviour of the
// tide-lane duel. Run with: node --test tests/game.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeck, shuffleDeck, drawCards, SUITS } from '../game/src/deck.mjs';
import { tideBoost, nextTideSuit, isTideSuit } from '../game/src/tide.mjs';
import { lanePower, resolveLane, resolveRound, gameWinner } from '../game/src/rules.mjs';
import { choosePlay } from '../game/src/ai.mjs';
import { newGame, startRound, playCard, endRound, tiebreakWinner } from '../game/src/state.mjs';
import { mulberry32 } from '../game/src/random.mjs';

const card = (suit, value) => ({
  suit,
  value,
  cost: value <= 3 ? 1 : value <= 6 ? 2 : 3,
  id: `${suit}-${value}`,
});

// --- random ---
test('mulberry32: same seed gives the same sequence', () => {
  const a = mulberry32(7);
  const b = mulberry32(7);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test('mulberry32: different seeds give different first values', () => {
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

// --- deck ---
test('deck: builds 36 cards, four suits times values 1 to 9', () => {
  const deck = buildDeck();
  assert.equal(deck.length, 36);
  assert.equal(new Set(deck.map((c) => c.suit)).size, 4);
  for (const suit of SUITS) {
    const values = deck.filter((c) => c.suit === suit).map((c) => c.value).sort((x, y) => x - y);
    assert.deepEqual(values, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  }
});

test('deck: cost bands are 1 for values 1-3, 2 for 4-6, 3 for 7-9', () => {
  for (const c of buildDeck()) {
    assert.equal(c.cost, c.value <= 3 ? 1 : c.value <= 6 ? 2 : 3);
  }
});

test('deck: shuffle with the same seed keeps the same order', () => {
  const a = shuffleDeck(buildDeck(), mulberry32(42));
  const b = shuffleDeck(buildDeck(), mulberry32(42));
  assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id));
});

test('deck: shuffle with another seed changes the order', () => {
  const a = shuffleDeck(buildDeck(), mulberry32(42));
  const b = shuffleDeck(buildDeck(), mulberry32(43));
  assert.notDeepEqual(a.map((c) => c.id), b.map((c) => c.id));
});

test('deck: drawing five leaves thirty-one in the deck', () => {
  const deck = shuffleDeck(buildDeck(), mulberry32(1));
  const { drawn, rest } = drawCards(deck, [], 5);
  assert.equal(drawn.length, 5);
  assert.equal(rest.length, 31);
});

test('deck: drawing from an empty deck reshuffles the discard pile', () => {
  const discard = buildDeck().slice(0, 10);
  const { drawn, rest } = drawCards([], discard, 3, mulberry32(9));
  assert.equal(drawn.length, 3);
  assert.equal(rest.length, 7);
});

// --- tide ---
test('tide: a card of the tide suit gains plus two power', () => {
  assert.equal(tideBoost(card('Bulan', 5), 'Bulan'), 2);
});

test('tide: a card of another suit gains nothing', () => {
  assert.equal(tideBoost(card('Arus', 5), 'Bulan'), 0);
});

test('tide: next tide suit is one of the four suits', () => {
  assert.ok(SUITS.includes(nextTideSuit('Arus', mulberry32(3))));
});

test('tide: next tide suit differs from the current one', () => {
  for (const suit of SUITS) {
    assert.notEqual(nextTideSuit(suit, mulberry32(11)), suit);
  }
});

test('tide: isTideSuit matches only the tide suit', () => {
  assert.equal(isTideSuit('Karang', 'Karang'), true);
  assert.equal(isTideSuit('Angin', 'Karang'), false);
});

// --- rules ---
test('rules: lane power sums values plus tide bonus per tide card', () => {
  const lane = [card('Bulan', 4), card('Arus', 3)];
  assert.equal(lanePower(lane, 'Bulan'), 4 + 2 + 3);
  assert.equal(lanePower([], 'Bulan'), 0);
});

test('rules: the stronger lane wins, an equal lane ties', () => {
  assert.equal(resolveLane([card('Arus', 6)], [card('Arus', 4)], 'Bulan'), 'you');
  assert.equal(resolveLane([card('Arus', 4)], [card('Arus', 6)], 'Bulan'), 'foe');
  assert.equal(resolveLane([card('Arus', 4)], [card('Arus', 4)], 'Bulan'), null);
});

test('rules: a tide card can flip a lane', () => {
  assert.equal(resolveLane([card('Bulan', 4)], [card('Arus', 5)], 'Bulan'), 'you');
});

test('rules: winning a lane scores one point and deals two damage', () => {
  const before = {
    you: { life: 20, score: 0 },
    foe: { life: 20, score: 0 },
    lanes: [
      { you: [card('Arus', 6)], foe: [card('Arus', 4)] },
      { you: [card('Arus', 2)], foe: [card('Arus', 8)] },
      { you: [], foe: [] },
    ],
    tide: 'Bulan',
  };
  const after = resolveRound(before);
  assert.equal(after.you.score, 1);
  assert.equal(after.foe.life, 18);
  assert.equal(after.foe.score, 1);
  assert.equal(after.you.life, 18);
});

test('rules: gameWinner names the side whose foe fell to zero life', () => {
  assert.equal(gameWinner({ you: { life: 0 }, foe: { life: 12 } }), 'foe');
  assert.equal(gameWinner({ you: { life: 12 }, foe: { life: 0 } }), 'you');
  assert.equal(gameWinner({ you: { life: 12 }, foe: { life: 8 } }), null);
});

// --- ai ---
test('ai: with no affordable card it passes', () => {
  const hand = [card('Arus', 9)];
  assert.equal(choosePlay(hand, 1, [[], [], []], [[], [], []], 'Bulan', mulberry32(5)), null);
});

test('ai: it never picks a card it cannot afford', () => {
  const hand = [card('Arus', 2), card('Arus', 9)];
  const play = choosePlay(hand, 2, [[], [], []], [[], [], []], 'Bulan', mulberry32(5));
  assert.ok(play);
  assert.ok(play.card.cost <= 2);
});

test('ai: it plays a card that wins a lane when one is on the table', () => {
  const hand = [card('Arus', 8)];
  const yours = [[card('Arus', 3)], [], []];
  const mine = [[], [], []];
  const play = choosePlay(hand, 3, yours, mine, 'Bulan', mulberry32(5));
  assert.ok(play);
  assert.equal(play.lane, 0);
  assert.equal(play.card.value, 8);
});

// --- state ---
test('state: a new game starts both sides at twenty life and zero score', () => {
  const game = newGame(42);
  assert.equal(game.you.life, 20);
  assert.equal(game.foe.life, 20);
  assert.equal(game.you.score, 0);
  assert.equal(game.foe.score, 0);
  assert.equal(game.round, 1);
  assert.equal(game.you.hand.length, 5);
  assert.equal(game.foe.hand.length, 5);
});

test('state: starting a round sets the tide and refills energy', () => {
  const game = newGame(42);
  startRound(game);
  assert.ok(SUITS.includes(game.tide));
  assert.equal(game.you.energy, 3);
  assert.equal(game.foe.energy, 3);
});

test('state: playing a card spends its cost and moves it to the lane', () => {
  const game = newGame(42);
  startRound(game);
  const played = game.you.hand[0];
  const energyBefore = game.you.energy;
  const ok = playCard(game, 'you', played.id, 1);
  assert.equal(ok, true);
  assert.equal(game.you.energy, energyBefore - played.cost);
  assert.equal(game.lanes[1].you.length, 1);
  assert.equal(game.you.hand.some((c) => c.id === played.id), false);
});

test('state: playing a card you cannot afford is refused', () => {
  const game = newGame(42);
  startRound(game);
  game.you.energy = 1;
  const dear = game.you.hand.find((c) => c.cost > 1);
  if (dear) assert.equal(playCard(game, 'you', dear.id, 0), false);
});

test('state: ending a round keeps the last lane powers for the display', () => {
  const game = newGame(42);
  startRound(game);
  const played = game.you.hand.find((c) => c.cost <= game.you.energy);
  const tide = game.tide;
  playCard(game, 'you', played.id, 0);
  endRound(game);
  const expected = played.value + (played.suit === tide ? 2 : 0);
  assert.equal(game.lastPowers[0][0], expected);
});

test('state: ending a round marks it just resolved until a card is played', () => {
  const game = newGame(42);
  startRound(game);
  assert.equal(game.justResolved, false);
  endRound(game);
  assert.equal(game.justResolved, true);
  const played = game.you.hand.find((c) => c.cost <= game.you.energy);
  playCard(game, 'you', played.id, 0);
  assert.equal(game.justResolved, false);
});

test('state: a double knockout goes to the tiebreak, not to the first if', () => {
  const game = newGame(42);
  startRound(game);
  game.you.life = 2;
  game.foe.life = 2;
  // You win lane 0 with a 9, foe wins lane 1 with a 3: both lives hit 0,
  // scores tie 1-1, but your played power (11) beats theirs (4).
  game.lanes[0].you = [card('Arus', 9)];
  game.lanes[0].foe = [card('Arus', 1)];
  game.lanes[1].you = [card('Arus', 2)];
  game.lanes[1].foe = [card('Arus', 3)];
  endRound(game);
  assert.equal(game.phase, 'over');
  assert.equal(game.winner, 'you');
});

test('state: tiebreak uses total power played, not the discard pile', () => {
  const tied = {
    you: { life: 10, score: 3, powerPlayed: 50 },
    foe: { life: 10, score: 3, powerPlayed: 40 },
  };
  assert.equal(tiebreakWinner(tied), 'you');
  const tiedLow = {
    you: { life: 10, score: 3, powerPlayed: 30 },
    foe: { life: 10, score: 3, powerPlayed: 40 },
  };
  assert.equal(tiebreakWinner(tiedLow), 'foe');
});

test('state: ending a round resolves lanes and moves to the next round', () => {
  const game = newGame(42);
  startRound(game);
  const roundBefore = game.round;
  endRound(game);
  assert.equal(game.round, roundBefore + 1);
  assert.equal(game.phase, 'play');
});
