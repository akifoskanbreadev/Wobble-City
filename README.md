# Wobble City

A mobile-first platform game about a goose with a **really** wobbly neck. Touch the golden egg with your *head*.

The game:https://akifoskanbreadev.github.io/Wobble-City/

Play it by opening `index.html` (or serving the folder with any static server, e.g. `python3 -m http.server`). Works on phones in landscape.

## Controls
- **Touch:** left thumb ◀ ▶ to walk, right thumb FLAP (hold to glide), drag the NECK pad to aim your neck, HONK for fun.
- **Keyboard:** ← → / A D walk, Space flap (hold to glide), hold mouse to aim the neck, H honk, T slow motion, R respawn, Esc menu.

## Features
- **8 levels** with hills, valleys, ponds, bounce pads, thorns, ice, moving platforms, a tunnel and a vertical cliff climb.
- **4 difficulties** (Easy / Normal / Hard / Insane): the harder it is, the harder the neck wobbles (and on Hard and Insane it twitches too).
- **Menu button** (☰) in every game brings you back to the main menu.
- **Bread** is the currency. Collect it in levels and spend it in the **Goose Boutique** (27 hats, glasses, neckwear, capes and shoes).
- **Minigames** unlock when you finish all 8 levels: Goose Tetris, Goose Up (5 minutes to climb as high as you can), Bread Rush, Flappy Goose and Honk Hero.
- **Code box** in the menu: type `lol` to unlock all minigames instantly.
- Progress is saved in `localStorage`.

## Physics
`js/physics.js` is a small custom engine (small-step XPBD) at real-world scale: 100 px = 1 m, g = 9.81 m/s², goose ≈ 4 kg.
- The neck is a 20-link soft chain with real compliance and weak "muscles"; the muscles push back on the body, so a swinging head throws the goose off balance.
- Coulomb friction, quadratic air drag (glide lift ∝ v²), buoyancy and viscous drag in water.
- Slow-mo button (🐢) lets you admire it.

## Files
- `index.html`: page, menus, HUD, touch controls
- `js/physics.js`: engine and goose
- `js/levels.js`: the 8 levels
- `js/clothes.js`: boutique items and how they are drawn
- `js/minigames.js`: the five minigames
- `js/game.js`: rendering, input, saves, store, game flow
