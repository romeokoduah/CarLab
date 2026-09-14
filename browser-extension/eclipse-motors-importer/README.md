# Eclipse Motors import helper

che168 blocks the Eclipse Motors server from opening listings. This Chrome/Edge
extension lets the admin's own browser read them instead, so importing stays
"paste the link, click Import".

## Install (once per computer)

1. Copy this folder onto the computer.
2. Open `chrome://extensions` (Edge: `edge://extensions`) and switch on **Developer mode**.
3. Click **Load unpacked** and pick this folder.
4. Reload the Eclipse Motors admin. Under the import box it should say **Import helper connected**.

After changing any file here, click the reload icon on the extension's card.

## How it works

- `bridge.js` runs on `/admin` and passes messages between the page
  (`lib/import/import-helper.ts`) and the background worker.
- `background.js` opens the link in a new tab, waits until the listing shows its
  mileage/registration text (or for you to finish che168's security check), scrolls
  once so the gallery loads, reads the page text and 900x675 photo links, closes
  the tab and returns them.
- The admin page posts that to `/api/admin/import-listing` as `{ page }`, which
  runs the same parsing, DeepSeek and pricing as a server-side read.

The extension can only script `che168.com` pages and only talks to the admin page.
