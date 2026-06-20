# ng-scoundrel

A responsive, single-player implementation of Scoundrel built with Angular 21. The game
uses a standard 44-card dungeon, automatically restores interrupted runs, and works offline
after the first successful load.

## Development

Requirements:

- Node.js 22
- npm 10

Install dependencies and start the local server:

```bash
npm install
npm start
```

Open `http://localhost:4200`.

Run the test suite and production build:

```bash
npm run test:ci
npm run build
```

## Rules

- Remove the red aces and face cards from a standard deck, leaving 44 cards.
- Black cards are monsters. Their rank is their damage; jacks through aces are worth 11–14.
- Diamonds are weapons and hearts are healing potions, each worth their numbered rank.
- Draw four cards, resolve three in any order, and carry the remaining card into the next room.
- A weapon reduces monster damage by its value. After its first kill, it can only fight monsters
  whose value is no greater than the previous monster defeated with that weapon.
- Only the first potion used in each room restores health. Health cannot exceed 20.
- A full room can be moved to the bottom of the dungeon, but two rooms cannot be avoided in a row.
- Clear every card without reaching zero health to win.

## GitHub Pages

The included workflow tests and builds the app for the `/ng-scoundrel/` base path, then deploys
the browser bundle through GitHub Pages.

After creating and pushing a GitHub repository named `ng-scoundrel`:

1. Open **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to the `main` branch or run the workflow manually.

The expected URL is `https://<username>.github.io/ng-scoundrel/`.

## Architecture

The rules engine under `src/app/game` is pure TypeScript and does not depend on Angular.
Angular owns presentation, browser persistence, offline caching, and user interaction. There is
no backend or authentication. Active games and aggregate statistics are stored locally in the
browser.

## Offline use

The production build includes an Angular service worker and installable web app manifest. Open
the deployed app once while online so its application shell and local fonts can be cached. After
that, it can be reopened and refreshed without a network connection.

Active runs are saved after every action. If the browser or installed app is closed by the
operating system, reopening Scoundrel resumes the exact room, card positions, health, weapon,
and dungeon order. Victory and defeat clear the active save after recording statistics.
