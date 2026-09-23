const api = typeof browser !== "undefined" ? browser : chrome;

const creatorEl = document.getElementById("creator");


const saveOptions = () => {
    const creator = document.getElementById("creator");

    api.storage.local.set(
        {creatorName: creator},
        () => {
            const statusEl = document.getElementById("status");
            statusEl.textContent = 'Options saved.';
            setTimeout(() => {
                statusEl.textContent = '';
            }, 750);
        });
};

const restoreOptions = () => {
    api.storage.local.get(
        {creatorName:''},
        (items) => {
            document.getElementById('creator').value = items.creator;
        });
};


document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);