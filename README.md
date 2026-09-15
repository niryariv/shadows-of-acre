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
- `R` — rest for one game hour on dry ground (also available in the pause menu)
- `V` — mute/unmute procedural audio
- `Esc` — release the mouse and pause

The player enters unarmed. Success depends entirely on completing the mission
without being confirmed by the watch. Guards can see, hear, and investigate
disturbances, so timing, route choice, crowds, quiet movement, and darkness are your tools.
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
The **Sun / Moon Exposure** meter follows the active light source. Open ground
makes trespassers easier to see; buildings, walls and the Templar tunnel provide shelter.

## Day, night and rest

Arrive at 10:00 by default, or choose dusk, night or predawn in the opening screen.
One game hour takes 90 seconds of active play. The map and pause menu freeze the
clock; **Rest 1 hour** advances it by exactly an hour, including across midnight.
Your position and mission progress are preserved. Rest clears held movement,
but does not erase witnesses or rescue an already compromised mission.

- **Day, 06:00–18:00:** the land gate is open. Ordinary walking in public streets
  attracts no attention. More civilians circulate; market murmurs and footsteps
  mask your noise. Sprinting and knocking things over can still draw investigation.
- **Night, 18:00–06:00:** the gate physically closes, civilian traffic dwindles,
  and guards challenge strangers inside the city. Darkness reduces sight range,
  but small sounds carry farther. Ropes and the Templar tunnel remain useful.
- **Military interiors:** the Hospitaller inner court and Templar fortress remain
  restricted by day. Being seen trespassing creates a pursuit that continues if
  you return to a public street. Daylight is not immunity from being caught.

For example: walk through the gate in daylight, explore the public lanes, find
a sheltered place, then use R to wait for darkness before approaching the dispatch.
These fixed hours and crowd sizes are gameplay abstractions, not a population
estimate or a documented medieval gate timetable.

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
`npm run test:time` checks day/night boundaries, rollover, hearing and access rules.
`npm run test:visual` checks open arches, hull normals, garment geometry, pottery
and the bounded near/far crowd models; it also runs before deployment.
The arena test also verifies that the shut gate cannot be bypassed on dry ground,
reopens at dawn, and never closes through an occupant.

For browser regression tests, run the development server, install Playwright
in your development environment, then run `npm run test:browser`.
`npm run test:time-browser` additionally exercises rest, gate transitions,
daytime anonymity, nighttime detection, changing population and the frozen clock.
`npm run test:visual-browser` verifies 2K/1K texture loading, Retina rendering,
model budgets, and day/night/dawn views, and saves screenshots to the OS temp folder.
`PLAYWRIGHT_MODULE`, `CHROME_PATH` and `ACRE_TEST_URL` can point to an existing
Playwright installation, browser executable and development server. These tests
exercise actual input and interactions; development-only teleportation positions
the player for collision, dispatch, tunnel, extraction and detection checks.

Historical design notes and sources are in
[HISTORICAL_NOTES.md](./HISTORICAL_NOTES.md).

## Visual detail

Houses have dressed stone corners, stone-built arches and deeper window frames.
Guards and citizens use folded garments, detailed mail, period-informed headwear
and visible faces and hands. Ships have rounded hulls, laid decks, rope rigging
and fore-and-aft lateen sails; market goods include open eating and glazed bowls.
Historical evidence and reconstruction limits are documented in the notes above.

Desktop colour/normal surfaces use **2K textures**, with 1K surfaces retained for
compact/coarse-pointer and reported low-memory devices. Desktop rendering uses
sharper antialiasing and 2K shadows, adapts up to 2× pixel density where available,
and no longer adds film grain. Nearby people receive more detail than distant ones.
The six larger maps add about 19 MB on first load and are served locally, with
no runtime third-party API calls.

The masonry, cobblestone and plaster maps are CC0 material analogues from
[Poly Haven](https://polyhaven.com/license):
[Medieval Blocks 05](https://polyhaven.com/a/medieval_blocks_05),
[Cobblestone Floor 001](https://polyhaven.com/a/cobblestone_floor_001) and
[Plastered Wall](https://polyhaven.com/a/plastered_wall). They are not site scans
of Acre. The original 2K JPG files are bundled unchanged; 1K derivatives remain
available for the lighter rendering path.
