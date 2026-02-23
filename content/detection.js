/**
 * detection.js
 * Auto-detect the current course and assignment from the page title / DOM,
 * and extract the student's first name.
 * Depends on: utils.js (uuid, findInAllShadowRoots), config.js (config, saveConfig, DEFAULT_LEVELS)
 */

// ─── Student name ─────────────────────────────────────────────────────────────

/**
 * Extracts the student's first name from the page title.
 * D2L titles look like: "Assignment Evaluation - Jane Smith - Course Name"
 */
function getStudentFirstName() {
    try {
        const match = document.title.match(/(?:Assignment|Activity) Evaluation - ([^-]+) -/);
        if (!match) return '';
        return match[1].trim().split(' ')[0] || '';
    } catch (e) {
        console.warn('Error getting student first name:', e);
        return '';
    }
}

// ─── Course / assignment detection ───────────────────────────────────────────

/**
 * Parses the current page to return { assignmentName, courseName }.
 * Tries DOM elements first (#titleName / #subtitleName), then falls back to
 * parsing the document.title string.
 * Returns null if nothing useful can be found.
 */
function detectCourseAndAssignmentFromTitle() {
    // Attempt to read from named DOM elements (most reliable)
    const subtitleEl = document.getElementById('subtitleName')
        || findInAllShadowRoots('#subtitleName')[0]
        || null;
    const titleEl = document.getElementById('titleName')
        || findInAllShadowRoots('#titleName')[0]
        || null;

    const assignmentFromDom = titleEl    ? titleEl.textContent.trim()    : '';
    const courseFromDom     = subtitleEl ? subtitleEl.textContent.trim() : '';

    if (assignmentFromDom || courseFromDom) {
        return { assignmentName: assignmentFromDom, courseName: courseFromDom };
    }

    // Fall back to parsing document.title
    const title = document.title || '';
    if (!title) return null;

    const parts = title.split(' - ').map(p => p.trim()).filter(Boolean);
    const evalIdx = parts.findIndex(p => /Assignment Evaluation|Activity Evaluation/i.test(p));
    if (evalIdx === -1) return null;

    // Parts after the evaluation marker, minus the student name (first element after marker)
    const remainder = parts.slice(evalIdx + 2); // skip [evalIdx] and student name
    if (!remainder.length) return null;

    // Drop trailing "Brightspace / D2L" branding segment if present
    if (remainder.length > 1 && /brightspace|desire2learn|d2l|onlinelearning/i.test(remainder[remainder.length - 1])) {
        remainder.pop();
    }

    const assignmentName = (remainder[0] || '').trim();
    const courseName     = (remainder[1] || '').trim();

    if (!assignmentName && !courseName) return null;
    return { assignmentName, courseName };
}

/**
 * Runs detectCourseAndAssignmentFromTitle and upserts the result into config,
 * creating course/assignment records if they don't already exist.
 */
function autoDetectCourseAndAssignment() {
    const parsed = detectCourseAndAssignmentFromTitle();
    if (!parsed) return;

    const { assignmentName, courseName } = parsed;

    // ── Resolve / create course ──
    let course = courseName
        ? config.courses.find(c => c.name === courseName) || null
        : null;

    if (!course && courseName) {
        course = { id: uuid(), name: courseName, levels: DEFAULT_LEVELS.slice(), assignments: [] };
        config.courses.push(course);
    }

    if (!course && config.courses.length === 1) {
        course = config.courses[0]; // single-course shortcut
    }

    if (!course) return;

    config.selectedCourseId  = course.id;
    course.assignments = course.assignments || [];

    // ── Resolve / create assignment ──
    let assignment = assignmentName
        ? course.assignments.find(a => a.name === assignmentName) || null
        : null;

    if (!assignment && assignmentName) {
        const levels = course.levels || DEFAULT_LEVELS.slice();
        assignment = {
            id:            uuid(),
            name:          assignmentName,
            feedback:      [],
            nextSteps:     [],
            levelComments: Object.fromEntries(levels.map(l => [l, '']))
        };
        course.assignments.push(assignment);
    }

    if (assignment) {
        config.selectedAssignmentId = assignment.id;

        // Ensure levelComments keys exactly match current course levels
        const levels = course.levels || DEFAULT_LEVELS.slice();
        const lc = assignment.levelComments || {};
        Object.keys(lc).forEach(k => { if (!levels.includes(k)) delete lc[k]; });
        levels.forEach(k => { if (typeof lc[k] !== 'string') lc[k] = ''; });
        assignment.levelComments = lc;

        if (!Array.isArray(assignment.nextSteps)) assignment.nextSteps = [];
    }

    saveConfig();
}
