// Wiring: clicks, keys, the opponent's turn, and the ?shot= scenes used for
// screenshots. The game itself lives in state.mjs; this file only drives it.
import { newGame, startRound, playCard, endRound } from './state.mjs';
import { choosePlay } from './ai.mjs';
import { renderGame, showOverlay } from './render.mjs';
import { stageShot } from './shots.mjs';

const ui = {
  tide: document.getElementById('tide'),
  round: document.getElementById('round'),
  youLife: document.getElementById('you-life'),
  youScore: document.getElementById('you-score'),
  youEnergy: document.getElementById('you-energy'),
  foeLife: document.getElementById('foe-life'),
  foeScore: document.getElementById('foe-score'),
  foeEnergy: document.getElementById('foe-energy'),
  youHand: document.getElementById('you-hand'),
  foeHand: document.getElementById('foe-hand'),
  laneEls: [...document.querySelectorAll('.lane')],
  endRound: document.getElementById('end-round'),
  overlay: document.getElementById('overlay'),
  overlayGlyph: document.getElementById('overlay-glyph'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayText: document.getElementById('overlay-text'),
  overlayScore: document.getElementById('overlay-score'),
  overlayButton: document.getElementById('overlay-button'),
  status: document.getElementById('status'),
};

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 20261122) || 20261122;

let game;
let selected = null;

function refresh() {
  renderGame(game, ui);
  for (const el of ui.youHand.querySelectorAll('.card')) {
    el.classList.toggle('selected', el.dataset.cardId === selected);
  }
}

function finishOverlay() {
  if (game.phase !== 'over') return;
  showOverlay(ui, game.winner === 'you' ? 'win' : 'lose', {
    you: game.you.score,
    foe: game.foe.score,
    youLife: game.you.life,
    round: game.round,
  });
}

/** The opponent plays one card, pauses, then the next, until it passes. */
function foeTurnAnimated(done) {
  const play = choosePlay(
    game.foe.hand,
    game.foe.energy,
    game.lanes.map((lane) => lane.you),
    game.lanes.map((lane) => lane.foe),
    game.tide,
    game.rng,
  );
  if (!play || !playCard(game, 'foe', play.card.id, play.lane)) {
    done();
    return;
  }
  refresh();
  setTimeout(() => foeTurnAnimated(done), 450);
}

function endRoundFlow() {
  if (game.phase !== 'play') return;
  selected = null;
  ui.endRound.disabled = true;
  foeTurnAnimated(() => {
    endRound(game);
    refresh();
    if (game.phase === 'over') {
      setTimeout(finishOverlay, 600);
      return;
    }
    setTimeout(refresh, 900);
  });
}

function placeSelected(laneIndex) {
  if (!selected || game.phase !== 'play') return;
  if (playCard(game, 'you', selected, laneIndex)) {
    selected = null;
    refresh();
  }
}

ui.youHand.addEventListener('click', (event) => {
  const cardEl = event.target.closest('.card');
  if (!cardEl || game.phase !== 'play') return;
  selected = selected === cardEl.dataset.cardId ? null : cardEl.dataset.cardId;
  refresh();
});

for (const laneEl of ui.laneEls) {
  laneEl.addEventListener('click', () => {
    placeSelected(Number(laneEl.dataset.lane));
    laneEl.classList.remove('target');
  });
  laneEl.addEventListener('mouseenter', () => {
    if (selected) laneEl.classList.add('target');
  });
  laneEl.addEventListener('mouseleave', () => laneEl.classList.remove('target'));
}

ui.endRound.addEventListener('click', endRoundFlow);

ui.overlayButton.addEventListener('click', () => {
  if (game.phase === 'over' || ui.overlayTitle.textContent === 'Pasang & Purnama') {
    game = newGame((Date.now() % 90000) + 1000);
    startRound(game);
    selected = null;
    showOverlay(ui, null);
    refresh();
  }
});

document.addEventListener('keydown', (event) => {
  if (shotName) return;
  if (event.key >= '1' && event.key <= '5') {
    const card = game.you.hand[Number(event.key) - 1];
    if (card) {
      selected = selected === card.id ? null : card.id;
      refresh();
    }
  } else if (event.key === 'q' || event.key === 'Q') placeSelected(0);
  else if (event.key === 'w' || event.key === 'W') placeSelected(1);
  else if (event.key === 'e' || event.key === 'E') placeSelected(2);
  else if (event.key === 'Enter') endRoundFlow();
});

if (shotName) {
  const staged = stageShot(shotName, seed);
  game = staged.game;
  refresh();
  if (staged.screen === 'title') showOverlay(ui, 'title');
  else if (staged.screen === 'win' || staged.screen === 'lose') finishOverlay();
} else {
  game = newGame(seed);
  startRound(game);
  refresh();
  showOverlay(ui, 'title');
}
