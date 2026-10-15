# Wobble City

A mobile-first platform game about a goose with a **really** wobbly neck. Touch the golden egg with your *head*.

The game:https://akifoskanbreadev.github.io/Wobble-City/

Play it by opening `index.html` (or serving the folder with any static server, e.g. `python3 -m http.server`). Works on phones in landscape.

## Controls
- **Touch:** left thumb ◀ ▶ to walk, right thumb FLAP (hold to glide), drag the NECK pad to aim your neck, HONK for fun.
- **Keyboard:** ← → / A D walk, Space flap (hold to glide), hold mouse to aim the neck, H honk, T slow motion, R respawn.

## Physics
`js/physics.js` is a small custom engine (small-step XPBD) at real-world scale: 100 px = 1 m, g = 9.81 m/s², goose ≈ 4 kg.
- The neck is a 20-link soft chain with real compliance and weak "muscles"; the muscles push back on the body, so a swinging head throws the goose off balance.
- Coulomb friction, quadratic air drag (glide lift ∝ v²), buoyancy and viscous drag in water.
- Slow-mo button (🐢) lets you admire it.

## Files
- `index.html`: page, HUD, touch controls
- `js/physics.js`: engine and goose
- `js/levels.js`: 5 levels
- `js/game.js`: rendering, input, game flow
