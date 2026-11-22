// Staged screenshot scenes. Each one plays the real rules forward from a
// fresh seeded game — no hand-placed table — so every screenshot is a frame
// of a game that really happened.
import { newGame, startRound, playCard, endRound } from './state.mjs';
import { choosePlay } from './ai.mjs';
import { lanePower } from './rules.mjs';

/** The player's strong line: best affordable card into the lane it loses most. */
function playerStrong(game, limit) {
  let played = 0;
  for (;;) {
    if (limit !== undefined && played >= limit) return;
    let best = null;
    let bestGain = 0;
    for (const card of game.you.hand) {
      if (card.cost > game.you.energy) continue;
      for (let lane = 0; lane < 3; lane += 1) {
        if (game.lanes[lane].you.length >= 3) continue;
        const margin = lanePower(game.lanes[lane].foe, game.tide) - lanePower(game.lanes[lane].you, game.tide);
        const gain = card.value + margin;
        if (gain > bestGain) {
          bestGain = gain;
          best = { card, lane };
        }
      }
    }
    if (!best) return;
    playCard(game, 'you', best.card.id, best.lane);
    played += 1;
  }
}

/** The opponent's full turn, one card at a time, until it passes. */
function foeTurn(game, limit) {
  let played = 0;
  for (;;) {
    if (limit !== undefined && played >= limit) return;
    const play = choosePlay(
      game.foe.hand,
      game.foe.energy,
      game.lanes.map((lane) => lane.you),
      game.lanes.map((lane) => lane.foe),
      game.tide,
      game.rng,
    );
    if (!play) return;
    if (!playCard(game, 'foe', play.card.id, play.lane)) return;
    played += 1;
  }
}

/** Play whole rounds with the given player line until the game ends. */
function playOut(game, playerLine) {
  while (game.phase === 'play') {
    playerLine(game);
    foeTurn(game);
    endRound(game);
  }
  return game;
}

/**
 * Stage a scene and return { game, screen } where screen is 'title', 'duel',
 * 'win' or 'lose' — the overlay the screenshot should show over the table.
 */
export function stageShot(name, seed) {
  if (name === 'win') {
    const game = newGame(seed);
    startRound(game);
    playOut(game, playerStrong);
    return { game, screen: game.winner === 'you' ? 'win' : 'duel' };
  }
  if (name === 'lose') {
    const game = newGame(seed);
    startRound(game);
    playOut(game, () => {});
    return { game, screen: game.winner === 'foe' ? 'lose' : 'duel' };
  }
  if (name === 'duel') {
    const game = newGame(seed);
    startRound(game);
    for (let round = 1; round <= 2 && game.phase === 'play'; round += 1) {
      playerStrong(game);
      foeTurn(game);
      endRound(game);
    }
    if (game.phase === 'play') {
      // Round 3, mid-play: two cards each on the table, three left in hand.
      playerStrong(game, 2);
      foeTurn(game, 2);
    }
    return { game, screen: 'duel' };
  }
  const game = newGame(seed);
  startRound(game);
  return { game, screen: 'title' };
}
