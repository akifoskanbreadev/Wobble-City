# Wobble City

A mobile-first platform game about a goose with a **really** wobbly neck. Touch the golden egg with your *head*.

The game:https://akifoskanbreadev.github.io/Wobble-City/

Play it by opening `index.html` (or serving the folder with any static server, e.g. `python3 -m http.server`). Works on phones in landscape.

## Controls
- **Touch:** left thumb ◀ ▶ to walk, right thumb FLAP (hold to glide), drag the NECK pad to aim your neck, HONK for fun.
- **Keyboard:** ← → / A D walk, Space flap (hold to glide), hold mouse to aim the neck, H honk, T slow motion, R respawn, Esc menu.

## Features
- **103 levels**: the 33-level main campaign (finishing it unlocks the minigames) plus **70 bonus levels** in seven themed worlds that ramp up in difficulty. Completed levels turn green, perfect runs (no falls, all bread) turn gold, and your best time is kept. With hills, valleys hills, valleys, ponds, bounce pads, thorns, ice, moving platforms, walls, a tunnel and tall climbs, in seven themes (meadow, desert, snow, sunset, night, candy, lava).
- **5 difficulties** (Easy / Normal / Hard / Insane / **Spaghetti**): the harder it is, the harder the neck wobbles and twitches. Spaghetti is almost impossible: the neck whips about at random and the neck pad is haunted.
- **Menu button** (☰) in every game brings you back to the main menu.
- **Bread** is the currency. Collect it in levels and spend it in the **Goose Boutique** (about 90 hats, glasses, neckwear, body items, shoes and particle trails) and **18 skins** (goose, chicken, penguin, duck, black swan, flamingo, ostrich, parrot, owl, turkey, rubber duck, golden goose, giraffe, llama, dino, cat, bunny, frog).
- **Minigames** unlock when you finish all 33 levels: Goose Tetris, Goose Up (5 minutes to climb as high as you can), Bread Rush, Flappy Goose and Honk Hero.
- **Code box** in the menu (type a code again to turn it off):
  - `lol`: unlock all minigames
  - `speed`: super-fast goose
  - `neck`: a much longer neck
  - `money`: infinite bread for the shop
  - `flaps`: infinite flaps
  - `levels`: every level available
  - `moon` (low gravity), `rainbow` (rainbow trail), `disco` (colour-shifting screen), `shield` (thorns and enemies can't hurt you), `zoom` (wider camera)
  - `skins`, `clothes`, `bread`: one-time gifts (every skin, every cosmetic, +500 bread)
  - `akif`: lists every available code
  - `admin`: adds the **admin console** (it no longer switches codes on by itself; the console has an optional "Turn ALL codes on" button) (⚙ button): god mode, toggle any code, level jump, difficulty, gravity slider, enemy spawner, set bread, unlock everything, save export/import/reset, live debug info. It only appears with the admin code; ⏭ / N wins the current level
  - Codes are switched off during multiplayer games
  - The **Active codes** button lists what's on, with a red ✕ next to each to remove it
- **Enemies** (menu toggle): grumpy blobs and bats you can stomp for bread, and spiky urchins (Hard and up) you must avoid. Touching one bonks you backwards.
- **Multiplayer** (👥 in the menu, up to 4 players): everybody types the same room word and joins the same room. The first person to use a word hosts it; matchmaking uses the free public PeerJS broker (loaded from a CDN), then browsers connect directly (WebRTC). Specialised maps: 8 race tracks (or any campaign level), 5 tag arenas (Goose Arena, Skyline, Pond Party, Ice Rink, Pillar Park) and 4 hide & seek maps (Yard, Bush Village, Frozen Forest, Night Garden), or pick a random map. Modes: **Race** (first to the egg), **Tag** (least time as "it" wins), **Hide & Seek** (seekers are blindfolded while hiders hide in bushes; found hiders become seekers) and **Minigame duel** (same seed, highest score wins). The room ends when the host leaves. Some networks (strict NATs, some mobile data / school Wi-Fi) block direct connections.
- Extras: a 🔊 sound toggle, a different honk for each skin (chicken bok, duck quack, cat meow, owl hoo…), a daily +50 bread gift, and a progress line in the menu.
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
- `js/skins.js`: the 18 skins
- `js/enemies.js`: enemy generation, movement and drawing
- `js/mp.js`: pairing, ghost players and the multiplayer modes
- `js/minigames.js`: the five minigames
- `js/game.js`: rendering, input, saves, store, game flow


## Latest additions
- **Scenery**: every level theme has its own non-collidable props, far landmarks, sun/moon and textured terrain.
- **Deadly enemies**: themed enemies now kill you unless you stomp them from above (toggle with *Enemies*).
- **Battle Tower** (menu): pick up weapons and armor, defeat every monster on a floor, open the chest and take the door up. Boss every 5th floor. Attack with F / J or the on-screen button.
- **Neck mode** (menu toggle): no legs. Hold left/right (or aim the neck) to throw your head out, plant it and drag yourself along.
- Level picker now separates campaign and bonus levels.
- **Multiplayer lobby**: after joining a room you land in a waiting lobby with four player slots. The host picks the mode and map, guests press Ready, and the host starts. "Copy invite link" shares a `?room=word` URL that joins automatically, and "Make a random room" picks a word for you.
- **15 minigames** (all with themed backdrops, all usable in duels): Goose Tetris, Goose Up, Bread Rush, Flappy Goose, Honk Hero plus new Pond Dash, Whack-a-Fox, Goose Snake, Simon Honk, Space Goose, Egg Stack, Bread Breaker, Feather Storm, Goose Cannon and Quick Draw.

## Shop
15 dress-up slots (hat, eyes, face, beak, neck, body, back, held, tail, legs, shoes, pet, aura, honk voice, trail), ~190 items, 40+ skins including shape skins that change your real body (chonk, stilts, longneck, blob...), per-slot colour tints, Random outfit and Take everything off buttons.

## Weather, bosses and Mega Worlds
- **Bosses** at levels 10 (Angry Farmer), 20 (Giant Fox) and 33 (Lava Dragon): touch the egg to enter an arena, stomp or honk the boss to win, then grab the egg.
- **Weather & waves** (levels 104-115, open after level 33): wind gusts that blow your neck, rain slipperiness, snow, storms, and choppy water with waves.
- **Mega Worlds** (levels 116-130, long levels in 5 new environments: sky islands, jungle ruins, crystal caverns, clockwork factory, outer space) with fans, crumbling platforms, conveyor belts, saw blades, portals, switch gates, low gravity and anti-gravity lifts. Some also have weather.
- Clouds are now soft procedurally-painted cumulus in three parallax layers, tinted per environment.

## Latest additions
- **Levels:** 20 weather levels, 30 Mega levels, 10 completely underwater Deep Sea levels (163 total).
- **Weather:** lightning (warning ring, then strike), hail, whiteout fog, stronger wind.
- **Enemies:** charger, hopper, turret, diver, jellyfish, pufferfish, eel, shark.
- **Bosses:** more HP, attack patterns, and they can only be hurt while tired or dazed.
- **Skins:** layout shapes (Lovely Dog etc.), jelly soft-body skins, and Build-a-Goose (1000 each).
  Build-a-Goose uses a built-in text generator, not a real AI model.
- **Code `sync`:** match a secret word (5+ letters) on two devices that are online at once; saves merge peer-to-peer (PeerJS).
- **Plumber Goose / Pipe Twin:** original plumber geese (red and green caps).
- **Real AI for Build-a-Goose (optional):** deploy `ai-proxy/worker.js` (Cloudflare Worker, key kept as a secret), then run `localStorage.wobbleAiUrl='https://YOUR-WORKER.workers.dev'` in the game's console. Without it the built-in generator is used.
