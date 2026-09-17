const api = typeof browser !== "undefined" ? browser : chrome;

const statusEl = document.getElementById("status");
const warningsEl = document.getElementById("warnings");
const previewEl = document.getElementById("preview");
const extractBtn = document.getElementById("extractBtn");
const downloadBtn = document.getElementById("downloadBtn");
const trigger = document.getElementById('dropdownLink');
const menu = document.getElementById('dropdownContent');
const versionEl = document.getElementById('version');

trigger.addEventListener('click', (event) => {
  event.preventDefault();
  menu.classList.toggle('show');
});

// document.addEventListener('click', (event) => {
//   if (!event.target.matches('.dropdown-link')) {
//     menu.classList.remove('show');
//   }
// });

let outputFormat = trigger.textContent;
menu.addEventListener('click', (event) => {
  if (event.target.tagName === 'A') {
    event.preventDefault();

    // Update the trigger link text to show what was selected
    //trigger.textContent = event.target.getAttribute('data-value');
    trigger.textContent = event.target.textContent;

    // clear off previously generated layers
    outputFormat = trigger.textContent;
    warningsEl.style.display = "none";
    previewEl.style.display = "none";
    downloadBtn.style.display = "none";

    // Close the menu
    menu.classList.remove('show');
  }

});

let lastResult = null;

function setStatus(msg) {
  statusEl.textContent = msg;
}

function setVersion(msg) {
  versionEl.textContent = msg;
}

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

    if (!tab || !tab.url || !tab.url.includes("flipped.chat")) {
      setStatus("Open a flipped.chat character edit page first.");
      return;
    }

    // Inject content script
    const results = await api.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["extractor.js"],
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
  const safeName = ((exportCopy.data && exportCopy.data.name) || "character")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName || "character"}-card-v2.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
});

