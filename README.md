# Pasang & Purnama — Duel Kartu Tiga Pantai

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/kazamisao/best-card-game-20261122-1826/rank.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/kazamisao/best-card-game-20261122-1826/reward.svg)](https://make.fun/c/best-card-game-20261122-1826)

A complete, original card game for the make.fun best card game bounty. One-on-one duels across three beach lanes, under a tide that strengthens one suit each round.

## How it plays

- **Three lanes** — Pantai Utara, Pantai Tengah, Pantai Selatan. Play cards from your open hand into a lane; your opponent's hand stays face-up, so every move is readable and answerable.
- **Cards** — each card has a value (1–9), a suit (Arus, Karang, Bulan, Angin) and a cost in energy (1–3). Suits are told apart by colour, glyph and name together.
- **The tide** — each round the moon's pull strengthens one suit by +2 power. The banner names the suit in large type, so planning around it is the heart of every hand.
- **Scoring** — at the end of a round, each lane's stronger side scores 1 point and deals 2 damage to the other side's life (20 each). Ties deal nothing. The duel ends when a life falls to zero, or after 12 rounds on life, then score, then power played.
- **Energy** — you start each round with 3 energy, growing by 1 per round up to 6. Cheap cards early, heavy cards late.

## Controls

Mouse or keyboard: click a card, then click a lane. Keys `1–5` pick a card from your hand, `Q`/`W`/`E` place it in the north/centre/south lane, `Enter` ends the round.

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

The game is static files under `game/` with no network requests. `main.ts` hands it in: it copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library.

## Screenshots

The four screenshots are real renders of the game's own code, staged through `?shot=` scenes that play the actual rules forward from a fixed seed: the duel table (cover), the title screen, the win screen and the loss screen.
