// The duel's arithmetic: lane strength, lane winners, round scoring and the
// end of the game. Pure functions over plain data, so tests and screenshots
// can replay any table exactly.
import { tideBoost } from './tide.mjs';

/** A lane's strength: card values plus the tide bonus on each tide card. */
export function lanePower(cards, tide) {
  let total = 0;
  for (const card of cards) total += card.value + tideBoost(card, tide);
  return total;
}

/** 'you' or 'foe' for the stronger side in one lane, null on a tie. */
export function resolveLane(yourCards, foeCards, tide) {
  const yours = lanePower(yourCards, tide);
  const theirs = lanePower(foeCards, tide);
  if (yours > theirs) return 'you';
  if (theirs > yours) return 'foe';
  return null;
}

/**
 * Settle every lane of a round. Each lane won scores 1 point and deals 2
 * damage to the loser's life; tied lanes change nothing. Returns fresh
 * totals plus one result per lane ('you', 'foe' or null).
 */
export function resolveRound(table) {
  const you = { ...table.you };
  const foe = { ...table.foe };
  const laneResults = table.lanes.map((lane) => resolveLane(lane.you, lane.foe, table.tide));
  for (const winner of laneResults) {
    if (winner === 'you') {
      you.score += 1;
      foe.life -= 2;
    } else if (winner === 'foe') {
      foe.score += 1;
      you.life -= 2;
    }
  }
  return { you, foe, laneResults };
}

/** 'you' or 'foe' once a life has fallen to zero, else null. */
export function gameWinner(sides) {
  if (sides.you.life <= 0) return 'foe';
  if (sides.foe.life <= 0) return 'you';
  return null;
}
