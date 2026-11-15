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

## iPhone sizing (15 Nov, second release)

First screenshots from an iPhone 17 Pro Max showed two problems: everything drawn at about 75% size, and an empty navy band along the bottom. `index.html` now has a small script in the head that, for the home-screen app only, works out the real screen height and scales the page back up if it is being shown zoomed out. The viewport also no longer allows zooming. Settings has an "About this device" line with the measured sizes for diagnosing this. Second screenshots confirmed the size is now right, but the band remained and sheets were cut off at the bottom, so the third release makes the whole document the full screen height in home-screen mode instead of relying on `position: fixed`. Also fixed: date and time fields spilling off the right edge of forms, and the ribbon sitting on top of content when scrolled. Third release not yet confirmed on the phone.

## Apple Calendar feed and smaller scale (15 Nov, fourth release)

- Third release confirmed on the phone: full height, no band.
- The interface is now drawn at 88% (`html{ zoom }` in `styles.css`, and `DENSITY` in the `index.html` script; keep the two equal) with slightly smaller headings and buttons, after feedback that it looked too big.
- Calendar: `calendar.js` parses iCloud public calendar links (.ics) including repeating events. Events show read-only in the Schedule on Today, all-day events above it. Links and the relay address are entered in Settings, Apple Calendar. Refreshes every 30 minutes while open and keeps the last copy for offline.
- The relay is a Cloudflare Worker in `cloudflare/calendar-relay` (`npx wrangler login` once, then `npx wrangler deploy` from that folder). It only fetches iCloud published calendars and only answers the planner's site. Deployed 15 Nov 2026 to https://tees-planner-calendar.yinkadev.workers.dev (Cloudflare account yinkz.yim@gmail.com); that address is the default in `CAL_RELAY_DEFAULT` in `app.js`. Not yet tried with a real iCloud link.

## iPhone layout review (15 Nov, fifth release)

Reviewed against Apple's Human Interface Guidelines after feedback that the app still looked oversized. Pages and features are unchanged; layout and controls were reworked:

- Sizes are now plain iPhone points with no global shrink factor: body 14, labels 11 to 12.5, page title 28. Nothing is below 11.
- Section tabs moved from the right page edge to index tabs along the bottom (readable, in thumb reach, 46pt tall). Content gets the full page width.
- The top bar is gone. The day stepper lives in the Today (and Partner) page header; the contents drawer opens from More.
- List rows open on tap (chevron cue). Their Edit and Delete buttons are hidden and Delete appears in the sheet that opens (`enhanceRows` in `app.js`). Extra row buttons such as Reminder and Retro remain.
- Buttons have three weights (filled only for a sheet's main action) and look 32pt high with a 44pt tap area.
- Schedule is 48pt per hour in a 300pt window and scrolls to the current time. Song card is more compact. Tapping anywhere on the cover opens it.

Still to check on the phone: what happens to sheets when the keyboard opens (left to iOS's default behaviour).

## Motion and sheets (15 Nov, sixth release)

From a frame-by-frame look at a screen recording on the phone:

- Page turn: half of the old 0.9s animation happened out of sight (the page is edge-on at 90 degrees), so the turn looked abrupt and was followed by dead time. It now spends the whole 0.62s on the visible quarter turn, eased at both ends, with the turning page darkening and the page beneath brightening.
- Tabs: the open tab only changed after the turn had finished. It now changes on the tap, stands 6pt taller than the others, and animates.
- Sheets (add and edit forms): cloth header with a foil italic title, ruled paper body, small-caps labels, matching corners. Sheets and the contents drawer slide in.

## Birthday theme (15 Nov, seventh release)

On 24 January (or whenever that date is being viewed) the whole book turns rose pink: `html.birthday` in `styles.css` swaps the colour variables, and the Today page gets a rose garland header (`ROSE_GARLAND` in `app.js`). Chosen from three mockups ("Rose garden"). The old emoji-based birthday styles were removed; they clashed with the new design and hid the song title.

## Partner Sync on Cloudflare (15 Nov, eighth release)

Firebase is gone. Sync now runs through a Cloudflare Worker with a Durable Object per pairing (`cloudflare/partner-sync`, deployed to https://tees-planner-sync.yinkadev.workers.dev, account yinkz.yim@gmail.com).

- Both planners enter the same pairing code in Settings, Partner Sync. One of them makes it with "Create a code".
- Only a SHA-256 hash of the code is sent; it names the storage for that pair. A code accepts two planners and turns away a third.
- Shared: tasks, time blocks, yearly, quarterly and monthly goals, plus the display name. Nothing else.
- Uploads happen about 6 seconds after a change (`onDataChange` in `db.js`), on launch, and when leaving the app. The Partner page fetches on open and every minute while it is showing.
- Disconnect deletes that planner's copy from the service. Untouched pairings are deleted after 120 days.
- The pairing code lives in localStorage, not the database, so it is never in a backup file.
- Tested with two separate browser profiles on this Mac: connect, see each other, change appears on the other side, disconnect. Not yet tried on two phones.

## Known limits

- Tested in desktop Chrome at iPhone size. Still to check on a real iPhone: the icon, sound with the silent switch on, swipe feel, and the cover animation speed.
- Entries saved during summer 2026 (if any) were stored a day early by the old date bug and stay where they are.
- Partner Sync is as private as its pairing code: anyone who has the code can read both shared schedules.
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
