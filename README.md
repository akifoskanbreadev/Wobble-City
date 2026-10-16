# Wobble City

A mobile-first platform game about a goose with a **really** wobbly neck. Touch the golden egg with your *head*.

The game:https://akifoskanbreadev.github.io/Wobble-City/

Play it by opening `index.html` (or serving the folder with any static server, e.g. `python3 -m http.server`). Works on phones in landscape.

## Controls
- **Touch:** left thumb ◀ ▶ to walk, right thumb FLAP (hold to glide), drag the NECK pad to aim your neck, HONK for fun.
- **Keyboard:** ← → / A D walk, Space flap (hold to glide), hold mouse to aim the neck, H honk, T slow motion, R respawn, Esc menu.

## Features
- **33 levels** with hills, valleys, ponds, bounce pads, thorns, ice, moving platforms, walls, a tunnel and tall climbs, in seven themes (meadow, desert, snow, sunset, night, candy, lava).
- **5 difficulties** (Easy / Normal / Hard / Insane / **Spaghetti**): the harder it is, the harder the neck wobbles and twitches. Spaghetti is almost impossible: the neck whips about at random and the neck pad is haunted.
- **Menu button** (☰) in every game brings you back to the main menu.
- **Bread** is the currency. Collect it in levels and spend it in the **Goose Boutique** (27 hats, glasses, neckwear, capes and shoes).
- **Minigames** unlock when you finish all 33 levels: Goose Tetris, Goose Up (5 minutes to climb as high as you can), Bread Rush, Flappy Goose and Honk Hero.
- **Code box** in the menu (type a code again to turn it off):
  - `lol`: unlock all minigames
  - `speed`: super-fast goose
  - `neck`: a much longer neck
  - `money`: infinite bread for the shop
  - `flaps`: infinite flaps
  - `levels`: every level available
  - `admin`: turns on every code at once and adds admin tools (god mode, +1000 bread, own every item, and a ⏭ button / N key that wins the current level)
  - The **Active codes** button lists what's on, with a red ✕ next to each to remove it
- Progress is saved in `localStorage`.

## Physics
`js/physics.js` is a small custom engine (small-step XPBD) at real-world scale: 100 px = 1 m, g = 9.81 m/s², goose ≈ 4 kg.
- The neck is a 20-link soft chain with real compliance and weak "muscles"; the muscles push back on the body, so a swinging head throws the goose off balance.
- Coulomb friction, quadratic air drag (glide lift ∝ v²), buoyancy and viscous drag in water.
- Slow-mo button (🐢) lets you admire it.

## Files
- `index.html`: page, menus, HUD, touch controls
- `js/physics.js`: engine and goose
- `js/levels.js`: levels 1-8 by hand, levels 9-33 composed from reusable sections
- `js/clothes.js`: boutique items and how they are drawn
- `js/minigames.js`: the five minigames
- `js/game.js`: rendering, input, saves, store, game flow
