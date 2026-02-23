/**
 * panel.js
 * Builds and manages the floating Grading Helper panel UI.
 * Depends on: all other modules (must be listed last in manifest.json).
 */

// ─── Panel entry point ────────────────────────────────────────────────────────

function initializePanel() {
    if (!document.body) return;

    autoDetectCourseAndAssignment();
    ensureSelection();

    // ── Outer panel ──────────────────────────────────────────────────────────
    const panel = document.createElement('div');
    panel.id = 'd2l-grading-helper-panel';
    Object.assign(panel.style, {
        position: 'fixed', zIndex: '999999',
        backgroundColor: '#ffffff', borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        fontFamily: 'Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
    });

    const ps = config.panelState;
    if (!ps.top || !ps.left) {
        ps.width  = ps.width  || 420;
        ps.height = ps.height || 480;
        ps.top    = 80;
        ps.left   = Math.max(20, window.innerWidth - ps.width - 40);
    }
    panel.style.width  = ps.width  + 'px';
    panel.style.height = ps.height + 'px';
    panel.style.top    = ps.top    + 'px';
    panel.style.left   = ps.left   + 'px';

    // ── Header ───────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    Object.assign(header.style, {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px',
        background: 'linear-gradient(90deg, #0066cc, #004a99)',
        color: '#fff', cursor: 'move', fontSize: '13px'
    });

    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Grading Helper';

    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = ps.minimized ? '▢' : '▁';
    Object.assign(minimizeBtn.style, {
        border: 'none', borderRadius: '4px', padding: '2px 6px',
        fontSize: '12px', cursor: 'pointer',
        backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff'
    });
    header.append(titleSpan, minimizeBtn);

    // ── Body ─────────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    Object.assign(body.style, {
        padding: '8px', display: ps.minimized ? 'none' : 'flex',
        flexDirection: 'column', gap: '6px', fontSize: '12px',
        height: '100%', boxSizing: 'border-box', overflowY: 'auto'
    });

    // ── Shared small-button factory (used throughout) ─────────────────────
    function mkBtn(text, title) {
        const b = document.createElement('button');
        b.textContent = text;
        if (title) b.title = title;
        Object.assign(b.style, {
            padding: '2px 6px', fontSize: '11px', borderRadius: '4px',
            border: '1px solid #ccc', cursor: 'pointer', backgroundColor: '#f5f5f5'
        });
        return b;
    }

    function mkRow(labelText) {
        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' });
        if (labelText) {
            const lbl = document.createElement('span');
            lbl.textContent = labelText;
            Object.assign(lbl.style, { minWidth: '70px', fontWeight: '600' });
            row.appendChild(lbl);
        }
        return row;
    }

    function mkSelect() {
        const s = document.createElement('select');
        Object.assign(s.style, { flex: '1', padding: '2px', fontSize: '12px' });
        return s;
    }

    function mkIconBtn(text, color, title) {
        const b = document.createElement('button');
        b.textContent = text;
        if (title) b.title = title;
        Object.assign(b.style, {
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: '12px', padding: '0 3px', color: color || '#333'
        });
        return b;
    }

    // ── Course row ────────────────────────────────────────────────────────
    const courseRow      = mkRow('Course:');
    const courseSelect   = mkSelect();
    const addCourseBtn      = mkBtn('➕');
    const editLevelsBtn     = mkBtn('⚙');
    const renameCourseBtn   = mkBtn('✎');
    const reorderCoursesBtn = mkBtn('⇅', 'Reorder courses');
    const deleteCourseBtn   = mkBtn('🗑');
    courseRow.append(courseSelect, addCourseBtn, editLevelsBtn, renameCourseBtn, reorderCoursesBtn, deleteCourseBtn);

    // ── Assignment row ────────────────────────────────────────────────────
    const assignmentRow         = mkRow('Assignment:');
    const assignmentSelect      = mkSelect();
    const addAssignmentBtn      = mkBtn('➕');
    const moveUpBtn             = mkBtn('↑');
    const moveDownBtn           = mkBtn('↓');
    const reorderAssignmentsBtn = mkBtn('⇅', 'Reorder assignments');
    const renameAssignmentBtn   = mkBtn('✎');
    const deleteAssignmentBtn   = mkBtn('🗑');
    assignmentRow.append(assignmentSelect, addAssignmentBtn, moveUpBtn, moveDownBtn, reorderAssignmentsBtn, renameAssignmentBtn, deleteAssignmentBtn);

    // ── Level row ─────────────────────────────────────────────────────────
    const levelRow       = mkRow('Level:');
    const levelSelect    = mkSelect();
    const addLevelBtn    = mkBtn('➕', 'Add level');
    const renameLevelBtn = mkBtn('✎', 'Rename level');
    const reorderLevelsBtn = mkBtn('⇅', 'Reorder levels');
    const deleteLevelBtn = mkBtn('🗑', 'Delete level');
    levelRow.append(levelSelect, addLevelBtn, renameLevelBtn, reorderLevelsBtn, deleteLevelBtn);

    // ── Level feedback block ──────────────────────────────────────────────
    const levelFeedbackBlock = document.createElement('div');
    Object.assign(levelFeedbackBlock.style, {
        display: 'flex', flexDirection: 'column', border: '1px solid #e0e0e0',
        borderRadius: '4px', padding: '4px', backgroundColor: '#f9fafb', gap: '4px'
    });

    const levelFeedbackTop = document.createElement('div');
    Object.assign(levelFeedbackTop.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' });

    const levelFeedbackLabel = document.createElement('span');
    levelFeedbackLabel.textContent = 'Level feedback (overall comment):';
    levelFeedbackLabel.style.fontWeight = '600';

    const includeLevelLabel    = document.createElement('label');
    const includeLevelCheckbox = document.createElement('input');
    includeLevelCheckbox.type    = 'checkbox';
    includeLevelCheckbox.checked = !!config.includeLevelComment;
    Object.assign(includeLevelLabel.style, { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer' });
    includeLevelLabel.append(includeLevelCheckbox, makeText('Include on insert'));

    levelFeedbackTop.append(levelFeedbackLabel, includeLevelLabel);

    const levelFeedbackTextarea = document.createElement('textarea');
    Object.assign(levelFeedbackTextarea.style, {
        width: '100%', minHeight: '48px', maxHeight: '100px', padding: '4px',
        fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc',
        resize: 'vertical', boxSizing: 'border-box'
    });
    levelFeedbackTextarea.placeholder = 'Overall proficiency comment for this assignment & level...';

    const levelFeedbackBtnRow = document.createElement('div');
    Object.assign(levelFeedbackBtnRow.style, { display: 'flex', justifyContent: 'flex-end', marginTop: '2px' });
    const saveLevelCommentBtn = mkBtn('Save Level Comment');
    levelFeedbackBtnRow.appendChild(saveLevelCommentBtn);

    levelFeedbackBlock.append(levelFeedbackTop, levelFeedbackTextarea, levelFeedbackBtnRow);

    // ── Feedback header ───────────────────────────────────────────────────
    const feedbackHeaderTop = document.createElement('div');
    Object.assign(feedbackHeaderTop.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' });
    const feedbackTitle = document.createElement('span');
    feedbackTitle.textContent = 'Feedback';
    feedbackTitle.style.fontWeight = '600';
    const feedbackActions = document.createElement('div');
    Object.assign(feedbackActions.style, { display: 'flex', gap: '4px', alignItems: 'center' });
    const selectAllBtn = mkBtn('All');
    const clearAllBtn  = mkBtn('None');
    feedbackActions.append(selectAllBtn, clearAllBtn);
    feedbackHeaderTop.append(feedbackTitle, feedbackActions);

    const feedbackColHeader = document.createElement('div');
    Object.assign(feedbackColHeader.style, {
        display: 'grid', gridTemplateColumns: '28px 28px 1fr', columnGap: '4px',
        fontSize: '11px', color: '#555', padding: '2px 4px', marginTop: '2px'
    });
    const yHead = document.createElement('div'); yHead.textContent = 'Y'; yHead.style.textAlign = 'center';
    const nHead = document.createElement('div'); nHead.textContent = 'N'; nHead.style.textAlign = 'center';
    const cHead = document.createElement('div'); cHead.textContent = 'Comment';
    feedbackColHeader.append(yHead, nHead, cHead);

    const feedbackListContainer = document.createElement('div');
    Object.assign(feedbackListContainer.style, {
        flex: '1', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '4px',
        overflowY: 'auto', maxHeight: '140px', backgroundColor: '#fafafa'
    });

    const addFeedbackRow    = document.createElement('div');
    Object.assign(addFeedbackRow.style, { display: 'flex', flexDirection: 'column', marginTop: '4px', gap: '4px' });
    const newFeedbackInput  = mkTextarea('Add a new feedback comment for this assignment...');
    const addFeedbackBtnRow = document.createElement('div');
    Object.assign(addFeedbackBtnRow.style, { display: 'flex', justifyContent: 'flex-start' });
    const addFeedbackBtn    = mkBtn('➕ Add Feedback');
    addFeedbackBtnRow.appendChild(addFeedbackBtn);
    addFeedbackRow.append(newFeedbackInput, addFeedbackBtnRow);

    // ── Next Steps block ──────────────────────────────────────────────────
    const nextStepsBlock = document.createElement('div');
    Object.assign(nextStepsBlock.style, {
        display: 'flex', flexDirection: 'column', border: '1px solid #e0e0e0',
        borderRadius: '4px', padding: '4px', backgroundColor: '#f9fafb', gap: '4px', marginTop: '4px'
    });

    const nextStepsTop = document.createElement('div');
    Object.assign(nextStepsTop.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between' });
    const nextStepsLabel = document.createElement('span');
    nextStepsLabel.textContent = 'Next steps comments:';
    nextStepsLabel.style.fontWeight = '600';

    const includeNextStepsLabel    = document.createElement('label');
    const includeNextStepsCheckbox = document.createElement('input');
    includeNextStepsCheckbox.type    = 'checkbox';
    includeNextStepsCheckbox.checked = !!config.includeNextSteps;
    Object.assign(includeNextStepsLabel.style, { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer' });
    includeNextStepsLabel.append(includeNextStepsCheckbox, makeText('Include on insert'));
    nextStepsTop.append(nextStepsLabel, includeNextStepsLabel);

    const nextStepsListContainer = document.createElement('div');
    Object.assign(nextStepsListContainer.style, {
        border: '1px solid #e0e0e0', borderRadius: '4px', padding: '4px',
        maxHeight: '100px', overflowY: 'auto', backgroundColor: '#ffffff'
    });

    const nextStepsAddRow    = document.createElement('div');
    Object.assign(nextStepsAddRow.style, { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' });
    const newNextStepInput   = mkTextarea('Add a new next steps comment for this assignment...');
    const addNextStepBtnRow  = document.createElement('div');
    Object.assign(addNextStepBtnRow.style, { display: 'flex', justifyContent: 'flex-end' });
    const addNextStepBtn     = mkBtn('➕ Add Next Step');
    addNextStepBtnRow.appendChild(addNextStepBtn);
    nextStepsAddRow.append(newNextStepInput, addNextStepBtnRow);
    nextStepsBlock.append(nextStepsTop, nextStepsListContainer, nextStepsAddRow);

    // ── CSV row ───────────────────────────────────────────────────────────
    const csvRow = document.createElement('div');
    Object.assign(csvRow.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', gap: '4px' });
    const csvLabel = document.createElement('span');
    csvLabel.textContent = 'Master CSV:';
    csvLabel.style.fontWeight = '600';
    const csvBtns = document.createElement('div');
    Object.assign(csvBtns.style, { display: 'flex', gap: '4px' });
    const downloadCsvBtn = mkBtn('⬇️ Download');
    const uploadCsvBtn   = mkBtn('⬆️ Upload');
    csvBtns.append(downloadCsvBtn, uploadCsvBtn);
    csvRow.append(csvLabel, csvBtns);

    const hiddenFileInput = document.createElement('input');
    hiddenFileInput.type    = 'file';
    hiddenFileInput.accept  = '.csv,text/csv';
    hiddenFileInput.style.display = 'none';

    // ── Skeleton email row ────────────────────────────────────────────────
    const skeletonRow      = document.createElement('div');
    Object.assign(skeletonRow.style, { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginTop: '6px', gap: '6px' });
    const skeletonCheckbox = document.createElement('input');
    skeletonCheckbox.type  = 'checkbox';
    skeletonCheckbox.id    = 'd2l-gh-skeleton-email';
    const skeletonLabel    = document.createElement('label');
    skeletonLabel.textContent = 'Prep skeleton email';
    skeletonLabel.htmlFor     = skeletonCheckbox.id;
    Object.assign(skeletonLabel.style, { cursor: 'pointer', fontSize: '12px' });
    skeletonRow.append(skeletonCheckbox, skeletonLabel);

    // ── Signature row ─────────────────────────────────────────────────────
    const signatureRow = document.createElement('div');
    Object.assign(signatureRow.style, { display: 'flex', justifyContent: 'flex-start', marginTop: '4px' });
    const signatureBtn = mkBtn('✍️ Signature');
    signatureRow.appendChild(signatureBtn);

    // ── Submit row ────────────────────────────────────────────────────────
    const submitRow = document.createElement('div');
    Object.assign(submitRow.style, { display: 'flex', justifyContent: 'flex-end', marginTop: '6px' });
    const insertBtn = document.createElement('button');
    insertBtn.textContent = 'Insert into Overall Feedback';
    Object.assign(insertBtn.style, {
        padding: '4px 10px', fontSize: '12px', borderRadius: '4px',
        border: 'none', cursor: 'pointer', backgroundColor: '#28a745', color: '#fff'
    });
    submitRow.appendChild(insertBtn);

    // ── Compose body ──────────────────────────────────────────────────────
    body.append(
        courseRow, assignmentRow, levelRow, levelFeedbackBlock,
        feedbackHeaderTop, feedbackColHeader, feedbackListContainer, addFeedbackRow,
        nextStepsBlock, csvRow, hiddenFileInput,
        skeletonRow, signatureRow, submitRow
    );

    // ── Resize handle ─────────────────────────────────────────────────────
    const resizer = document.createElement('div');
    Object.assign(resizer.style, { position: 'absolute', width: '12px', height: '12px', right: '2px', bottom: '2px', cursor: 'se-resize' });
    const resizerIcon = document.createElement('div');
    Object.assign(resizerIcon.style, { width: '100%', height: '100%', borderRight: '2px solid rgba(0,0,0,0.3)', borderBottom: '2px solid rgba(0,0,0,0.3)', boxSizing: 'border-box' });
    resizer.appendChild(resizerIcon);

    panel.append(header, body, resizer);
    document.body.appendChild(panel);

    if (ps.minimized) {
        body.style.display   = 'none';
        resizer.style.display = 'none';
        panel.style.height   = 'auto';
    }

    // ── Per-session selection state ───────────────────────────────────────
    let selectedFeedbackProf  = new Set();
    let selectedFeedbackNeeds = new Set();
    let selectedNextSteps     = new Set();

    function resetSelections() {
        selectedFeedbackProf.clear();
        selectedFeedbackNeeds.clear();
        selectedNextSteps.clear();
    }

    function remapSetAfterRemoval(set, removedIdx) {
        const next = new Set();
        set.forEach(i => { if (i < removedIdx) next.add(i); else if (i > removedIdx) next.add(i - 1); });
        return next;
    }

    function swapInSet(set, i, j) {
        const next = new Set();
        set.forEach(idx => next.add(idx === i ? j : idx === j ? i : idx));
        return next;
    }

    // ─── Refresh helpers ──────────────────────────────────────────────────

    function refreshCourseOptions() {
        courseSelect.innerHTML = '';
        const ph = document.createElement('option');
        ph.value = '';
        ph.textContent = config.courses.length ? '-- select --' : '-- add a course --';
        courseSelect.appendChild(ph);
        config.courses.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id; opt.textContent = c.name;
            courseSelect.appendChild(opt);
        });
        courseSelect.value = getCourseById(config.selectedCourseId) ? config.selectedCourseId : '';
    }

    function refreshAssignmentOptions() {
        assignmentSelect.innerHTML = '';
        const course = getCourseById(config.selectedCourseId);
        const ph = document.createElement('option');
        ph.value = '';
        ph.textContent = course && course.assignments && course.assignments.length ? '-- select --' : '-- add an assignment --';
        assignmentSelect.appendChild(ph);
        if (!course) return;
        (course.assignments || []).forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id; opt.textContent = a.name;
            assignmentSelect.appendChild(opt);
        });
        assignmentSelect.value = getAssignmentById(course, config.selectedAssignmentId) ? config.selectedAssignmentId : '';
    }

    function refreshLevelOptions() {
        levelSelect.innerHTML = '';
        const course = getCourseById(config.selectedCourseId);
        const levels = getCourseLevels(course);
        levels.forEach(level => {
            const opt = document.createElement('option');
            opt.value = level; opt.textContent = level;
            levelSelect.appendChild(opt);
        });
        if (!levels.includes(config.selectedLevel)) {
            config.selectedLevel = levels.includes('PROFICIENT') ? 'PROFICIENT' : levels[0];
            saveConfig();
        }
        levelSelect.value = config.selectedLevel;
    }

    function refreshLevelCommentUI() {
        const course     = getCourseById(config.selectedCourseId);
        const assignment = getAssignmentById(course, config.selectedAssignmentId);
        const levels     = getCourseLevels(course);
        const levelKey   = levels.includes(config.selectedLevel) ? config.selectedLevel : (levels[0] || '');

        const hasTarget = !!(assignment && levelKey);
        levelFeedbackTextarea.disabled  = !hasTarget;
        saveLevelCommentBtn.disabled    = !hasTarget;
        includeLevelCheckbox.disabled   = !hasTarget;
        levelFeedbackTextarea.value     = hasTarget ? (getLevelCommentsObj(assignment)[levelKey] || '') : '';
    }

    function refreshFeedbackList() {
        feedbackListContainer.innerHTML = '';
        const course     = getCourseById(config.selectedCourseId);
        const assignment = getAssignmentById(course, config.selectedAssignmentId);

        if (!course || !assignment) {
            feedbackListContainer.appendChild(italicMsg('Select a course and assignment to see feedback options.'));
            return;
        }

        const list = getFeedbackList(assignment);
        if (!list.length) {
            feedbackListContainer.appendChild(italicMsg('No feedback comments yet for this assignment.'));
            return;
        }

        list.forEach((text, idx) => {
            const row = document.createElement('div');
            Object.assign(row.style, {
                display: 'grid', gridTemplateColumns: '28px 28px 1fr',
                columnGap: '4px', alignItems: 'flex-start', padding: '2px'
            });

            const profCb  = mkCheckbox(selectedFeedbackProf.has(idx),  cb => cb.checked ? selectedFeedbackProf.add(idx) : selectedFeedbackProf.delete(idx));
            const needsCb = mkCheckbox(selectedFeedbackNeeds.has(idx), cb => cb.checked ? selectedFeedbackNeeds.add(idx) : selectedFeedbackNeeds.delete(idx));

            const commentCell = document.createElement('div');
            Object.assign(commentCell.style, { display: 'flex', alignItems: 'flex-start', gap: '4px', paddingLeft: '8px' });

            const label = document.createElement('div');
            label.textContent = text;
            Object.assign(label.style, { flex: '1', whiteSpace: 'normal', lineHeight: '1.3' });

            const editBtn = mkIconBtn('✎', '#0066cc', 'Edit');
            const upBtn   = mkIconBtn('↑', '#555',    'Move up');
            const downBtn = mkIconBtn('↓', '#555',    'Move down');
            const delBtn  = mkIconBtn('✕', '#b00',    'Delete');

            editBtn.addEventListener('click', () => {
                const v = window.prompt('Edit this feedback comment:', list[idx]);
                if (v !== null && v.trim()) { list[idx] = v.trim(); saveConfig(); refreshFeedbackList(); }
            });
            upBtn.addEventListener('click', () => {
                if (idx <= 0) return;
                [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
                selectedFeedbackProf  = swapInSet(selectedFeedbackProf,  idx, idx - 1);
                selectedFeedbackNeeds = swapInSet(selectedFeedbackNeeds, idx, idx - 1);
                saveConfig(); refreshFeedbackList();
            });
            downBtn.addEventListener('click', () => {
                if (idx >= list.length - 1) return;
                [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
                selectedFeedbackProf  = swapInSet(selectedFeedbackProf,  idx, idx + 1);
                selectedFeedbackNeeds = swapInSet(selectedFeedbackNeeds, idx, idx + 1);
                saveConfig(); refreshFeedbackList();
            });
            delBtn.addEventListener('click', () => {
                if (!confirm('Remove this feedback comment?')) return;
                list.splice(idx, 1);
                selectedFeedbackProf  = remapSetAfterRemoval(selectedFeedbackProf,  idx);
                selectedFeedbackNeeds = remapSetAfterRemoval(selectedFeedbackNeeds, idx);
                saveConfig(); refreshFeedbackList();
            });

            const btnGroup = document.createElement('div');
            Object.assign(btnGroup.style, { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '2px' });
            btnGroup.append(editBtn, upBtn, downBtn, delBtn);

            commentCell.append(label, btnGroup);
            row.append(profCb, needsCb, commentCell);
            feedbackListContainer.appendChild(row);
        });
    }

    function refreshNextStepsList() {
        nextStepsListContainer.innerHTML = '';
        const course     = getCourseById(config.selectedCourseId);
        const assignment = getAssignmentById(course, config.selectedAssignmentId);

        if (!course || !assignment) {
            nextStepsListContainer.appendChild(italicMsg('Select a course and assignment to see next steps.'));
            return;
        }

        const list = getNextStepsList(assignment);
        if (!list.length) {
            nextStepsListContainer.appendChild(italicMsg('No next steps comments yet for this assignment.'));
            return;
        }

        list.forEach((text, idx) => {
            const row = document.createElement('div');
            Object.assign(row.style, { display: 'flex', alignItems: 'flex-start', gap: '4px', padding: '2px' });

            const cb = mkCheckbox(selectedNextSteps.has(idx), c => c.checked ? selectedNextSteps.add(idx) : selectedNextSteps.delete(idx));
            cb.style.marginTop = '2px';

            const label = document.createElement('div');
            label.textContent = text;
            Object.assign(label.style, { flex: '1', whiteSpace: 'normal', lineHeight: '1.3' });

            const editBtn = mkIconBtn('✎', '#0066cc', 'Edit');
            const upBtn   = mkIconBtn('↑', '#555',    'Move up');
            const downBtn = mkIconBtn('↓', '#555',    'Move down');
            const delBtn  = mkIconBtn('✕', '#b00',    'Delete');

            editBtn.addEventListener('click', () => {
                const v = window.prompt('Edit this next steps comment:', list[idx]);
                if (v !== null && v.trim()) { list[idx] = v.trim(); saveConfig(); refreshNextStepsList(); }
            });
            upBtn.addEventListener('click', () => {
                if (idx <= 0) return;
                [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
                selectedNextSteps = swapInSet(selectedNextSteps, idx, idx - 1);
                saveConfig(); refreshNextStepsList();
            });
            downBtn.addEventListener('click', () => {
                if (idx >= list.length - 1) return;
                [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
                selectedNextSteps = swapInSet(selectedNextSteps, idx, idx + 1);
                saveConfig(); refreshNextStepsList();
            });
            delBtn.addEventListener('click', () => {
                if (!confirm('Remove this next steps comment?')) return;
                list.splice(idx, 1);
                selectedNextSteps = remapSetAfterRemoval(selectedNextSteps, idx);
                saveConfig(); refreshNextStepsList();
            });

            const btnGroup = document.createElement('div');
            Object.assign(btnGroup.style, { display: 'flex', alignItems: 'center', gap: '2px' });
            btnGroup.append(editBtn, upBtn, downBtn, delBtn);

            row.append(cb, label, btnGroup);
            nextStepsListContainer.appendChild(row);
        });
    }

    // ─── CSV modals ───────────────────────────────────────────────────────

    function handleDownloadCsv() {
        if (!config.courses.length) { alert('No courses found in the configuration.'); return; }

        const modal   = makeCsvOverlay();
        const dialog  = makeCsvDialog();
        const title   = document.createElement('h3');
        title.textContent = 'Download CSV';
        title.style.cssText = 'margin-top:0;margin-bottom:12px';

        const course     = getCourseById(config.selectedCourseId);
        const courseName = course ? course.name : '';

        const radioBox = document.createElement('div');
        Object.assign(radioBox.style, { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' });

        appendRadioOption(radioBox, 'csvDownloadOption', 'course',   course ? `Current Course (${courseName})` : 'Current Course (none selected)', !!course, !course);
        appendRadioOption(radioBox, 'csvDownloadOption', 'all',      'All Courses',                   !course);
        appendRadioOption(radioBox, 'csvDownloadOption', 'template', 'Template (with example data)', false);

        const btns       = makeBtnRow();
        const cancelBtn2 = makeCsvBtn('Cancel', '#6c757d'); cancelBtn2.addEventListener('click', () => modal.remove());
        const dlBtn      = makeCsvBtn('Download', '#0066cc');
        dlBtn.addEventListener('click', () => {
            const choice = dialog.querySelector('input[name="csvDownloadOption"]:checked').value;
            let csvText, filenameBase;

            if (choice === 'course' && course) {
                csvText      = buildMasterCsvFromConfig(config, [course.id]);
                filenameBase = sanitizeFilename(course.name);
            } else if (choice === 'template') {
                csvText = [
                    '# D2L Grading Helper Master Comment Template',
                    '# Section: FEEDBACK, NEXT_STEP, or LEVEL_COMMENT',
                    '# For FEEDBACK and NEXT_STEP rows, leave Level blank.',
                    '# For LEVEL_COMMENT rows, fill Level with the proficiency level name.',
                    'Section,Course,Assignment,Level,Comment',
                    'FEEDBACK,"Math 10","Unit 1 Test","","Great use of formulas and clear work shown"',
                    'FEEDBACK,"Math 10","Unit 1 Test","","Check your calculations in question 5"',
                    'NEXT_STEP,"Math 10","Unit 1 Test","","Review the order of operations"',
                    'NEXT_STEP,"Math 10","Unit 1 Test","","Practice multi-step problems"',
                    'LEVEL_COMMENT,"Math 10","Unit 1 Test","EXTENDING","Excellent mastery of all concepts with sophisticated problem-solving"',
                    'LEVEL_COMMENT,"Math 10","Unit 1 Test","PROFICIENT","Good understanding of core concepts with minor errors"',
                    'LEVEL_COMMENT,"Math 10","Unit 1 Test","DEVELOPING","Shows partial understanding but needs more practice"',
                    'LEVEL_COMMENT,"Math 10","Unit 1 Test","EMERGING","Beginning to grasp basic concepts, requires significant support"',
                ].join('\n');
                filenameBase = 'grading_helper_template';
            } else {
                csvText      = buildMasterCsvFromConfig(config, null);
                filenameBase = 'grading_helper_master';
            }

            triggerDownload(csvText, filenameBase + '_' + formatToday().replace(/[\s,]/g, '_') + '.csv');
            modal.remove();
        });

        btns.append(cancelBtn2, dlBtn);
        dialog.append(title, radioBox, btns);
        modal.appendChild(dialog);
        document.body.appendChild(modal);
    }

    function handleUploadCsvModal() {
        const modal  = makeCsvOverlay();
        const dialog = makeCsvDialog();
        const title  = document.createElement('h3');
        title.textContent = 'Upload CSV';
        title.style.cssText = 'margin-top:0;margin-bottom:12px';

        const course     = getCourseById(config.selectedCourseId);
        const courseName = course ? course.name : '';

        // Scope section
        const scopeHeading = makeSectionHeading('Upload scope:');
        const scopeBox = document.createElement('div');
        Object.assign(scopeBox.style, { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' });
        appendRadioOption(scopeBox, 'csvUploadScope', 'course', course ? `Current Course Only (${courseName})` : 'Current Course (none selected)', !!course, !course);
        appendRadioOption(scopeBox, 'csvUploadScope', 'all',    'All Courses', !course);

        // Mode section
        const modeHeading = makeSectionHeading('Upload mode:');
        const modeBox = document.createElement('div');
        Object.assign(modeBox.style, { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' });
        appendRadioOption(modeBox, 'csvUploadMode', 'merge',   'Merge (add new items, keep existing)', true);

        // Replace option needs innerHTML for the warning icon
        const replaceLbl = document.createElement('label');
        Object.assign(replaceLbl.style, { display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px' });
        const replaceR = document.createElement('input');
        replaceR.type = 'radio'; replaceR.name = 'csvUploadMode'; replaceR.value = 'replace'; replaceR.style.marginRight = '8px';
        const replaceSpan = document.createElement('span');
        replaceSpan.innerHTML = 'Replace (⚠️ <strong>overwrite existing data</strong>)';
        replaceLbl.append(replaceR, replaceSpan);
        modeBox.appendChild(replaceLbl);

        const btns       = makeBtnRow();
        const cancelBtn2 = makeCsvBtn('Cancel', '#6c757d'); cancelBtn2.addEventListener('click', () => modal.remove());
        const chooseBtn  = makeCsvBtn('Choose File…', '#0066cc');
        chooseBtn.addEventListener('click', () => {
            const scope = dialog.querySelector('input[name="csvUploadScope"]:checked').value;
            const mode  = dialog.querySelector('input[name="csvUploadMode"]:checked').value;

            if (mode === 'replace' && !confirm(
                'Are you sure you want to REPLACE existing data?\n\n' +
                'Existing information will be overwritten.\n\n' +
                'Select CANCEL to go back and choose Merge mode instead.'
            )) return;

            hiddenFileInput.dataset.uploadScope = scope;
            hiddenFileInput.dataset.uploadMode  = mode;
            hiddenFileInput.value = '';
            hiddenFileInput.click();
            modal.remove();
        });

        btns.append(cancelBtn2, chooseBtn);
        dialog.append(title, scopeHeading, scopeBox, modeHeading, modeBox, btns);
        modal.appendChild(dialog);
        document.body.appendChild(modal);
    }

    function handleUploadCsvFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            const course  = getCourseById(config.selectedCourseId);
            const scope   = hiddenFileInput.dataset.uploadScope || 'all';
            const mode    = hiddenFileInput.dataset.uploadMode  || 'merge';

            const result = applyMasterCsvToConfig(e.target.result, {
                scope:             scope === 'course' ? 'current' : 'all',
                mode:              mode  === 'replace' ? 'replace' : 'merge',
                currentCourseName: course ? course.name : null
            });

            saveConfig();
            refreshAll();

            const modeLabel = mode === 'replace' ? 'REPLACED' : 'MERGED';
            alert(
                `CSV import complete (${modeLabel}).\n\n` +
                `Courses touched: ${result.coursesTouched}\n` +
                `Assignments touched: ${result.assignmentsTouched}\n` +
                `Comments added/merged: ${result.feedbackAdded}\n` +
                `Level comments updated: ${result.levelCommentsUpdated}`
            );
        };
        reader.readAsText(file);
    }

    // ─── Feedback / email HTML builders ──────────────────────────────────

    function buildOverallFeedbackHtml() {
        const course     = getCourseById(config.selectedCourseId);
        const assignment = getAssignmentById(course, config.selectedAssignmentId);
        if (!course || !assignment) { alert('Please select a course and assignment first.'); return null; }

        const levels   = getCourseLevels(course);
        const levelKey = levels.includes(config.selectedLevel) ? config.selectedLevel : (levels[0] || '');
        const levelText = (config.includeLevelComment && levelKey)
            ? (getLevelCommentsObj(assignment)[levelKey] || '').trim() : '';

        const [profComments, needsComments] = collectFeedbackSelections(assignment);
        const nextStepsSelected = collectNextStepsSelections(assignment);

        let html = '';
        const today = formatToday();
        if (today)      html += `<p>${escapeHtml(today)}</p>`;
        const firstName = getStudentFirstName();
        if (firstName)  html += `<p>Hi ${escapeHtml(firstName)},</p>`;
        if (levelText)  html += `<p>${escapeHtml(levelText)}</p>`;

        if (profComments.length) {
            html += '<p><strong>What you did well:</strong></p><ul>';
            profComments.forEach(c => { html += `<li>${escapeHtml(c)}</li>`; });
            html += '</ul>';
        }
        if (needsComments.length) {
            html += '<p><strong>Areas for improvement:</strong></p><ul>';
            needsComments.forEach(c => { html += `<li>${escapeHtml(c)}</li>`; });
            html += '</ul>';
        }
        if (nextStepsSelected.length) {
            html += '<p><strong>Next steps:</strong></p><ul>';
            nextStepsSelected.forEach(c => { html += `<li>${escapeHtml(c)}</li>`; });
            html += '</ul>';
        }
        if (teacherSignature) html += `<p>${teacherSignature}</p>`;
        if (!html) html = '<p>(No feedback selected.)</p>';

        return html;
    }

    function buildSkeletonEmailText() {
        const course     = getCourseById(config.selectedCourseId);
        const assignment = getAssignmentById(course, config.selectedAssignmentId);
        if (!course || !assignment) return '';

        const levels   = getCourseLevels(course);
        const levelKey = levels.includes(config.selectedLevel) ? config.selectedLevel : (levels[0] || '');
        const levelText = (config.includeLevelComment && levelKey)
            ? (getLevelCommentsObj(assignment)[levelKey] || '').trim() : '';

        const [profComments, needsComments] = collectFeedbackSelections(assignment);
        const nextStepsSelected = collectNextStepsSelections(assignment);

        const firstName      = getStudentFirstName();
        const courseName     = course.name     || '';
        const assignmentName = assignment.name || '';

        let text = firstName ? `Hi ${firstName},\n\n` : 'Hi,\n\n';
        if (assignmentName || courseName) {
            text += 'Here is some feedback';
            if (assignmentName) text += ` for "${assignmentName}"`;
            if (courseName)     text += ` in ${courseName}`;
            text += '.\n\n';
        }
        if (levelText) text += levelText + '\n\n';

        if (profComments.length)  { text += 'What you did well:\n';     profComments.forEach(c =>  { text += `• ${c}\n`; }); text += '\n'; }
        if (needsComments.length) { text += 'Areas for improvement:\n'; needsComments.forEach(c => { text += `• ${c}\n`; }); text += '\n'; }
        if (nextStepsSelected.length) { text += 'Next steps:\n'; nextStepsSelected.forEach(c => { text += `• ${c}\n`; }); text += '\n'; }
        if (teacherSignature) text += '\n' + teacherSignature.replace(/<br\s*\/?>/gi, '\n') + '\n';

        return text.trim();
    }

    function collectFeedbackSelections(assignment) {
        const prof = [], needs = [];
        getFeedbackList(assignment).forEach((text, idx) => {
            const t = String(text || '').trim();
            if (!t) return;
            if (selectedFeedbackProf.has(idx))  prof.push(t);
            if (selectedFeedbackNeeds.has(idx)) needs.push(t);
        });
        return [prof, needs];
    }

    function collectNextStepsSelections(assignment) {
        if (!config.includeNextSteps) return [];
        const result = [];
        getNextStepsList(assignment).forEach((text, idx) => {
            const t = String(text || '').trim();
            if (t && selectedNextSteps.has(idx)) result.push(t);
        });
        return result;
    }

    // ─── Skeleton email send ──────────────────────────────────────────────

    function copyAndOpenEmail(emailText) {
        if (!emailText) { alert('No skeleton email content (no feedback selected?).'); return; }

        const doCopy = () => {
            const ta = document.createElement('textarea');
            ta.value = emailText;
            ta.style.cssText = 'position:fixed;left:-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); alert('Skeleton email copied to clipboard. Paste into your email draft.'); }
            catch (e) { alert('Unable to copy automatically.\n\n' + emailText); }
            document.body.removeChild(ta);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(emailText)
                .then(() => alert('Skeleton email copied to clipboard. Paste into your email draft.'))
                .catch(doCopy);
        } else {
            doCopy();
        }

        const course     = getCourseById(config.selectedCourseId);
        const assignment = getAssignmentById(course, config.selectedAssignmentId);
        const cn         = course     ? course.name     : '';
        const an         = assignment ? assignment.name : '';
        let subject = 'Feedback on your assignment';
        if (an) { subject = `Feedback on ${an}`; if (cn) subject += ` (${cn})`; }
        else if (cn) { subject = `Feedback in ${cn}`; }

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailText)}`;
    }

    // ─── Full refresh ─────────────────────────────────────────────────────

    function refreshAll() {
        refreshCourseOptions();
        refreshAssignmentOptions();
        refreshLevelOptions();
        refreshLevelCommentUI();
        refreshFeedbackList();
        refreshNextStepsList();
    }

    // ─── Event wiring ─────────────────────────────────────────────────────

    minimizeBtn.addEventListener('click', () => {
        ps.minimized = !ps.minimized;
        if (ps.minimized) {
            ps.height = panel.offsetHeight;
            body.style.display    = 'none';
            resizer.style.display = 'none';
            panel.style.height    = 'auto';
        } else {
            body.style.display    = 'flex';
            resizer.style.display = 'block';
            panel.style.height    = (ps.height || 480) + 'px';
        }
        minimizeBtn.textContent = ps.minimized ? '▢' : '▁';
        saveConfig();
    });

    courseSelect.addEventListener('change', () => {
        config.selectedCourseId = courseSelect.value || null;
        config.selectedAssignmentId = null;
        resetSelections(); saveConfig();
        refreshAssignmentOptions(); refreshLevelOptions(); refreshLevelCommentUI();
        refreshFeedbackList(); refreshNextStepsList();
    });

    assignmentSelect.addEventListener('change', () => {
        const course = getCourseById(config.selectedCourseId);
        config.selectedAssignmentId = (course && assignmentSelect.value) ? assignmentSelect.value : null;
        resetSelections(); saveConfig();
        refreshLevelCommentUI(); refreshFeedbackList(); refreshNextStepsList();
    });

    levelSelect.addEventListener('change', () => {
        if (!levelSelect.value) return;
        config.selectedLevel = levelSelect.value;
        saveConfig(); refreshLevelCommentUI();
    });

    includeLevelCheckbox.addEventListener('change', () => {
        config.includeLevelComment = includeLevelCheckbox.checked; saveConfig();
    });
    includeNextStepsCheckbox.addEventListener('change', () => {
        config.includeNextSteps = includeNextStepsCheckbox.checked; saveConfig();
    });

    // ── Course management ────────────────────────────────────────────────
    addCourseBtn.addEventListener('click', () => {
        const name = (window.prompt('Enter a name for the new course:') || '').trim();
        if (!name) return;
        const course = { id: uuid(), name, levels: DEFAULT_LEVELS.slice(), assignments: [] };
        config.courses.push(course);
        config.selectedCourseId = course.id;
        config.selectedAssignmentId = null;
        saveConfig(); refreshAll();
    });

    renameCourseBtn.addEventListener('click', () => {
        const course = getCourseById(config.selectedCourseId);
        if (!course) { alert('Select a course first.'); return; }
        const name = (window.prompt('Rename course:', course.name || '') || '').trim();
        if (!name) return;
        course.name = name; saveConfig(); refreshCourseOptions();
    });

    deleteCourseBtn.addEventListener('click', () => {
        const course = getCourseById(config.selectedCourseId);
        if (!course) { alert('Select a course first.'); return; }
        if (!confirm(`Delete course "${course.name}" and all its assignments/comments?`)) return;
        config.courses = config.courses.filter(c => c.id !== course.id);
        config.selectedCourseId = config.courses.length ? config.courses[0].id : null;
        config.selectedAssignmentId = null;
        resetSelections(); saveConfig(); refreshAll();
    });

    reorderCoursesBtn.addEventListener('click', () => {
        if (!config.courses.length) { alert('No courses to reorder.'); return; }
        openListEditorModal({
            title: 'Reorder courses', items: config.courses.map(c => c.name || ''),
            onApply: newOrder => {
                config.courses = reorderByName(config.courses, newOrder, c => c.name);
                saveConfig(); refreshCourseOptions();
            }
        });
    });

    editLevelsBtn.addEventListener('click', () => {
        const course = getCourseById(config.selectedCourseId);
        if (!course) { alert('Select a course first.'); return; }
        openListEditorModal({
            title: 'Edit levels', items: getCourseLevels(course),
            allowEdit: true, allowAdd: true, allowDelete: true,
            onApply: newLevels => {
                const levels = newLevels.map(s => s.trim()).filter(Boolean);
                if (!levels.length) { alert('You must have at least one level.'); return; }
                course.levels = levels;
                (course.assignments || []).forEach(a => {
                    const lc = a.levelComments || {};
                    a.levelComments = Object.fromEntries(levels.map(l => [l, lc[l] || '']));
                });
                if (!levels.includes(config.selectedLevel)) config.selectedLevel = levels[0];
                saveConfig(); refreshLevelOptions(); refreshLevelCommentUI();
            }
        });
    });

    // ── Assignment management ────────────────────────────────────────────
    addAssignmentBtn.addEventListener('click', () => {
        const course = getCourseById(config.selectedCourseId);
        if (!course) { alert('Add/select a course first.'); return; }
        const guess = detectCourseAndAssignmentFromTitle();
        const defaultName = guess && guess.assignmentName ? guess.assignmentName : '';
        const name = (window.prompt('Enter a name for the new assignment:', defaultName) || '').trim();
        if (!name) return;
        const assignment = {
            id: uuid(), name, feedback: [], nextSteps: [],
            levelComments: Object.fromEntries(getCourseLevels(course).map(l => [l, '']))
        };
        course.assignments = course.assignments || [];
        course.assignments.push(assignment);
        config.selectedAssignmentId = assignment.id;
        resetSelections(); saveConfig();
        refreshAssignmentOptions(); refreshLevelCommentUI(); refreshFeedbackList(); refreshNextStepsList();
    });

    renameAssignmentBtn.addEventListener('click', () => {
        const course     = getCourseById(config.selectedCourseId);
        const assignment = getAssignmentById(course, config.selectedAssignmentId);
        if (!assignment) { alert('Select an assignment first.'); return; }
        const name = (window.prompt('Rename assignment:', assignment.name || '') || '').trim();
        if (!name) return;
        assignment.name = name; saveConfig(); refreshAssignmentOptions();
    });

    deleteAssignmentBtn.addEventListener('click', () => {
        const course     = getCourseById(config.selectedCourseId);
        const assignment = getAssignmentById(course, config.selectedAssignmentId);
        if (!assignment) { alert('Select an assignment first.'); return; }
        if (!confirm(`Delete assignment "${assignment.name}" and its comments?`)) return;
        course.assignments = course.assignments.filter(a => a.id !== assignment.id);
        config.selectedAssignmentId = course.assignments.length ? course.assignments[0].id : null;
        resetSelections(); saveConfig();
        refreshAssignmentOptions(); refreshLevelCommentUI(); refreshFeedbackList(); refreshNextStepsList();
    });

    moveUpBtn.addEventListener('click', () => {
        const course = getCourseById(config.selectedCourseId);
        if (!course) return;
        const arr = course.assignments || [];
        const idx = arr.findIndex(a => a.id === config.selectedAssignmentId);
        if (idx <= 0) return;
        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
        saveConfig(); refreshAssignmentOptions();
    });

    moveDownBtn.addEventListener('click', () => {
        const course = getCourseById(config.selectedCourseId);
        if (!course) return;
        const arr = course.assignments || [];
        const idx = arr.findIndex(a => a.id === config.selectedAssignmentId);
        if (idx === -1 || idx >= arr.length - 1) return;
        [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
        saveConfig(); refreshAssignmentOptions();
    });

    reorderAssignmentsBtn.addEventListener('click', () => {
        const course = getCourseById(config.selectedCourseId);
        if (!course || !(course.assignments || []).length) { alert('No assignments to reorder.'); return; }
        openListEditorModal({
            title: 'Reorder assignments', items: course.assignments.map(a => a.name || ''),
            onApply: newOrder => {
                course.assignments = reorderByName(course.assignments, newOrder, a => a.name);
                saveConfig(); refreshAssignmentOptions();
            }
        });
    });

    // ── Level management ─────────────────────────────────────────────────
    addLevelBtn.addEventListener('click', () => {
        const course = getCourseById(config.selectedCourseId);
        if (!course) { alert('Select a course first.'); return; }
        const name = (window.prompt('Enter a name for the new level:') || '').trim();
        if (!name) return;
        const levels = getCourseLevels(course);
        if (levels.includes(name)) { alert('This level already exists.'); return; }
        levels.push(name);
        course.levels = levels;
        (course.assignments || []).forEach(a => { (a.levelComments = a.levelComments || {})[name] = ''; });
        config.selectedLevel = name;
        saveConfig(); refreshLevelOptions(); refreshLevelCommentUI();
    });

    renameLevelBtn.addEventListener('click', () => {
        const course = getCourseById(config.selectedCourseId);
        if (!course) { alert('Select a course first.'); return; }
        const levels       = getCourseLevels(course);
        const currentLevel = config.selectedLevel;
        if (!currentLevel || !levels.includes(currentLevel)) { alert('Select a level first.'); return; }
        const newName = (window.prompt('Rename level:', currentLevel) || '').trim();
        if (!newName || newName === currentLevel) return;
        if (levels.includes(newName)) { alert('A level with this name already exists.'); return; }
        levels[levels.indexOf(currentLevel)] = newName;
        course.levels = levels;
        (course.assignments || []).forEach(a => {
            const lc = a.levelComments || {};
            if (currentLevel in lc) { lc[newName] = lc[currentLevel]; delete lc[currentLevel]; }
        });
        config.selectedLevel = newName;
        saveConfig(); refreshLevelOptions(); refreshLevelCommentUI();
    });

    reorderLevelsBtn.addEventListener('click', () => {
        const course = getCourseById(config.selectedCourseId);
        if (!course) { alert('Select a course first.'); return; }
        const levels = getCourseLevels(course);
        if (levels.length < 2) { alert('Need at least 2 levels to reorder.'); return; }
        openListEditorModal({
            title: 'Reorder levels', items: levels,
            onApply: newLevels => {
                const lvls = newLevels.map(s => s.trim()).filter(Boolean);
                if (!lvls.length) { alert('You must have at least one level.'); return; }
                course.levels = lvls;
                if (!lvls.includes(config.selectedLevel)) config.selectedLevel = lvls[0];
                saveConfig(); refreshLevelOptions(); refreshLevelCommentUI();
            }
        });
    });

    deleteLevelBtn.addEventListener('click', () => {
        const course = getCourseById(config.selectedCourseId);
        if (!course) { alert('Select a course first.'); return; }
        const levels       = getCourseLevels(course);
        const currentLevel = config.selectedLevel;
        if (!currentLevel || !levels.includes(currentLevel)) { alert('Select a level first.'); return; }
        if (levels.length === 1) { alert('Cannot delete the only remaining level.'); return; }
        if (!confirm(`Delete level "${currentLevel}"? This will remove associated level comments from all assignments.`)) return;
        levels.splice(levels.indexOf(currentLevel), 1);
        course.levels = levels;
        (course.assignments || []).forEach(a => { const lc = a.levelComments || {}; delete lc[currentLevel]; });
        config.selectedLevel = levels[0] || '';
        saveConfig(); refreshLevelOptions(); refreshLevelCommentUI();
    });

    // ── Level comment save ────────────────────────────────────────────────
    saveLevelCommentBtn.addEventListener('click', () => {
        const course     = getCourseById(config.selectedCourseId);
        const assignment = getAssignmentById(course, config.selectedAssignmentId);
        if (!course || !assignment) { alert('Select a course and assignment first.'); return; }
        const levels   = getCourseLevels(course);
        const levelKey = levels.includes(config.selectedLevel) ? config.selectedLevel : levels[0];
        if (!levelKey) return;
        getLevelCommentsObj(assignment)[levelKey] = levelFeedbackTextarea.value || '';
        saveConfig();
        alert(`Saved level comment for "${levelKey}".`);
    });

    // ── Feedback add ──────────────────────────────────────────────────────
    addFeedbackBtn.addEventListener('click', () => {
        const course     = getCourseById(config.selectedCourseId);
        const assignment = getAssignmentById(course, config.selectedAssignmentId);
        if (!course || !assignment) { alert('Select a course and assignment first.'); return; }
        const text = newFeedbackInput.value.trim();
        if (!text) return;
        getFeedbackList(assignment).push(text);
        newFeedbackInput.value = '';
        saveConfig(); refreshFeedbackList();
    });

    addNextStepBtn.addEventListener('click', () => {
        const course     = getCourseById(config.selectedCourseId);
        const assignment = getAssignmentById(course, config.selectedAssignmentId);
        if (!course || !assignment) { alert('Select a course and assignment first.'); return; }
        const text = newNextStepInput.value.trim();
        if (!text) return;
        getNextStepsList(assignment).push(text);
        newNextStepInput.value = '';
        saveConfig(); refreshNextStepsList();
    });

    selectAllBtn.addEventListener('click', () => {
        const course     = getCourseById(config.selectedCourseId);
        const assignment = getAssignmentById(course, config.selectedAssignmentId);
        if (!course || !assignment) return;
        selectedFeedbackProf = new Set(getFeedbackList(assignment).map((_, i) => i));
        selectedFeedbackNeeds.clear();
        refreshFeedbackList();
    });

    clearAllBtn.addEventListener('click', () => {
        selectedFeedbackProf.clear(); selectedFeedbackNeeds.clear(); refreshFeedbackList();
    });

    // ── CSV ───────────────────────────────────────────────────────────────
    downloadCsvBtn.addEventListener('click', handleDownloadCsv);
    uploadCsvBtn.addEventListener('click', handleUploadCsvModal);
    hiddenFileInput.addEventListener('change', () => {
        if (hiddenFileInput.files && hiddenFileInput.files.length) handleUploadCsvFile(hiddenFileInput.files[0]);
    });

    // ── Signature / insert ────────────────────────────────────────────────
    signatureBtn.addEventListener('click', configureSignature);

    insertBtn.addEventListener('click', () => {
        const html = buildOverallFeedbackHtml();
        if (!html || !setOverallFeedbackHtml(html)) return;

        if (skeletonCheckbox.checked) {
            const emailText = buildSkeletonEmailText();
            if (emailText) copyAndOpenEmail(emailText);
            else alert('No skeleton email content to use for the draft email.');
        }
    });

    // ── Drag ──────────────────────────────────────────────────────────────
    (function setupDrag() {
        let dragging = false, offsetX = 0, offsetY = 0;
        header.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            dragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
        function onMove(e) {
            if (!dragging) return;
            ps.left = Math.min(window.innerWidth  - 50, Math.max(0, e.clientX - offsetX));
            ps.top  = Math.min(window.innerHeight - 50, Math.max(0, e.clientY - offsetY));
            panel.style.left = ps.left + 'px';
            panel.style.top  = ps.top  + 'px';
            saveConfig();
        }
        function onUp() { dragging = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    })();

    // ── Resize ────────────────────────────────────────────────────────────
    (function setupResize() {
        let resizing = false, sw = 0, sh = 0, sx = 0, sy = 0;
        resizer.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            resizing = true;
            sw = panel.offsetWidth; sh = panel.offsetHeight; sx = e.clientX; sy = e.clientY;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
        function onMove(e) {
            if (!resizing) return;
            ps.width  = Math.max(320, sw + (e.clientX - sx));
            ps.height = Math.max(320, sh + (e.clientY - sy));
            panel.style.width  = ps.width  + 'px';
            panel.style.height = ps.height + 'px';
            saveConfig();
        }
        function onUp() { resizing = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    })();

    // ── Initial render ────────────────────────────────────────────────────
    refreshAll();
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function makeText(text) {
    const span = document.createElement('span');
    span.textContent = text;
    return span;
}

function mkTextarea(placeholder) {
    const ta = document.createElement('textarea');
    ta.rows = 2;
    ta.placeholder = placeholder;
    Object.assign(ta.style, {
        width: '100%', fontSize: '12px', padding: '4px', borderRadius: '4px',
        border: '1px solid #ccc', resize: 'vertical', boxSizing: 'border-box'
    });
    return ta;
}

function mkCheckbox(checked, onChange) {
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = checked; cb.style.margin = '0 auto';
    cb.addEventListener('change', () => onChange(cb));
    return cb;
}

function italicMsg(text) {
    const d = document.createElement('div');
    d.textContent = text;
    d.style.fontStyle = 'italic'; d.style.color = '#555';
    return d;
}

function reorderByName(arr, newOrder, getName) {
    const old  = arr.slice();
    const used = new Set();
    const result = [];
    newOrder.forEach(name => {
        const idx = old.findIndex((item, i) => !used.has(i) && getName(item) === name);
        if (idx !== -1) { result.push(old[idx]); used.add(idx); }
    });
    old.forEach((item, i) => { if (!used.has(i)) result.push(item); });
    return result;
}

// ── CSV modal helpers ────────────────────────────────────────────────────────

function makeCsvOverlay() {
    const d = document.createElement('div');
    Object.assign(d.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '1000000',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    });
    return d;
}

function makeCsvDialog() {
    const d = document.createElement('div');
    Object.assign(d.style, {
        backgroundColor: 'white', padding: '20px', borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxWidth: '400px', width: '90%',
        fontFamily: 'Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, sans-serif', fontSize: '13px'
    });
    return d;
}

function makeCsvBtn(label, bg) {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, { padding: '6px 16px', borderRadius: '4px', border: 'none', backgroundColor: bg, color: 'white', cursor: 'pointer' });
    return b;
}

function makeBtnRow() {
    const d = document.createElement('div');
    Object.assign(d.style, { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' });
    return d;
}

function appendRadioOption(container, name, value, labelText, checked, disabled) {
    const lbl = document.createElement('label');
    Object.assign(lbl.style, { display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px' });
    const radio = document.createElement('input');
    radio.type = 'radio'; radio.name = name; radio.value = value;
    radio.checked = !!checked; radio.disabled = !!disabled; radio.style.marginRight = '8px';
    const span = document.createElement('span'); span.textContent = labelText;
    lbl.append(radio, span);
    container.appendChild(lbl);
}

function makeSectionHeading(text) {
    const d = document.createElement('div');
    d.textContent = text;
    Object.assign(d.style, { fontWeight: '600', marginBottom: '8px', marginTop: '8px', fontSize: '13px' });
    return d;
}

function triggerDownload(text, filename) {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ─── Kick off ─────────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePanel);
} else {
    initializePanel();
}
