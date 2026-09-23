/**
 * Flipped.chat "My Character" edit-link extractor.
 *
 * MUST run in the page's MAIN world: it reads React's internal fiber props
 * (__reactFiber$...), which are invisible to an extension's isolated world.
 *   chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: ['extractor.js'] })
 * The script's last expression is a Promise, so executeScript resolves to
 * [{ result: [ 'https://flipped.chat/edit/...', ... ] }].
 */
(async () => {
    const BASE = 'https://flipped.chat/edit/';
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // 1. Select the "All" filter tab (no-op if already selected).
    const allBtn = [...document.querySelectorAll('button, div, span')].find(
        (el) => el.children.length === 0 && el.textContent.trim() === 'All'
    );
    if (allBtn) {
        allBtn.click();
        await sleep(1500);
    }

    // Card titles are <h3> elements inside the "My Character" grid.
    const cardTitles = () => [...document.querySelectorAll('div.flex.flex-wrap.gap-4 h3')];

    // Walk up the React fiber tree from a node until a prop object with a `slug` is found.
    const getCharacter = (el) => {
        const key = Object.keys(el).find((k) => k.startsWith('__reactFiber'));
        let fiber = key ? el[key] : null;
        for (let i = 0; i < 15 && fiber; i++, fiber = fiber.return) {
            const props = fiber.memoizedProps;
            if (props && typeof props === 'object') {
                for (const v of Object.values(props)) {
                    if (v && typeof v === 'object' && typeof v.slug === 'string' && v.slug) return v;
                }
            }
        }
        return null;
    };

    // Find the element that actually scrolls (nearest scrollable ancestor of the grid).
    const findScroller = () => {
        let el = document.querySelector('div.flex.flex-wrap.gap-4');
        while (el && el !== document.body) {
            const oy = getComputedStyle(el).overflowY;
            if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el;
            el = el.parentElement;
        }
        return document.scrollingElement || document.documentElement;
    };

    // 2. Scroll to the bottom repeatedly until the card count stops growing (infinite scroll).
    const scroller = findScroller();
    let last = -1;
    let stable = 0;
    for (let i = 0; i < 200 && stable < 4; i++) {
        scroller.scrollTop = scroller.scrollHeight;
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(1200);
        const n = cardTitles().length;
        if (n === last) stable++;
        else {
            stable = 0;
            last = n;
        }
    }

    // 3. Collect unique edit links.
    const links = [];
    const seen = new Set();
    for (const h3 of cardTitles()) {
        const c = getCharacter(h3);
        if (!c) continue;
        const url = BASE + c.slug;
        if (!seen.has(url)) {
            seen.add(url);
            links.push(url);
        }
    }
    return links;
})();