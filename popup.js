const api = typeof browser !== "undefined" ? browser : chrome;

const statusEl = document.getElementById("status");
const warningsEl = document.getElementById("warnings");
const previewEl = document.getElementById("preview");
const extractBtn = document.getElementById("extractBtn");
const downloadBtn = document.getElementById("downloadBtn");
const downloadAllBtn = document.getElementById("downloadAllBtn");
const outputTrigger = document.getElementById('dropdownLink');
const outputMenu = document.getElementById('dropdownContent');
const optionTrigger = document.getElementById('dropdownOption');
const optionMenu = document.getElementById('optionsContent');
const versionEl = document.getElementById('version');
const version = api.runtime.getManifest().version;

const optionEl = document.getElementById("go-to-options");
const optionLink = document.getElementById("option-link");

const flatJson = ['Flat JSON', 'extractor.js', 'flat'];
const v1JSON = ['Character Card V1', 'extractor-v1.js', 'card-v1'];
const v2JSON = ['Character Card V2', 'extractor-v2.js', 'card-v2'];
const v2BfJSON = ['Character Card V2-V1Backfill', 'extractor-v2bf.js', 'card-v2bf'];
const outputTypes= [flatJson, v1JSON, v2JSON, v2BfJSON];
const visibilityTypes = ['All', 'Featured', 'Public', 'Unlisted', 'Private'];

versionEl.textContent = "v" + version;

function setStatus(msg) {
  statusEl.textContent = msg;
}
function setOptionWarning(msg) {
    optionLink.textContent = msg; //"⚠️ " + msg + " ⚠️";
}

let outputType = outputTypes[2];
let lastResult = null;
let visibilityType = visibilityTypes[0];


// document.querySelector('#go-to-output').addEventListener('click', (e) => {
//   e.preventDefault();
//   if (api.runtime.openOptionsPage) {
//     api.runtime.openOptionsPage();
//   } else {
//     window.open(api.runtime.getURL('options.html'));
//   }
// });

optionEl.addEventListener('click', async () => {
    warningsEl.style.display = "none";
    previewEl.style.display = "none";
    downloadBtn.style.display = "none";
    downloadAllBtn.style.display = "none";

    setStatus("Loading all of your characters...");

  try {
      const tab = await getActiveTab();
      if (!tab || !tab.url || !tab.url.includes("flipped.chat/create")) {
        setStatus("You are not on the `flipped.chat/create page`.");
          return;
      }
      setStatus("Loading all of your characters. This can take a while... ");
      setOptionWarning("⛔ DO NOT click away ⛔");

      const [{ result: links }] = await api.scripting.executeScript({
          target: { tabId: tab.id },
          world: 'MAIN',
          files: ['extractor-links.js'],
      });

      if (!links || !links.length) {
        setStatus("No links found on the page.");
        return;
      }
      lastResult = links;

      const linklist = links;
      previewEl.textContent = linklist.join("\n");
      previewEl.style.display = "block";


      setStatus(`Loaded ${links.length} characters links.`);
      setOptionWarning("");

      downloadAllBtn.textContent = `Download All ${links.length} Characters`;
      downloadAllBtn.style.display = "block";

  } catch (err) {
    setStatus("Error: " + (err && err.message ? err.message : String(err)));
  }



});

optionTrigger.addEventListener('click', (event) => {
    event.preventDefault();
    optionMenu.classList.toggle('show');
});

optionMenu.addEventListener('click', async (event) => {
    if (event.target.tagName === 'A') {
        event.preventDefault();

        // Update the trigger link text to show what was selected
        //trigger.textContent = event.target.getAttribute('data-value');
        const target = event.target.textContent;
        setOptionWarning(target);
        visibilityType = target;

        const visBtn = [...document.querySelectorAll('button, div, span')].find(
            (el) => el.children.length === 0 && el.textContent.trim() === target
        );
        if (visBtn) {
            visBtn.click();
            await sleep(1500);
        }

        //let idx = event.target.getAttribute('data-value');
        //outputType = outputTypes[idx];
        //outputFormat = trigger.textContent;

        // clear off previously generated layers
        // warningsEl.style.display = "none";
        // previewEl.style.display = "none";
        // downloadBtn.style.display = "none";
        //setStatus("Open a flipped.chat character edit page, then click Extract.");

        // Close the menu
        optionMenu.classList.remove('show');
    }

});


outputTrigger.addEventListener('click', (event) => {
  event.preventDefault();
  outputMenu.classList.toggle('show');
});

outputMenu.addEventListener('click', (event) => {
  if (event.target.tagName === 'A') {
    event.preventDefault();

    // Update the trigger link text to show what was selected
    //trigger.textContent = event.target.getAttribute('data-value');
    outputTrigger.textContent = event.target.textContent;

    let idx = event.target.getAttribute('data-value');
    outputType = outputTypes[idx];
    //outputFormat = trigger.textContent;

    // clear off previously generated layers
    warningsEl.style.display = "none";
    previewEl.style.display = "none";
    downloadBtn.style.display = "none";
    setStatus("Open a flipped.chat character edit page, then click Extract.");

    // Close the menu
    outputMenu.classList.remove('show');
  }

});

async function getActiveTab() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  return tab;
}

extractBtn.addEventListener("click", async () => {
  warningsEl.style.display = "none";
  previewEl.style.display = "none";
  downloadBtn.style.display = "none";
  setStatus("Extracting…");

  try {
    const tab = await getActiveTab();

    if (!tab || !tab.url || !tab.url.includes("flipped.chat/edit")) {
      setStatus("Open a flipped.chat/edit character edit page first.");
      return;
    }

    // Inject content script according to `outputType`
    const results = await api.scripting.executeScript({
      target: { tabId: tab.id },
      files: [outputType[1]],
    });

    const data = results && results[0] && results[0].result;
    if (!data) {
        setStatus("Extraction failed — no data returned");
      return;
    }

    lastResult = data;

    if (data._warnings && data._warnings.length) {
      warningsEl.textContent = "⚠ " + data._warnings.join("\n⚠ ");
      warningsEl.style.display = "block";
    }

    const displayCopy = { ...data };
    delete displayCopy._warnings;
    previewEl.textContent = JSON.stringify(displayCopy, null, 2);
    previewEl.style.display = "block";

    downloadBtn.style.display = "block";
    setStatus("Extracted. Review the fields, then download.");
  } catch (err) {
    setStatus("Error: " + (err && err.message ? err.message : String(err)));
  }
});

downloadBtn.addEventListener("click", () => {
  if (!lastResult) return;
  const exportCopy = { ...lastResult };
  delete exportCopy._warnings;

  const blob = new Blob([JSON.stringify(exportCopy, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const safeName = ((exportCopy.data && exportCopy.data.name) || exportCopy.name || "character")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName || "character"}-${outputType[2]}.json`;
  //setStatus(a.download);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
});

downloadAllBtn.addEventListener("click", async () => {
    if (!lastResult) return;

    const exportList = previewEl.textContent.split("\n"); //lastResult[0];
    //api.tabs.create({ url: exportList });
    api.permissions.request({
        origins: ["<all_urls>"]
    });
    const shortList = exportList;

    let count = 0;
    try {
        //for (const link of shortList) {
        const len = shortList.length;
        let link = shortList.pop();
        let tab = await api.tabs.create({ url: link, active: true });
        //tab = await getActiveTab();

        while (shortList.length > 0) {
            if (!tab && !tab.id) {
                setStatus("⚠️ Error: Tab creation failed");
                return;
            }

            // DEBUG
            if (count === 3) {
                setStatus(`Stopping at ${count}`);
                return;
            }

            //const link = shortList.pop();
            setOptionWarning(`📥Downloading ${link}`);
            setStatus(`${shortList.length} 🌐 ${link}`);
            previewEl.textContent = shortList.join("\n");


            setTimeout(() => {}, 2500);
            // Inject content script according to `outputType`
            await api.scripting.executeScript({
                target: { tabId: tab.id },
                files: [outputType[1]],
            }, (results) => {
                if (api.runtime.lastError || !results || !results[0]) {
                    console.error("Error reading DOM:", api.runtime.lastError);
                    setOptionWarning(`Error reading DOM: ${api.runtime.lastError}`);
                    return;
                }
                const result = results[0].result;
                console.log("DOM data extraction:", result);
            });
            // const results = await api.scripting.executeScript({
            //     target: { tabId: tab.id },
            //     files: [outputType[1]],
            // });
            // const data = results && results[0] && results[0].result;
            // if (!data) {
            //     setStatus("⚠️ Extraction failed — no data returned");
            //     return;
            // }
            //shortList.pop();
            //console.log(tab.download);
            // extractBtn.click();
            // downloadBtn.click();
            link = shortList.pop();
            tab = await api.tabs.update(tab.id, { url: link });
        }
        previewEl.textContent = "No more URLs left to download.";
        setStatus(`✔️All ${len} downloads completed.`);
        setOptionWarning("🆗");
    } catch (err) {
        setStatus("⚠️ Error: " + (err && err.message ? err.message : String(err)));
    }
    setTimeout(() => setOptionWarning(""), 2500);
});

