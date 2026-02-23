/**
 * tinymce.js
 * Locates TinyMCE editor iframes on the D2L page and writes HTML into
 * the Overall Feedback field.
 * Depends on: (none — uses only DOM APIs)
 */

// ─── Discovery ────────────────────────────────────────────────────────────────

/**
 * Returns an array of objects describing every editable TinyMCE iframe found
 * in the document (including inside shadow roots).
 */
function findTinyMCEIframes() {
    const iframes = [];

    function searchForTinyMCE(root) {
        const selectors = [
            'iframe.tox-edit-area__iframe',
            'iframe[id*="tinymce"]',
            'iframe[title*="feedback" i]',
            'iframe[title*="criterion" i]',
            'iframe[title*="overall" i]'
        ];

        selectors.forEach(selector => {
            root.querySelectorAll(selector).forEach(iframe => {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (doc && doc.body && doc.body.contentEditable === 'true') {
                        iframes.push({
                            iframe,
                            document: doc,
                            body:     doc.body,
                            title:    iframe.title || 'Unknown',
                            id:       iframe.id    || 'no-id'
                        });
                    }
                } catch (e) { /* cross-origin — ignore */ }
            });
        });

        // Recurse into shadow roots
        root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) searchForTinyMCE(el.shadowRoot);
        });
    }

    searchForTinyMCE(document);
    return iframes;
}

/**
 * Picks the best candidate for "Overall Feedback" from all found iframes.
 * Priority: title contains "overall" or "general" → only iframe → last iframe.
 */
function getOverallFeedbackArea() {
    const tiny = findTinyMCEIframes();
    if (!tiny.length) return null;

    for (const info of tiny) {
        const title = (info.title || '').toLowerCase();
        if (title.includes('overall') || title.includes('general')) return info;
    }

    return tiny.length === 1 ? tiny[0] : tiny[tiny.length - 1];
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Inserts html into the Overall Feedback TinyMCE editor.
 * If the field already has content, prepends with a thin <hr> separator.
 * Also fires change events so D2L registers the edit.
 * Returns true on success, false on failure.
 */
function setOverallFeedbackHtml(html) {
    const overallIframe = getOverallFeedbackArea();
    if (!overallIframe) {
        alert('Could not find the Overall Feedback editor. Is the page fully loaded?');
        console.warn('Available TinyMCE iframes:', findTinyMCEIframes().map(f => f.title));
        return false;
    }

    try {
        const existing = overallIframe.body.innerHTML || '';
        const cleanExisting = existing
            .replace(/<p><br[^>]*><\/p>/gi, '')
            .replace(/<br[^>]*>/gi, '')
            .trim();

        const newContent = cleanExisting.length > 0
            ? html + '<hr style="border:none;border-top:1px solid #ccc;margin:8px 0;">' + existing
            : html;

        overallIframe.body.innerHTML = newContent;

        // Fire DOM events so D2L knows the field changed
        ['input', 'change', 'keyup', 'blur'].forEach(ev => {
            try { overallIframe.body.dispatchEvent(new Event(ev, { bubbles: true })); } catch (e) { /* ignore */ }
        });

        // Also notify TinyMCE's own API if accessible
        if (window.tinymce && Array.isArray(window.tinymce.editors)) {
            window.tinymce.editors.forEach(editor => {
                try {
                    if (editor.getBody && editor.getBody() === overallIframe.body) {
                        editor.setContent(newContent);
                        editor.fire('change');
                        editor.fire('input');
                    }
                } catch (e) { /* ignore */ }
            });
        }

        console.log('Overall feedback updated by Grading Helper.');
        return true;
    } catch (e) {
        console.error('Error setting Overall Feedback content:', e);
        alert('Error while updating Overall Feedback.');
        return false;
    }
}
