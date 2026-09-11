###### flipped-char-export-extension

# Flipped.Chat Character Export Browser Extension

In-context browser extension to export [Flipped.Chat](https://flipped.chat) characters to JSON for import into Folx AI Contact Manager, a database, or other app/service.

**How it works:**

1. You click the extension icon while on a `flipped.chat/edit/...` page (logged in).
2. It injects a script into that tab that reads the form fields directly from the DOM — including the actual `<img src>` for the profile photo.
3. A popup shows the extracted JSON and a Download button that saves it as a .json file.

⛔ ***Nothing ever gets written back into your character.***

**What you need:**

1. A zip or xpi file containing the browser extension, unzipped somewhere
   OR
2. Clone the github repository

## Loading the browser extension

**Firefox:** go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on," and select `manifest.json` inside the folder. (Firefox temporary add-ons unload on browser restart — for a permanent install you'd need to sign it via Mozilla's add-on tools, but for personal use the temporary load is fine.) If you must have a permanent install please see me on Discord.

**Chrome:** go to `chrome://extensions`, enable "Developer mode" (top right), click "Load unpacked," and select the unzipped `flipped-char-export-extension` folder.

## Exporting your Flipped.Chat Character

**To use it:** navigate to a `flipped.chat/edit/...` page while logged in, click the extension icon, hit **Extract Character Data**, review the preview (and any ⚠ warnings), then **Download JSON**.





![](icons-scribe/icon128.png) Kid Tested. Mother Approved.
