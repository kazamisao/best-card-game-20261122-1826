// Game state: a fresh duel, round setup, playing a card, ending a round.
// The state object is the single source of truth the renderer draws from.
import { buildDeck, shuffleDeck, drawCards } from './deck.mjs';
import { nextTideSuit, isTideSuit } from './tide.mjs';
import { resolveRound, gameWinner, lanePower } from './rules.mjs';
import { mulberry32 } from './random.mjs';

export const START_LIFE = 20;
export const HAND_SIZE = 5;
export const MAX_ROUNDS = 12;

function freshSide(rng) {
  const deck = shuffleDeck(buildDeck(), rng);
  const { drawn, rest } = drawCards(deck, [], HAND_SIZE, rng);
  return { life: START_LIFE, score: 0, energy: 0, hand: drawn, deck: rest, discard: [] };
}

export function newGame(seed) {
  const rng = mulberry32(seed);
  const game = {
    seed,
    rng,
    round: 1,
    phase: 'play',
    tide: 'Bulan',
    you: freshSide(rng),
    foe: freshSide(rng),
    lanes: [{ you: [], foe: [] }, { you: [], foe: [] }, { you: [], foe: [] }],
    lastResults: [null, null, null],
    lastPowers: [[0, 0], [0, 0], [0, 0]],
    // True only right after a round was settled, until a card is played:
    // the only time the last round's lane marks and powers may be shown.
    justResolved: false,
    winner: null,
  };
  return game;
}

function refill(side, rng) {
  const { drawn, rest, discard } = drawCards(side.deck, side.discard, HAND_SIZE - side.hand.length, rng);
  side.hand = side.hand.concat(drawn);
  side.deck = rest;
  side.discard = discard;
}

/** Open a round: new tide, energy grows by one each round up to six, hands refill. */
export function startRound(game) {
  game.tide = game.round === 1 ? game.tide : nextTideSuit(game.tide, game.rng);
  const energy = Math.min(3 + (game.round - 1), 6);
  game.you.energy = energy;
  game.foe.energy = energy;
  refill(game.you, game.rng);
  refill(game.foe, game.rng);
  game.phase = 'play';
}

/** Move a card from a side's hand into a lane. Returns false when refused. */
export function playCard(game, side, cardId, laneIndex) {
  const player = game[side];
  if (game.phase !== 'play') return false;
  if (laneIndex < 0 || laneIndex > 2) return false;
  const at = player.hand.findIndex((c) => c.id === cardId);
  if (at < 0) return false;
  const card = player.hand[at];
  if (card.cost > player.energy) return false;
  if (game.lanes[laneIndex][side].length >= 3) return false;
  player.hand.splice(at, 1);
  player.energy -= card.cost;
  game.lanes[laneIndex][side].push(card);
  game.justResolved = false;
  return true;
}

/**
 * Settle the round: score the lanes, clear them into the discard piles, and
 * open the next round — or close the game when a life has fallen.
 */
export function endRound(game) {
  const settled = resolveRound({ you: game.you, foe: game.foe, lanes: game.lanes, tide: game.tide });
  game.you.life = settled.you.life;
  game.you.score = settled.you.score;
  game.foe.life = settled.foe.life;
  game.foe.score = settled.foe.score;
  game.lastResults = settled.laneResults;
  game.lastPowers = game.lanes.map((lane) => [
    lanePower(lane.you, game.tide),
    lanePower(lane.foe, game.tide),
  ]);
  game.you.powerPlayed = (game.you.powerPlayed ?? 0)
    + game.lanes.reduce((sum, lane) => sum + lane.you.reduce((s, c) => s + c.value, 0), 0);
  game.foe.powerPlayed = (game.foe.powerPlayed ?? 0)
    + game.lanes.reduce((sum, lane) => sum + lane.foe.reduce((s, c) => s + c.value, 0), 0);
  game.justResolved = true;
  // A round can kill both sides at once (each lane won deals 2 damage), so a
  // double knockout goes to the tiebreak, never to the order of two ifs.
  const bothDead = game.you.life <= 0 && game.foe.life <= 0;
  const winner = bothDead ? tiebreakWinner(game) : gameWinner(game);
  if (winner) {
    game.winner = winner;
    game.phase = 'over';
    return game;
  }
  if (game.round >= MAX_ROUNDS) {
    game.winner = tiebreakWinner(game);
    game.phase = 'over';
    return game;
  }
  for (const lane of game.lanes) {
    game.you.discard.push(...lane.you);
    game.foe.discard.push(...lane.foe);
    lane.you = [];
    lane.foe = [];
  }
  game.round += 1;
  startRound(game);
  return game;
}

/**
 * After the last round: more life wins, then more score, then more total
 * power played across the whole duel (tracked in powerPlayed, since the
 * discard pile is reshuffled into the deck when it runs dry). A full tie
 * goes to the player: home sand, home moon.
 */
export function tiebreakWinner(game) {
  if (game.you.life !== game.foe.life) return game.you.life > game.foe.life ? 'you' : 'foe';
  if (game.you.score !== game.foe.score) return game.you.score > game.foe.score ? 'you' : 'foe';
  const youPower = game.you.powerPlayed ?? 0;
  const foePower = game.foe.powerPlayed ?? 0;
  if (youPower !== foePower) return youPower > foePower ? 'you' : 'foe';
  return 'you';
}

export { isTideSuit };
