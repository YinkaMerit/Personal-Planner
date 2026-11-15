# Tee's Planner: status

Last updated: 15 November 2026

A home-screen web app (PWA) for iPhone that looks like a clothbound planner. Plain HTML, CSS and JavaScript with no build step. All data lives in the phone's browser storage (IndexedDB), nothing is sent to a server unless Partner Sync is switched on.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page shell: top bar, contents drawer, page area, edge tabs, ribbon, the cover, the modal |
| `styles.css` | The whole "Navy Cloth" theme. Colours and the page-turn speed (`--flip`) are variables at the top |
| `app.js` | Every page and all behaviour |
| `db.js` | IndexedDB wrapper. Database name and store names must not change or existing data is lost |
| `utils.js` | Date helpers. `dayKey` and `monthKey` use the local calendar date |
| `sync.js` | Optional Firebase partner sync |
| `sw.js` | Service worker for offline use. Bump `CACHE_NAME` on every release |
| `icons/` | Home-screen icons (PNG, iOS does not accept SVG) |

## What changed in this version (v2)

Look
- New theme based on the existing navy, blue and sky-blue palette: navy cloth cover with foil lettering, ruled paper pages, ribbon bookmark, section tabs on the page edge.
- The cover shows on launch and swings open like a hardback, followed by a title page. "Close the book" in the contents brings it back.
- Page turn is about 0.9s (was 2.4s). Swipe left or right to turn pages. Tapping the ribbon returns to today.
- Pages scroll as one sheet on a phone instead of many small scrolling boxes. Forms open as a sheet from the bottom and scroll if long.

Fixes
- Dates no longer slip a day during British Summer Time (keys were built from UTC).
- History: the day page crashed on days with time blocks and could not be reached. It now opens from a 7-day list, with earlier/later week buttons.
- Verse of the Day is shown (it was built but never placed on the page) and rotates through 56 verses without repeats.
- Song of the Day plays through a normal audio element: works with the silent switch on, has pause and seek, keeps playing while pages turn. Songs rotate without repeats.
- Every delete asks first. Deleting a contact also removes their check-ins and reminder.
- Import checks the file and asks before replacing data. Export uses the iOS share sheet. Both moved to Settings, under Backup.
- Taps during a page turn are queued instead of dropped. Ticking a task keeps the scroll position.
- Home-screen icon is a real PNG. The service worker now picks up new versions and caches every file needed offline.
- Removed the Spotify code: the sign-in could never complete and nothing used it.

## Known limits

- Tested in desktop Chrome at iPhone size. Still to check on a real iPhone: the icon, sound with the silent switch on, swipe feel, and the cover animation speed.
- Entries saved during summer 2026 (if any) were stored a day early by the old date bug and stay where they are.
- Partner Sync uploads only when "Save & Connect" or "Sync Now" is tapped, and the Firebase database has no sign-in, so anyone with its address could read shared schedules.
- The verses were typed from memory in King James wording and deserve a proofread.
- Song previews and artwork need an internet connection. Everything else works offline.

## Releasing an update

1. Change `CACHE_NAME` in `sw.js`.
2. Upload every file in this folder to the host (the folder is the site, there is no build).
3. On the phone, open the app, close it fully, and open it again.

## Testing locally

```
python3 -m http.server 8765
```

Then open `http://localhost:8765` in Chrome with the device toolbar set to an iPhone.
