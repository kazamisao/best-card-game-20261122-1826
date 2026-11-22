// The deck: four suits, values 1 to 9, cost rising with value.
// A card's identity is its suit plus its value; the deck never holds two alike.
export const SUITS = ['Arus', 'Karang', 'Bulan', 'Angin'];

export const SUIT_GLYPH = { Arus: '≋', Karang: '◆', Bulan: '☾', Angin: '∿' };
export const SUIT_COLOR = { Arus: '#2fb3d8', Karang: '#ff7a59', Bulan: '#f2c14e', Angin: '#58c98a' };

export function cardCost(value) {
  return value <= 3 ? 1 : value <= 6 ? 2 : 3;
}

export function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= 9; value += 1) {
      deck.push({ suit, value, cost: cardCost(value), id: `${suit}-${value}` });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle driven by the given rng; returns a new array. */
export function shuffleDeck(deck, rng) {
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Draw `count` cards. When the deck runs dry the discard pile is shuffled
 * back in. Returns { drawn, rest, discard }.
 */
export function drawCards(deck, discard, count, rng) {
  let rest = deck.slice();
  let pile = discard.slice();
  const drawn = [];
  for (let n = 0; n < count; n += 1) {
    if (rest.length === 0) {
      if (pile.length === 0) break;
      rest = shuffleDeck(pile, rng ?? Math.random);
      pile = [];
    }
    drawn.push(rest.shift());
  }
  return { drawn, rest, discard: pile };
}
