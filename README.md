# Wobble City

A mobile-first platform game about a goose with a **really** wobbly neck. Touch the golden egg with your *head*.

The game:https://akifoskanbreadev.github.io/Wobble-City/

Play it by opening `index.html` (or serving the folder with any static server, e.g. `python3 -m http.server`). Works on phones in landscape.

## Controls
- **Touch:** left thumb ◀ ▶ to walk, right thumb FLAP (hold to glide), drag the NECK pad to aim your neck, HONK for fun.
- **Keyboard:** ← → / A D walk, Space flap (hold to glide), hold mouse to aim the neck, H honk, T slow motion, R respawn, Esc menu.

## Features
- **103 levels**: the 33-level main campaign (finishing it unlocks the minigames) plus **70 bonus levels** in seven themed worlds that ramp up in difficulty. Completed levels turn green, perfect runs (no falls, all bread) turn gold, and your best time is kept. With hills, valleys, ponds, bounce pads, thorns, ice, moving platforms, walls, a tunnel and tall climbs, in seven themes (meadow, desert, snow, sunset, night, candy, lava).
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

## More features
- **Scenery & weather**: every theme has its own props, landmarks and sky; 20 weather levels (wind, rain, snow, storms, lightning, hail, fog, waves).
- **163 levels**: campaign, 70 bonus levels, 30 Mega levels (fans, crumbling platforms, belts, saws, portals, gates, anti-gravity) and 10 Deep Sea levels. Bosses at levels 10, 20 and 33.
- **Enemies** (menu toggle): stomp them for bread; some are deadly, some live underwater.
- **Battle Tower**, **15 minigames**, **Neck mode** (no legs) and an online multiplayer lobby (Race, Tag, Hide & Seek, Minigame duel).
- **3D Hide & Seek** (menu): blocky neck-less geese, 15 big 3D maps with 130+ hiding places each, bots, hats, minimap, touch controls and online rooms for up to 8. Uses a tiny WebGL renderer in `js/h3d_engine.js`.
- **Plumber Goose / Pipe Twin**: original plumber geese (red and green caps).

## New modes and owner
- **🦎 Mecha Chameleon** (2D): robot chameleon goose. SCAN a prop and MORPH into it, hide among copies, avoid the seeker's scanner; or play the seeker and find the bot hider.
- **🚀 Goose Among Us** (solo with bots, or online with up to 10 friends via a room word; the host runs the rules and bots fill empty seats; owner tray: x-ray, invisible, speed, noclip, no cooldown, force meeting/win): geese do tasks, a Fox sneak-kills; report bodies, discuss and vote.
- **3D Hide & Seek** hiding is now physical: stand still inside cover (bush, haystack, tent...) or walk into the orange door pad of a cupboard (locker, wardrobe, crate...). Seekers open them by walking in.
- **Deep Sea** levels: bread rings, bubble columns, mine tunnels, kelp doors, secret grottos and a chasing giant fish.
- **Owner** (`akif`): owner panel with tools, an owner PIN and locks for cheat codes (server-stored). Never locked: sync, codes, akif, rainbow, disco, zoom. PIN-verified owner gets x-ray in 3D Hide & Seek.

## Shop
15 dress-up slots (hat, eyes, face, beak, neck, body, back, held, tail, legs, shoes, pet, aura, honk voice, trail) plus a **Physics** slot (Moon Gravity, Heavy Goose, Speed Demon, Turbo Flaps, Noodle Neck, Steel Neck and more, one active at a time), 190+ items, 40+ skins (shapes, jelly soft-bodies, Build-a-Goose), per-slot tints, Random outfit and Take everything off.

## Build-a-Goose AI
A tick box ("🤖 Use AI to design it") makes a Llama model (not Claude) design your goose: colours, shape, neck and legs, extra parts and physics. If the AI is unreachable the built-in generator is used.

## Sync
Type `sync`, pick a secret word (6+ characters). **Sync** merges, **Load** replaces this device with the saved game, **Lock** (with a PIN) stops anyone else loading or changing that word. The word is permanently linked to your saved game on the server (only its hash is stored as the key). Enter it on any device, at any time; the devices never need to be on together. After that the game pulls when it opens and pushes while you play. Anyone who knows the word can load or replace that save, so make it unusual.

## Files
- `index.html`: page, menus, HUD, touch controls
- `js/physics.js`: engine and goose; `js/game.js`: rendering, input, saves, store, game flow
- `js/levels.js`, `js/mech.js`, `js/decor*.js`, `js/clouds.js`: levels, mechanics, scenery
- `js/clothes*.js`, `js/skins*.js`, `js/buildagoose.js`, `js/bagui.js`, `js/bagai.js`: shop, skins, Build-a-Goose
- `js/enemies.js`, `js/boss.js`, `js/battle.js`: enemies, bosses, Battle Tower
- `js/mp.js`, `js/minigames*.js`: multiplayer and minigames
- `js/h3d_*.js`, `js/hide3d.js`: 3D Hide & Seek
- `js/sync.js`: save sync; `ai-proxy/worker-free.js`: the small Cloudflare Worker behind AI and sync


## Accounts, ranks and the akif panel
- Sign in with a name + password (only a hash is stored, passwords are never shown; the owner can reset one).
- Ranks: admin code, head admin (the owner picks people in the panel), akif PIN (owner). Rank shows next to names in the player list.
- Owner panel: troll / prank screens / locks / bans (with removal time) can target everyone or chosen players. Bans and locks are enforced by the client, so a modified client could bypass them.
- Re-paste the full `ai-proxy/worker-free.js` into Cloudflare for the account/ban/friend-code ops.
- Head admins are picked from the player list (with search) in the akif panel; there is no friend code any more.

## Battle Arena, co-op tower and more
- **🥊 Battle Arena** (menu): fight bots with weapon crates and hearts, first to 8 knockouts in 150 s. Online (lobby mode "Battle Arena") you fight friends and bots together.
- **🗼 Co-op Battle Tower** (lobby mode): the host simulates monsters, everyone shares floors; downed players come back when the floor is cleared; the run ends when everyone is down.
- **Random lobby** buttons in every online mode find other players who press it too.
- **Helper geese** Tot, Cheddar and Bartholamew (bottom-left button): ask anything, they look at a screenshot of your screen and answer using this README; "Conversation done" sends them away. Needs the updated worker.
- **Among Us**: roles (detective, jester, etc.), typed chat plus phrase buttons, chat log (L), ability button (C), line-of-sight flashlight.
- **Meccha Chameleon**: 15 big stages.
- Re-paste the full `ai-proxy/worker-free.js` into Cloudflare to enable helper geese and accounts.
- **Chungas** (4th helper goose, gold and purple, 👑 HEAD badge): a real second goose that plays beside you in platformer levels and obeys the helper chat (follow, stay, come, go left/right, run to the egg, honk, jump, dance). The helper panel shows 🟢 live AI (Cloudflare Workers AI) or 🔴 offline with the reason. He is a built-in character, not a server account, and his HEAD badge cannot ban or lock anyone.
- **Free play multiplayer**: lobby mode "Free play" lets everyone play any normal level together (you see each other's geese). **In-game chat** (Enter or the 💬 button, quick phrases, rude words are starred out) works in every online platformer mode.
- **Chungas as deputy owner**: when the OWNER asks he can give any item or skin, switch codes (not akif/sync/admin), give up to 5000 bread, kick players from a room you host, and announce in chat. When a head admin or admin asks he can give clothes, fun codes (rainbow, disco, zoom, speed, neck, flaps, moon, lol), up to 500 bread, kick and announce. Anyone else gets a polite no. He can never ban, reset passwords, delete anything or change ranks. This is checked in your browser, so it is not tamper-proof, and he cannot edit the game's source files.
- **Customising the game with Chungas** (owner: wide ranges, head admin/admin: narrow ranges): gravity, walk speed, neck length, colour hue, screen tint, menu title and falling emoji ("rain"). Values are clamped by a strict schema, saved on this device only, and can always be reset or undone ("reset my customisations", works offline too). A second AI, the **Guard**, reviews every powerful Chungas action (tweaks, items, codes, bread, kicks, announcements) before it runs, and if it can't be reached the action is refused. The hard limits live in code; the Guard is an extra check, not a guarantee. Neck changes apply from the next level.
- **Build-a-Goose upgrades**: 🎲 3 versions, 🔍 AI look & improve (the AI sees a picture of your goose), ↩ undo, 🎨 palettes, 🧬 blend with a saved goose. **Chungas can drive it**: ask him to build, change or improve the goose in the workshop; he only makes the draft, you save it and pay the normal bread. The Guard reviews what he asks for.
- **Moderation**: the owner can appoint **moderators** (akif panel, 🛡 Moderators tab). A moderator gets a 🛡 MOD button with the chat reports, can kick and ban (up to 30 days) and unban normal players, and has an AI triage that suggests what to do. They can never act on staff and have no pranks, locks, codes or tools. Severe chat is reported automatically, every chat line has a ⚑ report button, and rude words are starred out (online chat and Among Us chat). The worker checks the moderator's account on every action. Re-paste the full `ai-proxy/worker-free.js` to enable this.
- **Sentry** (5th helper goose, blue cap and badge): the security goose. Anyone can ask him about staying safe or have him report a player. Moderators and the owner can also have him list reports, dismiss them, kick, ban (up to 30 days) and unban (the Guard reviews each kick or ban), and he can watch the chat with AI and report severe messages. He cannot prank, lock, reset or delete anything.
- The Guard is relaxed for staff: prank screens, items, codes and tweaks from admins, head admins and the owner are normal. Chungas can also show prank screens (on your own screen, or the owner can send one to a named player). All helper geese read the game's own live data (codes, shop, levels, minigames, modes, pranks, ranks) so they know the whole game.
- **Staff panels (owner and head admin)** now share one layout: 📊 Overview (accounts, who is online, quick actions, latest staff actions), 👥 Players (search, filters, select shown, message, remove from game, reset password, delete, rank), 🛠 Tools, 😈 Troll, 🎭 Pranks, 🔒 Locks, 🧡 Head admins, 🛡 Moderators and 📜 Log. A **head admin can do everything the owner can except bans and changing the game through Chungas**, and cannot touch the owner or other head admins. Every staff action is written to the log. Re-paste the full `ai-proxy/worker-free.js` for this.
- The Guard now only watches for two things: game changes that would make the game bad, and accidental kicks or bans by Sentry. Ranks are still checked by the game's code.

### Your avatar in every mode
Among Us (Foxes) now draws your real goose: your skin, hat, glasses, scarf, clothes and shoes, all fitted to the goose. Online players send their look too; bots get random outfits. Chameleon seekers wear your avatar (hiders stay painted so camouflage still works). In 3D Hide & Seek the goose is now rounded with a short wobbly neck, and it wears your hat, glasses, scarf, clothes colour and shoe colour.

### Arena update
The 🥊 Battle Arena button now asks how you want to play: fight real players online (quick match: the first player hosts, and the match auto-starts 8 seconds after someone joins, bots fill empty slots), play with friends via a room word, or solo vs bots. New weapons: Battle Axe, Quick Dagger, Slingshot, Bread Cannon, Flame Staff. New arenas: Lava Bridge, Night Market, Broken Ruins.

### More to wear
15 new skins (Galaxy, Rainbow, Lava, Cow, Tiger, Zebra, Strawberry, Banana, Neon, Crystal, Golden, Mint, Plum, Candy, Spooky) and 18 new clothes: hats (Pirate, Wizard, Viking, Chef, Halo, Devil Horns, Cowboy, Traffic Cone), eyewear (Heart Glasses, Monocle, 3D Glasses, Cyber Visor), neckwear (Bandana, Gold Medal, Bling Chain) and shoes (Roller Skates, Flippers, Bunny Slippers).

### Owner / head admin: more fun
New 🎉 Fun tab (works on yourself, selected players or everyone): emoji rains (confetti, snow, hearts, pizza, geese, stars, fire, money, bread), party starters (full party, disco, movie night, neon, VHS, matrix), on-screen shows (countdowns, scrolling announcement banner, fake achievement popups), gifts, a bread raffle and chaos roulette. Seven new screen effects and two new time speeds in Troll. Overview has Party, Countdown and Announce quick buttons.

### Spin the Bottle 🍾
New party mode in the menu: 4 to 8 geese stand in a circle wearing their real avatars. Spin the bottle, it lands on a goose, they pick Truth or Dare (silly and clean prompts, typed answers are word-filtered), and the others vote 👍 or 👎. A 👍 majority earns a 🍞 point, skipping earns a 🐔. Everyone spins in turn; most points wins bread. Play solo with bots, or online via a room word or a random lobby (the host runs the rules, bots fill empty places and take over if someone leaves).

### Spin the Bottle: shooting modes
Pick a mode in the lobby: 🤔 Truth or Dare, 🎯 Eliminator (when the bottle lands on you, pick a goose to blast out with the cartoon Bread Blaster; last goose standing wins), 🌑 Lights Out (the shot happens in the dark: the geese are shuffled and unnamed, you pick a number and might hit yourself) and 🎲 Lucky Blaster (the blaster only works 50% of the time). Blasted geese turn into a slice of toast. All work solo with bots or online.
