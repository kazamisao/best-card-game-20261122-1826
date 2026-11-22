// The tide: each round one suit rides the full moon's pull and every card of
// that suit plays two points stronger. The tide never stays on one suit.
import { SUITS } from './deck.mjs';

export const TIDE_BONUS = 2;

export function isTideSuit(suit, tide) {
  return suit === tide;
}

export function tideBoost(card, tide) {
  return card.suit === tide ? TIDE_BONUS : 0;
}

/** Pick the next tide suit at random, always different from the current one. */
export function nextTideSuit(current, rng) {
  const others = SUITS.filter((suit) => suit !== current);
  return others[Math.floor(rng() * others.length)];
}
