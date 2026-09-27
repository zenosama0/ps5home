# Playground Home — PS5-style PWA

A standalone, installable home-screen PWA inspired by the current PS5 home/Welcome Hub interaction model.

## Updated in this version

- Selected app title sits to the **right of the selected tile**, matching the supplied PS5 reference composition.
- The full **Welcome Hub lower dashboard** is kept visible in the desktop layout, including the friends, store, accessibility, trophies, accessories, wishlist and friend activity cards.
- Added a polished local **background preset gallery** with seven original PS5-style abstract presets plus device-image upload.
- Added an original **home ambient music track** which loops while browsing the home. Browser autoplay rules are respected: the first keyboard/pointer interaction unlocks playback.
- Uploaded per-app music still takes priority over the home ambience when a custom app with music is selected.
- Music volume and UI sound volume are separate settings.
- New background and audio assets are included in the service-worker precache.

## Run

Serve this directory from HTTPS or localhost. For example:

`python -m http.server 8080`

Then open `http://localhost:8080/` in a modern browser.

## Install

Use the browser's Install app / Add to Home screen command, or the in-app System → Install control when the browser exposes the install prompt.

## Notes

This is a visual/interaction recreation using original code, artwork and generated audio. Sony/PlayStation proprietary system music, sounds, fonts and game artwork are not redistributed with this project.
