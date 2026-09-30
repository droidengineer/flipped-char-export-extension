const api = typeof browser !== "undefined" ? browser : chrome;
const sleepTime = '1200';

const creatorEl = document.getElementById("creator");
const sleepEl = document.getElementById("sleep");
const dirEl = document.getElementById("dir");
const statusEl = document.getElementById("status");

sleepEl.textContent = sleepTime;

function setStatus(msg) {
    statusEl.textContent = `🏷️ ${msg}`;
}

const saveOptions = () => {
    const creator = document.getElementById("creator").textContent;
    const sleep = document.getElementById("sleep").textContent;

    api.storage.local.set(
        {creatorName: creator,
        sleep: sleep,
            dir: dirEl.textContent
        },
        () => {
            setStatus('Options saved.');
            setTimeout(() => {
                setStatus('');
            }, 750);
        });
};

const restoreOptions = () => {
    api.storage.local.get(
        // {creatorName:'',
        // sleep: '1200',
        // dir: '<browser_default_download>'},
        ["creatorName", "sleep", "dir"],
        (items) => {
            document.getElementById('creator').textContent = items.creatorName;
            if (items.sleep === "") {
                document.getElementById('sleep').textContent = sleepTime;
            } else {
                document.getElementById('sleep').textContent = items.sleep;
            }
            document.getElementById('dir').textContent = items.dir;
        });
};


document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);