# Codex execution brief: Shadows of Acre

Build and finish a self-contained first-person stealth-infiltration vertical
slice in this workspace. The goal is to produce the highest-quality, original
browser stealth experience realistic for this repository and execution window.

## Product target

- A polished, immediately playable 5–8 minute infiltration mission.
- A historically grounded interpretation of Frankish Acre around 1250 CE,
  informed by UNESCO, archaeological, official Old Akko, and scholarly sources.
  Preserve the peninsula, harbour, land walls, military-order compounds,
  merchant quarters, dense lanes, and layered Byzantine/earlier fabric.
- Build the city from original procedural geometry, textures, lighting, and
  audio. Do not copy proprietary game assets, maps, UI, or branding.
- Desktop-first controls: WASD movement, mouse look, left-button sprint,
  right-button crouch, keyboard alternatives, interact, map, audio, and pause.
  The page must explain controls before pointer lock.
- The player is completely unarmed. There are no combat mechanics; route
  planning, patience, solid cover, and quiet movement are the only tools.
- Guards that patrol, see, hear, grow suspicious, investigate disturbances,
  and communicate awareness through readable sight cones.
- A day–night cycle: public daytime walking is tolerated; military interiors
  remain restricted; the land gate closes at night. Civilian traffic, lighting,
  and sound masking change with time. R / the pause menu rests exactly one hour.
- A complete loop: enter through the eastern gate, cross the city, take a
  sealed dispatch from the Hospitaller court, reach a harbour skiff, receive a
  stealth rating, fail on confirmed detection, and restart.
- Movement tradeoffs: crouching is quiet and less visible, walking is audible,
  and sprinting is fast but dramatically increases the hearing radius.
- A large cohesive city with cover, collision, atmosphere, recognizable
  historical landmarks, readable districts, multiple lanes, and no
  inaccessible mission objectives.
- Strong presentation: loading/start overlay, HUD, pause state,
  performance-conscious shadows, fog, post-processing, and responsive layout.

## Engineering requirements

- Use Vite, JavaScript modules, and Three.js.
- Keep source modular and readable. Use no remote runtime assets or APIs.
- Generate original procedural textures and sound effects. Bundled CC0 scanned
  surfaces may supplement them; document their sources and never require a
  third-party runtime asset service.
- Preserve the higher-detail architecture, cloth/mail, period-informed people,
  rounded ship hulls and fore-and-aft lateen rigs. Desktop surfaces use 2K maps;
  compact devices use 1K. Keep historical evidence separate from conjecture.
- The production build must pass without warnings that indicate broken code.
- Handle pointer-lock loss, resize, muted audio, and browsers where Web Audio
  is unavailable.
- Target smooth play on a current desktop browser; bound particles, enemies,
  shadow casters, and expensive effects.

## Validation loop

1. Run the production build and fix all errors.
2. Launch the game and inspect it at desktop and narrow viewport sizes.
3. Exercise start, movement, crouch, sprint/noise, guard suspicion, dispatch
   recovery, extraction, alarm failure, pause, and restart.
4. Critique visuals harshly for hierarchy, readability, clipping, flat
   lighting, inconsistent materials, weak feedback, and UI overlap.
5. Iterate on every material defect found, then rerun build and smoke checks.

Stop only when the repository contains a polished runnable vertical slice,
verification has passed, and remaining limitations are stated honestly.
