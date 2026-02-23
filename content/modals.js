/**
 * modals.js
 * Reusable modal dialogs: signature configurator and generic list editor.
 * Depends on: config.js (teacherSignature)
 */

// ─── Signature ────────────────────────────────────────────────────────────────

function configureSignature() {
    const modal  = makeOverlay();
    const dialog = makeDialog({ maxWidth: '500px' });

    const title = el('h3', { style: 'margin:0 0 10px 0;color:#222' }, 'Configure Your Signature');

    const instructions = el('p', { style: 'margin:0 0 10px 0;font-size:14px;color:#555' },
        'Enter the signature to appear after your feedback (e.g., name, role, email). Use Enter for new lines.');

    const textarea = el('textarea', {
        style: 'width:100%;height:120px;padding:10px;border-radius:4px;border:1px solid #ccc;' +
               'resize:vertical;font-size:13px;box-sizing:border-box',
        placeholder: 'Best regards,\nYour Name\nCourse / School\nemail@example.com'
    });
    if (teacherSignature) textarea.value = teacherSignature.replace(/<br\s*\/?>/gi, '\n');

    const buttonRow = el('div', { style: 'display:flex;justify-content:flex-end;gap:8px;margin-top:15px' });

    const cancelBtn = makeModalBtn('Cancel', '#6c757d');
    const clearBtn  = makeModalBtn('Clear',  '#dc3545');
    const saveBtn   = makeModalBtn('Save',   '#0066cc');

    cancelBtn.onclick = () => modal.remove();

    clearBtn.onclick = () => {
        if (!confirm('Clear your signature?')) return;
        textarea.value = '';
        teacherSignature = '';
        localStorage.removeItem('teacherSignature');
        alert('Signature cleared.');
        modal.remove();
    };

    saveBtn.onclick = () => {
        const raw = textarea.value.trim();
        if (raw) {
            teacherSignature = raw.replace(/\n/g, '<br>');
            localStorage.setItem('teacherSignature', teacherSignature);
            alert('Signature saved.');
        } else {
            teacherSignature = '';
            localStorage.removeItem('teacherSignature');
            alert('Signature cleared.');
        }
        modal.remove();
    };

    buttonRow.append(cancelBtn, clearBtn, saveBtn);
    dialog.append(title, instructions, textarea, buttonRow);
    modal.appendChild(dialog);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
    setTimeout(() => textarea.focus(), 100);
}

// ─── Generic list editor ──────────────────────────────────────────────────────

/**
 * Opens a modal that lets the user reorder (and optionally edit / add / delete)
 * a list of strings.
 *
 * @param {object} options
 *   title       string
 *   items       string[]
 *   allowEdit   boolean
 *   allowAdd    boolean
 *   allowDelete boolean
 *   onApply     function(newItems: string[])
 */
function openListEditorModal(options) {
    const {
        title       = 'Edit List',
        items       = [],
        allowEdit   = false,
        allowAdd    = false,
        allowDelete = false,
        onApply
    } = options;

    const working = items.slice();
    const modal   = makeOverlay();
    const dialog  = makeDialog({ maxWidth: '420px', padding: '16px' });

    // ── Header ──
    const header = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px' });
    const titleEl = el('h3', { style: 'margin:0;font-size:14px' }, title);
    const closeX  = el('button', { style: 'border:none;background:transparent;cursor:pointer;font-size:14px;padding:2px 4px' }, '✕');
    closeX.addEventListener('click', () => modal.remove());
    header.append(titleEl, closeX);

    // ── List container ──
    const listContainer = el('div', {
        style: 'border:1px solid #ddd;border-radius:4px;padding:4px;' +
               'max-height:260px;overflow-y:auto;margin-bottom:8px;background:#fafafa'
    });

    function renderList() {
        listContainer.innerHTML = '';
        if (!working.length) {
            listContainer.appendChild(el('div', { style: 'font-style:italic;color:#555' }, 'No items.'));
            return;
        }

        working.forEach((text, idx) => {
            const row = el('div', { style: 'display:flex;align-items:center;gap:4px;padding:2px 0' });

            const label = el('div', { style: 'flex:1;white-space:normal;line-height:1.3' }, text);
            const btns  = el('div', { style: 'display:flex;align-items:center;gap:2px' });

            const upBtn   = makeIconBtn('↑', '#555', 'Move up');
            const downBtn = makeIconBtn('↓', '#555', 'Move down');

            upBtn.addEventListener('click', () => {
                if (idx <= 0) return;
                [working[idx - 1], working[idx]] = [working[idx], working[idx - 1]];
                renderList();
            });
            downBtn.addEventListener('click', () => {
                if (idx >= working.length - 1) return;
                [working[idx + 1], working[idx]] = [working[idx], working[idx + 1]];
                renderList();
            });
            btns.append(upBtn, downBtn);

            if (allowEdit) {
                const editBtn = makeIconBtn('✎', '#0066cc', 'Rename');
                editBtn.addEventListener('click', () => {
                    const updated = window.prompt('Edit item:', working[idx]);
                    if (updated !== null && updated.trim()) { working[idx] = updated.trim(); renderList(); }
                });
                btns.appendChild(editBtn);
            }

            if (allowDelete) {
                const delBtn = makeIconBtn('✕', '#b00', 'Remove');
                delBtn.addEventListener('click', () => {
                    if (!confirm('Remove this item?')) return;
                    working.splice(idx, 1);
                    renderList();
                });
                btns.appendChild(delBtn);
            }

            row.append(label, btns);
            listContainer.appendChild(row);
        });
    }

    renderList();

    // ── Bottom row ──
    const bottomRow = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-top:6px;gap:8px' });
    const leftCtrl  = el('div', { style: 'display:flex;gap:4px' });

    if (allowAdd) {
        const addBtn = el('button', { style: 'padding:2px 8px;font-size:12px;border-radius:4px;border:1px solid #ccc;cursor:pointer;background:#f5f5f5' }, '➕ Add');
        addBtn.addEventListener('click', () => {
            const name = window.prompt('New item name:');
            if (name && name.trim()) { working.push(name.trim()); renderList(); }
        });
        leftCtrl.appendChild(addBtn);
    }

    const rightCtrl  = el('div', { style: 'display:flex;gap:6px' });
    const cancelBtn2 = makeModalBtn('Cancel',     '#6c757d');
    const saveBtn2   = makeModalBtn('Save & Close', '#0066cc');

    cancelBtn2.addEventListener('click', () => modal.remove());
    saveBtn2.addEventListener('click', () => {
        if (typeof onApply === 'function') onApply(working.slice());
        modal.remove();
    });

    rightCtrl.append(cancelBtn2, saveBtn2);
    bottomRow.append(leftCtrl, rightCtrl);

    dialog.append(header, listContainer, bottomRow);
    modal.appendChild(dialog);
    document.body.appendChild(modal);
}

// ─── Private DOM helpers (modal-local) ───────────────────────────────────────

/** Create an element with style string and optional text content. */
function el(tag, attrs, text) {
    const node = document.createElement(tag);
    if (attrs) {
        Object.keys(attrs).forEach(k => {
            if (k === 'style') node.style.cssText = attrs[k];
            else node[k] = attrs[k];
        });
    }
    if (text !== undefined) node.textContent = text;
    return node;
}

function makeOverlay() {
    const d = document.createElement('div');
    Object.assign(d.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '1000000',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    });
    return d;
}

function makeDialog({ maxWidth = '400px', padding = '20px' } = {}) {
    const d = document.createElement('div');
    Object.assign(d.style, {
        backgroundColor: 'white', padding, borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxWidth, width: '90%',
        maxHeight: '80%', overflow: 'auto', boxSizing: 'border-box',
        fontFamily: 'Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: '13px'
    });
    return d;
}

function makeModalBtn(label, bg) {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
        padding: '6px 12px', borderRadius: '4px', border: 'none',
        cursor: 'pointer', fontSize: '13px', backgroundColor: bg, color: '#fff'
    });
    b.addEventListener('mouseenter', () => { b.style.opacity = '0.9'; });
    b.addEventListener('mouseleave', () => { b.style.opacity = '1'; });
    return b;
}

function makeIconBtn(text, color, title) {
    const b = document.createElement('button');
    b.textContent = text;
    if (title) b.title = title;
    Object.assign(b.style, {
        border: 'none', background: 'transparent', cursor: 'pointer',
        fontSize: '12px', padding: '0 3px', color: color || '#333'
    });
    return b;
}
