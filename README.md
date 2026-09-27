# Playground Home — PS5-inspired PWA

A self-contained, installable PWA that recreates the *feel* of the PS5 Home/Control Center using original HTML/CSS/JS artwork and synthesized UI tones.

## What is included

- Responsive Games / Media home tabs.
- Horizontal app carousel with selected-game hero presentation.
- PS5-inspired Welcome Hub widgets.
- Control Center opened by the on-screen PS button, `F1`, or `P` on desktop; on touch devices, swipe upward from the bottom or use the visible PS button.
- Keyboard-first spatial navigation on PCs. Focus outlines are only shown after keyboard input; pointer/touch interaction does not leave a persistent keyboard highlight.
- Touch-friendly buttons, horizontal swipe/scroll, mobile safe-area support, and portrait/landscape layouts.
- Local “website as game/app” manager under Settings → Apps.
- Separate cover and icon uploads, with fallback to one image if only one is provided.
- Per-app uploaded music that can loop while the app is selected.
- Website opening in a new tab or an optional embedded iframe. Some websites block iframe embedding; New tab is the most compatible mode.
- Search, Library, Profile menu, local settings, import/export backups, reset, install UI, and service-worker update handling.
- IndexedDB storage for custom app metadata and uploaded assets.
- Offline cache for the PWA shell.

## Install

For PWA installation, serve the folder from `https://` or `localhost`. Opening `index.html` directly with `file://` does not satisfy normal PWA installability requirements.

### Local test

```bash
cd ps5-home-pwa
python -m http.server 8080
```

Then open:

`http://localhost:8080/`

### GitHub Pages

Upload the entire folder to a repository and enable GitHub Pages for the branch/folder containing `index.html`.

## Important accuracy note

This project intentionally does **not** ship Sony/PlayStation proprietary screenshots, logos, fonts, official music, official startup/UI sounds, or game cover art. The visual system, layout proportions, focus behavior, cards, gradients, background treatment, responsive behavior and interaction patterns are recreated with original assets.

The project was researched against Sony's current public PS5 documentation and product/UI material:

- PS5 Home screen documentation: https://www.playstation.com/content/dam/global_pdc/en-gb/corporate/support/manuals/ps5-docs/1200b/CFI-12XXB_PS5_Quick_Start_Guide_Web%24en-gb.pdf
- PS5 Control Center documentation: https://www.playstation.com/en-ca/support/games/customize-ps5-control-center/
- Welcome Hub documentation: https://www.playstation.com/en-ca/support/account/welcome-hub/
- PS5 Welcome Hub announcement: https://blog.playstation.com/2024/09/12/ps5-system-update-adds-welcome-hub-party-share-personalized-3d-audio-profiles-adaptive-controller-charging-and-more/
- Classic UI Appearance update: https://blog.playstation.com/2025/04/23/new-ps5-system-software-update-features-audio-focus-and-the-return-of-the-classic-console-ui-customizations/
- PWA installability reference: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
