# Playground Home — PS5-style Home PWA

This folder is a dependency-free Progressive Web App recreation of the **visual/interaction language** of the PS5 Home / Welcome Hub. It is deliberately built with original CSS/SVG artwork and generated interface tones rather than bundling Sony/PlayStation proprietary UI assets, fonts, music or sound effects.

## What changed in this visual pass

The home screen was rebuilt around the proportions visible in the supplied PS5 Welcome Hub reference:

- 23px-style Games / Media tabs in the upper-left.
- Search, Settings, profile and time in the upper-right.
- Compact square app rail with ~66px inactive tiles and a ~112px selected tile.
- White selected border and enlarged selected tile instead of the previous blue browser-style focus outline.
- The selected tile shows its name directly beneath it.
- Welcome Hub cards are arranged as PS5-like dark rectangular cards in staggered columns rather than generic pill widgets.
- Welcome Hub starts around the same vertical point as the supplied reference and intentionally extends horizontally so the next card can appear partially off-screen.
- Background is a new procedural SVG with dark-blue/purple gradients, glows and abstract controller-symbol linework.
- Pointer/touch input removes keyboard focus treatment immediately, so a mouse or finger does not leave an unnecessary focus halo.
- Keyboard input restores a visible spatial focus state and supports arrow-key navigation.

## Keyboard navigation

On desktop, arrow keys are the primary navigation method.

- Left / Right: move across the app rail.
- Up: move toward the Games/Media and system icons.
- Down: enter Welcome Hub cards or the selected app's action area.
- Enter / Space: activate the focused item.
- Escape: back out of overlays / Control Center.
- `F1` or `P`: open the Control Center.
- `S`: open Settings.
- `F`: open Search.

The focused item is preserved when the app rail re-renders, fixing the earlier issue where selecting a tile caused keyboard focus to disappear.

## Touch / phone behavior

The app rail scrolls horizontally by swipe. Welcome Hub content becomes a vertically scrollable list on narrow screens. A swipe upward from the home screen opens the Control Center and a swipe downward closes it.

## Custom website “games”

Settings → Apps lets you add a URL as a game or media app.

You can provide:

- title
- game/media category
- website URL
- cover image
- icon image (or use the cover as the icon)
- per-app home music
- embedded/new-tab launch mode
- optional description

App metadata, artwork and music are kept in IndexedDB locally in the browser.

## PWA installation

Serve the directory from **HTTPS** or `localhost`. Opening `index.html` directly from `file://` does not provide normal service-worker/PWA installation behavior.

Examples:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/` and use the browser's **Install app / Add to Home screen** action.

## Official PS5 UI references used for the recreation

Sony's public documentation confirms the main Games / Media home structure, the Home Hub concept, Control Center cards/controls, Welcome Hub widgets/background customization, and the Appearance customization introduced for the PS5 UI.

- https://www.playstation.com/content/dam/global_pdc/en/corporate/support/manuals/ps5-docs/1000b-digital-edition/EN_IND_PS5_Digital_Web_Quick_Start_Guide_ENRUSIND_7033927.pdf
- https://www.playstation.com/en-ca/support/account/welcome-hub/
- https://blog.playstation.com/2024/09/12/ps5-system-update-adds-welcome-hub-party-share-personalized-3d-audio-profiles-adaptive-controller-charging-and-more/
- https://blog.playstation.com/2025/04/23/new-ps5-system-software-update-features-audio-focus-and-the-return-of-the-classic-console-ui-customizations/

## File layout

```text
ps5-home-pwa/
├─ index.html
├─ styles.css
├─ app.js
├─ manifest.webmanifest
├─ sw.js
└─ assets/
   ├─ background-default.svg
   ├─ audio/
   └─ icons/
      ├─ icon-192.png
      └─ icon-512.png
```

## Important limitation

The project aims to reproduce the layout, proportions, interaction feel, transitions, card construction and overall visual language shown in the supplied reference. Sony's exact proprietary UI assets, licensed game artwork, fonts, music and original system SFX are not included.
