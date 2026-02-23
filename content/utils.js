/**
 * utils.js
 * Pure helper functions — no dependencies on other modules.
 * Must be listed first in manifest.json.
 */

// Guard against double-injection (e.g. back/forward navigation in iterator pages)
if (window.d2lGradingHelperLoaded) {
    throw new Error('D2L Grading Helper already loaded — skipping.');
}
window.d2lGradingHelperLoaded = true;

console.log('D2L Grading Helper loading...');

// ─── String helpers ───────────────────────────────────────────────────────────

function uuid() {
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function sanitizeFilename(str) {
    return (str || 'untitled').replace(/[^a-z0-9_\-]+/gi, '_');
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ─── Date ─────────────────────────────────────────────────────────────────────

function formatToday() {
    const today = new Date();
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
}

// ─── DOM ──────────────────────────────────────────────────────────────────────

/**
 * querySelectorAll across the document AND every open shadow root.
 * D2L renders some elements inside shadow DOM so a plain querySelector misses them.
 */
function findInAllShadowRoots(selector) {
    const results = [];

    function search(root) {
        if (!root || !root.querySelectorAll) return;
        try {
            root.querySelectorAll(selector).forEach(el => results.push(el));
        } catch (e) { /* ignore invalid selectors */ }
        root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) search(el.shadowRoot);
        });
    }

    search(document);
    return results;
}
