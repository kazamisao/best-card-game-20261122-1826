// The opponent: a greedy reader of the table. It weighs every card it can
// afford in every lane and scores each play by the card's own strength
// (value plus the tide bonus), with +10 for flipping a lane it loses into
// one it wins, +2 for widening a lead it already holds, and -1 for feeding
// a lane it still loses; a small jitter breaks ties. It passes when no play
// scores above zero.
import { lanePower } from './rules.mjs';

const LANE_CAP = 3;

/**
 * Pick one play { card, lane } or null to pass. `yours` are the player's
 * cards per lane, `mine` the opponent's own cards per lane.
 */
export function choosePlay(hand, energy, yours, mine, tide, rng) {
  let best = null;
  let bestScore = 0;
  for (const card of hand) {
    if (card.cost > energy) continue;
    for (let lane = 0; lane < 3; lane += 1) {
      if (mine[lane].length >= LANE_CAP) continue;
      const before = lanePower(mine[lane], tide) - lanePower(yours[lane], tide);
      const after = before + card.value + (card.suit === tide ? 2 : 0);
      let score = after - before;
      if (before <= 0 && after > 0 && yours[lane].length > 0) score += 10; // flipping a contested lane is the prize
      if (before > 0 && after > 0) score += 2; // widening a lead still counts
      if (before <= 0 && after <= 0) score -= 1; // feeding a lost lane is wasteful
      score += rng() * 0.5; // small jitter breaks ties without hiding intent
      if (score > bestScore) {
        bestScore = score;
        best = { card, lane };
      }
    }
  }
  return best;
}
