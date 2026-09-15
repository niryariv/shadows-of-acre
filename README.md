# Shadows of Acre

[Play Shadows of Acre live on GitHub Pages](https://niryariv.github.io/shadows-of-acre/)

An original first-person stealth-infiltration game built with Three.js and set
in a playable interpretation of Frankish Acre around 1250 CE. Enter through the
eastern land gate, cross the merchant quarters, recover a sealed dispatch from
the Hospitaller court, and escape by harbour skiff without being identified or
harmed.

The enlarged map follows Acre's medieval peninsula and includes Montmusard's
double land defenses, the north-western Hospitaller headquarters, the
south-western Templar fortress and passage, Italian merchant quarters, the
Cathedral close, the inner harbour, quays, ships, and the Burj al-Sultan area.
Crusader buildings incorporate Byzantine and earlier layers through reused
foundations and architectural fragments rather than presenting the 13th-century
city as wholly Byzantine. The Templar tunnel is a fully traversable concealed
route between the fortress precinct and harbour approach.

## Run it

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, choose **Mission** or **Exploration**, and
click **Begin**. A keyboard and mouse are required; allow mouse capture.

## Controls

- `WASD` — move
- Hold right mouse, `Ctrl`, or `C` — crouch and move quietly
- Hold left mouse or `Shift` while moving forward — run (fast, but loud)
- Mouse — look
- Hold `E` — interact, enter/leave the Templar tunnel, take the dispatch, or board the skiff
- Hold `M` — open the city map and pause the watch while planning
- `N` / `Shift+N` — next / previous historical place in Exploration
- `V` — mute/unmute procedural audio
- `Esc` — release the mouse and pause

The player enters unarmed. Success depends entirely on completing the mission
without being confirmed by the watch. Guards can see, hear, and investigate
disturbances, so route choice, quiet movement, and darkness are the only tools.
The start screen also offers **Exploration mode**. It keeps guard perception,
objectives, discoveries, swimming, and traversal active, but visual
confirmation cannot end the session; alarms become warnings so the city can be
explored without failure.
Eight optional historical stops explain the hospital, merchant communes,
fortifications and port. The map distinguishes excavated features from
interpreted buildings and streets. The guard orders guide remains in both modes.

The map draws the same solid footprints as the world, and the objective arrow
follows a navigable route around masonry. The gate approach, all sea entries,
tour stops and both tunnel stairs are checked automatically. Guards investigate
sound along accessible lanes; intervening stone muffles their hearing.

Brightness, mouse sensitivity and reduced camera motion are available in the
opening screen and pause menu. Preferences are saved on the device. Returning
from a pause clears held controls so the player cannot drift into danger.
The mission unfolds beneath a bright Mediterranean moon: open ground makes the
player easier to see, while buildings, walls, and the underground Templar tunnel
provide shelter. The live **Moon Exposure** meter shows when moonlight is raising
the risk of detection.

Rendering quality adapts to the device’s measured frame workload. The game uses
single-pass animated water, shared guard resources and distance models,
throttled shadows and HUD updates, a cached map, and dynamic resolution to
keep movement responsive in the densest city and harbour views.

Create a production bundle with:

```bash
npm run build
```

## Verification

`npm run test:arena` checks geometry, render budgets, guard spawns, all entry
routes, historical stops, the gate corridor and the complete tunnel route.
Navigation tests independently sample suggested paths against player collision.
These checks also run before each GitHub Pages deployment.

For browser regression tests, run the development server, install Playwright
in your development environment, then run `npm run test:browser`.
`PLAYWRIGHT_MODULE`, `CHROME_PATH` and `ACRE_TEST_URL` can point to an existing
Playwright installation, browser executable and development server. These tests
exercise actual input and interactions; development-only teleportation positions
the player for collision, dispatch, tunnel, extraction and detection checks.

Historical design notes and sources are in
[HISTORICAL_NOTES.md](./HISTORICAL_NOTES.md).

The scanned kurkar masonry, cobblestone, and plaster PBR surfaces are compact
1K derivatives of CC0 assets from
[Poly Haven](https://polyhaven.com/): Medieval Blocks 05, Cobblestone Floor 001,
and Plastered Wall.
