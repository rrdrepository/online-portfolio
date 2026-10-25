# Radin Mikael — Interactive 3D Resume

A pixel-art 3D workspace you explore instead of scroll. Built with React, React Three Fiber and drei.

## The pixel-art look

The room is still real 3D, but it is drawn like a pixel-art game:

- The scene renders at a low resolution (about 250 pixels tall) and is scaled up with hard edges. The **Chunky / Classic / Crisp** button in the top bar changes the pixel size.
- `src/scene/PixelArt.jsx` is a post-processing shader that draws dark outlines around objects and snaps every pixel to a fixed pixel-art palette (`PIXEL_PALETTE`). Change the palette there to restyle the whole room.
- Textures (wood, floor, cork, rug, walls) are drawn in detail, then shrunk to a few texels and shown without smoothing.
- The UI uses pixel fonts (Press Start 2P, Pixelify Sans, VT323), pixel borders, pixel cursors and frame-by-frame (`steps()`) animation.

## Things to play with

- **Quest log** (under the name): opening each section, and poking Radin, ticks off a quest. Finding all 6 gives a fanfare and confetti. The mouse and the cats are secret bonus finds. Progress is saved in the visitor's browser.
- **Time switcher** (bottom right): jump to morning, afternoon, evening or night. The room time-lapses to that hour. **Live** goes back to the real clock.
- **Hover**: objects hop up with a pixel outline and a tooltip. Clicking sets off a burst of pixels.
- **Cats** (afternoon): click one to make it hop and meow.
- **Keys 1–5** open each section; **Esc** closes.
- **8-bit sounds**: synthesised in the browser, only in response to clicks and hovers. The speaker button mutes them (remembered).

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

### Times of day

The room follows the current time in Kuala Lumpur:

| Period | Hours | What changes |
|---|---|---|
| Morning | 6:00–12:00 | Coffee (with steam) on the desk, dust drifting in the sunbeam |
| Afternoon | 12:00–17:00 | Two cats stroll through every 10 minutes (on :00, :10, :20 …) and once shortly after the page loads |
| Evening | 17:00–21:00 | The sun sets through the window, lamp comes on at dusk |
| Night | 21:00–6:00 | Radin falls asleep at the desk, laptop shows its lock screen, lamp stays on low |

To preview any hour, add `?hour=` to the URL:

- `http://localhost:5173/?hour=9` (morning)
- `http://localhost:5173/?hour=14` (afternoon, cats)
- `http://localhost:5173/?hour=18.6` (sunset)
- `http://localhost:5173/?hour=2` (night, asleep)

To follow each visitor's own clock instead, set `TIME_ZONE = null` in `src/hooks/useTimeOfDay.js`.

### Poking Radin

- Click his head, body or arms: he scratches his head, or turns round to see who touched him.
- Click his legs: he lifts his feet and peers under the desk, and a mouse runs out.
- At night: he stirs, mumbles and goes back to sleep.

The reactions live in `src/scene/Character.jsx` (`ACTIONS`). Each one is a set of joint angles, so new reactions are easy to add.

## Editing your resume

Almost everything lives in **`src/data/resume.js`**. The laptop screen, the full code view and the section panels all read from it, so you only change things in one place.

Your phone number is deliberately left off the public site. Add `phone` under `contact` if you want it shown.

## Project structure

```
src/
  App.jsx               Canvas + UI overlay + which section is open
  data/
    resume.js           ← your resume content (edit this)
    sections.js         Each clickable object: label, camera close-up, panel layout
    code.js             Turns resume.js into syntax-highlighted "TypeScript"
  hooks/useTimeOfDay.js Reads the clock (and the ?hour= override)
  scene/
    Experience.jsx      Camera, lights, environment reflections, puts the scene together
    Effects.jsx         Post-processing chain: hover outline, bloom, tone mapping, pixel art
    PixelArt.jsx        Pixel-art shader: object outlines + palette snapping
    lighting.js         Day/night lighting keyframes, blended by hour
    interaction.jsx     <Interactive>: makes any object hoverable/clickable
    Labels.jsx          Hover labels (and tap dots on phones)
    textures.js         Procedural wood, cork, fabric, plaster (shrunk to chunky texels), window view
    Room.jsx            Floor, walls, window + curtains, clock, pinboard, certificate, shelf
    Desk.jsx            Desk, laptop (live code / lock screen), keyboard, lamp, books, coffee, notebook, phone, plant
    Character.jsx       The jointed figure: poses, reactions to pokes, sleeping, chair
    Critters.jsx        Afternoon cats and the under-desk mouse
    palette.js          Colours and material presets
  ui/
    Panel.jsx           Slide-in section panel
    CodeView.jsx        Full-screen code editor (opened from the laptop)
    FallbackMenu.jsx    Plain menu of all sections
    Loader.jsx          Pixel loading bar
    Hud.jsx             Quest log, achievement toasts, confetti, time switcher, typewriter text
    PixelIcon.jsx       9×9 pixel icons
    quests.js           Quest list and progress
    sfx.js              8-bit sound effects
    cursor.js           Pixel mouse cursors
  styles.css
```

| Object | Opens |
|---|---|
| Laptop screen | Resume as code |
| Pinboard | Projects & skills |
| Books on the desk | Education |
| Framed certificate | Experience & leadership |
| Radin himself | A reaction (see above) |
| Phone | Contact |

## Build for production

```bash
npm run build     # outputs to dist/
npm run preview   # serves dist/ locally to check it
```
