# Music Neighbourhood UX Prototype

A standalone **React + TypeScript + Vite** frontend prototype for exploring artist neighbourhoods with animated bubble transitions.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

## What this prototype includes

- Animated artist bubble graph with transition phases (`idle`, `inflate-selected`, `explode-out`, `recenter-new-active`, `fly-in-new-neighbours`, `collision-pulse`, `settle`).
- Manual artist lookup (by ID or name, case-insensitive).
- Mock right-side media panel (albums/tracks) with explicit play icon actions.
- Mock bottom player selector / mini-player with **Seed from current player**.
- Visible inline errors and event log for mock playback actions.

## Mock player controls

- Selecting a player updates only player selection state.
- It does **not** auto-change graph artist.
- Press **Seed from current player** to transition graph to the selected player’s current artist, if mock neighbourhood data exists.

## Mock media cards

- Pressing the play icon triggers a mock playback event and logs it in the on-screen event log.
- Clicking the card body explores the card artist (switches graph) when neighbourhood data is available.
- Card clicks do not start playback accidentally.

## Intentionally not implemented yet

- Home Assistant integration/panel registration
- Music Assistant API
- Last.fm API
- Authentication/tokens
- Backend/proxy/websocket logic
- Persistent settings

This project is strictly an animation + UX prototype before Home Assistant, Music Assistant, and Last.fm integration.
