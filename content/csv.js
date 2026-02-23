/**
 * csv.js
 * Master CSV import and export.
 * Depends on: utils.js (uuid), config.js (config, DEFAULT_LEVELS)
 */

// ─── Escape / encode ──────────────────────────────────────────────────────────

function csvEscape(str) {
    return `"${String(str == null ? '' : str).replace(/"/g, '""')}"`;
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Builds the full master CSV string from config.
 * @param {object}   cfg            - the config object
 * @param {string[]|null} courseIdFilter - if set, only include these course IDs
 */
function buildMasterCsvFromConfig(cfg, courseIdFilter) {
    const rows = [
        '# D2L Grading Helper Master Comment Template',
        '# Section: FEEDBACK, NEXT_STEP, or LEVEL_COMMENT',
        '# For FEEDBACK and NEXT_STEP rows, leave Level blank.',
        '# For LEVEL_COMMENT rows, fill Level with the proficiency level name.',
        'Section,Course,Assignment,Level,Comment'
    ];

    const filterSet = courseIdFilter ? new Set(courseIdFilter) : null;

    (cfg.courses || []).forEach(course => {
        if (filterSet && !filterSet.has(course.id)) return;

        const courseName = course.name || '';
        const levels = Array.isArray(course.levels) && course.levels.length
            ? course.levels
            : DEFAULT_LEVELS;

        (course.assignments || []).forEach(a => {
            const assignmentName = a.name || '';
            let addedSomething = false;

            (Array.isArray(a.feedback) ? a.feedback : []).forEach(text => {
                rows.push([csvEscape('FEEDBACK'), csvEscape(courseName), csvEscape(assignmentName), csvEscape(''), csvEscape(text)].join(','));
                addedSomething = true;
            });

            (Array.isArray(a.nextSteps) ? a.nextSteps : []).forEach(text => {
                rows.push([csvEscape('NEXT_STEP'), csvEscape(courseName), csvEscape(assignmentName), csvEscape(''), csvEscape(text)].join(','));
                addedSomething = true;
            });

            const lc = (a.levelComments && typeof a.levelComments === 'object') ? a.levelComments : {};
            levels.forEach(level => {
                const cmt = (lc[level] || '').trim();
                if (cmt) {
                    rows.push([csvEscape('LEVEL_COMMENT'), csvEscape(courseName), csvEscape(assignmentName), csvEscape(level), csvEscape(cmt)].join(','));
                    addedSomething = true;
                }
            });

            // Always emit at least one row per assignment so the assignment is preserved
            if (!addedSomething) {
                rows.push([csvEscape('FEEDBACK'), csvEscape(courseName), csvEscape(assignmentName), csvEscape(''), csvEscape('')].join(','));
            }
        });
    });

    return rows.join('\r\n');
}

// ─── Parse ────────────────────────────────────────────────────────────────────

/**
 * Parses a single CSV line, correctly handling quoted fields and escaped quotes.
 */
function parseCsvLine(line) {
    const result = [];
    let i = 0;
    const len = line.length;

    while (i < len) {
        if (line[i] === '"') {
            let j = i + 1, field = '';
            while (j < len) {
                if (line[j] === '"') {
                    if (j + 1 < len && line[j + 1] === '"') { field += '"'; j += 2; }
                    else { j++; break; }
                } else {
                    field += line[j++];
                }
            }
            result.push(field);
            if (j < len && line[j] === ',') j++;
            i = j;
        } else {
            let j = i, field = '';
            while (j < len && line[j] !== ',') field += line[j++];
            result.push(field.trim());
            if (j < len && line[j] === ',') j++;
            i = j;
        }
    }

    return result;
}

/**
 * Parses the full CSV text into an intermediate Map of course entries.
 * Returns a Map keyed by lowercase course name.
 */
function parseMasterCsv(text) {
    const lines = String(text || '').split(/\r?\n/);
    const coursesByName = new Map();
    let headerSeen = false;

    function getCourseEntry(name) {
        const key = name.toLowerCase();
        if (!coursesByName.has(key)) {
            coursesByName.set(key, { name, levelsSet: new Set(), assignmentsByName: new Map() });
        }
        return coursesByName.get(key);
    }

    function getAssignmentEntry(courseEntry, name) {
        const key = name.toLowerCase();
        if (!courseEntry.assignmentsByName.has(key)) {
            courseEntry.assignmentsByName.set(key, { name, feedbacks: [], nextSteps: [], levelComments: new Map() });
        }
        return courseEntry.assignmentsByName.get(key);
    }

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line[0] === '#') continue;

        const cols = parseCsvLine(line);
        if (cols.length < 5) continue;

        if (!headerSeen && /^section$/i.test(cols[0])) { headerSeen = true; continue; }
        headerSeen = true;

        const section        = (cols[0] || '').trim().toUpperCase();
        const courseName     = (cols[1] || '').trim();
        const assignmentName = (cols[2] || '').trim();
        const levelName      = (cols[3] || '').trim();
        const comment        = (cols[4] || '').trim();

        if (!courseName || !assignmentName) continue;
        if (!['FEEDBACK', 'NEXT_STEP', 'LEVEL_COMMENT'].includes(section)) continue;

        const courseEntry     = getCourseEntry(courseName);
        const assignmentEntry = getAssignmentEntry(courseEntry, assignmentName);

        if      (section === 'FEEDBACK'      && comment)   assignmentEntry.feedbacks.push(comment);
        else if (section === 'NEXT_STEP'     && comment)   assignmentEntry.nextSteps.push(comment);
        else if (section === 'LEVEL_COMMENT' && levelName) {
            courseEntry.levelsSet.add(levelName);
            assignmentEntry.levelComments.set(levelName, comment);
        }
    }

    return coursesByName;
}

// ─── Apply to config ──────────────────────────────────────────────────────────

/**
 * Merges or replaces config data from a parsed CSV.
 * @param {string} text                  - raw CSV text
 * @param {object} options
 *   scope             'all' | 'current'
 *   mode              'merge' | 'replace'
 *   currentCourseName string | null
 * @returns {{ coursesTouched, assignmentsTouched, feedbackAdded, levelCommentsUpdated }}
 */
function applyMasterCsvToConfig(text, options) {
    const { scope = 'all', mode = 'replace', currentCourseName = null } = options || {};

    const parsed = parseMasterCsv(text);
    if (!parsed.size) {
        alert('No valid rows found in the CSV. No changes were applied.');
        return { coursesTouched: 0, assignmentsTouched: 0, feedbackAdded: 0, levelCommentsUpdated: 0 };
    }

    function getOrCreateCourse(name) {
        const existing = config.courses.find(c => (c.name || '').toLowerCase() === name.toLowerCase());
        if (existing) return existing;
        const course = { id: uuid(), name, levels: DEFAULT_LEVELS.slice(), assignments: [] };
        config.courses.push(course);
        return course;
    }

    let coursesTouched = 0, assignmentsTouched = 0, feedbackAdded = 0, levelCommentsUpdated = 0;

    for (const [, courseEntry] of parsed.entries()) {
        if (scope === 'current') {
            if (!currentCourseName || courseEntry.name.toLowerCase() !== currentCourseName.toLowerCase()) continue;
        }

        const course = getOrCreateCourse(courseEntry.name);
        const csvLevels = courseEntry.levelsSet.size
            ? Array.from(courseEntry.levelsSet)
            : DEFAULT_LEVELS.slice();

        if (mode === 'replace') {
            // ── Replace: rebuild all assignments from CSV ──
            course.levels      = csvLevels;
            course.assignments = [];
            for (const ae of courseEntry.assignmentsByName.values()) {
                const lcObj = Object.fromEntries(csvLevels.map(level => {
                    const val = ae.levelComments.get(level) || '';
                    if (val.trim()) levelCommentsUpdated++;
                    return [level, val];
                }));
                course.assignments.push({
                    id:            uuid(),
                    name:          ae.name,
                    feedback:      ae.feedbacks.slice(),
                    nextSteps:     ae.nextSteps.slice(),
                    levelComments: lcObj
                });
                assignmentsTouched++;
                feedbackAdded += ae.feedbacks.length + ae.nextSteps.length;
            }
            coursesTouched++;

        } else {
            // ── Merge: add new, update existing ──
            const existingLevels = Array.isArray(course.levels) && course.levels.length
                ? course.levels
                : DEFAULT_LEVELS.slice();
            csvLevels.forEach(l => { if (!existingLevels.includes(l)) existingLevels.push(l); });
            course.levels      = existingLevels;
            course.assignments = course.assignments || [];

            const byName = new Map(course.assignments.map(a => [(a.name || '').toLowerCase(), a]));

            for (const ae of courseEntry.assignmentsByName.values()) {
                const key = ae.name.toLowerCase();
                let assignment = byName.get(key);

                if (!assignment) {
                    // New assignment — add it
                    const lcObj = Object.fromEntries(existingLevels.map(level => {
                        const val = ae.levelComments.get(level) || '';
                        if (val.trim()) levelCommentsUpdated++;
                        return [level, val];
                    }));
                    assignment = { id: uuid(), name: ae.name, feedback: ae.feedbacks.slice(), nextSteps: ae.nextSteps.slice(), levelComments: lcObj };
                    course.assignments.push(assignment);
                    byName.set(key, assignment);
                    coursesTouched++;
                    assignmentsTouched++;
                    feedbackAdded += ae.feedbacks.length + ae.nextSteps.length;

                } else {
                    // Existing assignment — merge without duplicates
                    assignmentsTouched++;

                    assignment.feedback = Array.isArray(assignment.feedback) ? assignment.feedback : [];
                    const existFeedback = new Set(assignment.feedback.map(t => t.trim()));
                    ae.feedbacks.forEach(t => {
                        if (t.trim() && !existFeedback.has(t.trim())) {
                            assignment.feedback.push(t); existFeedback.add(t.trim()); feedbackAdded++;
                        }
                    });

                    assignment.nextSteps = Array.isArray(assignment.nextSteps) ? assignment.nextSteps : [];
                    const existNext = new Set(assignment.nextSteps.map(t => t.trim()));
                    ae.nextSteps.forEach(t => {
                        if (t.trim() && !existNext.has(t.trim())) {
                            assignment.nextSteps.push(t); existNext.add(t.trim()); feedbackAdded++;
                        }
                    });

                    assignment.levelComments = (assignment.levelComments && typeof assignment.levelComments === 'object')
                        ? assignment.levelComments : {};
                    existingLevels.forEach(level => {
                        const oldVal = assignment.levelComments[level] || '';
                        if (ae.levelComments.has(level)) {
                            const newVal = ae.levelComments.get(level) || '';
                            if (newVal !== oldVal) { assignment.levelComments[level] = newVal; levelCommentsUpdated++; }
                        } else if (!(level in assignment.levelComments)) {
                            assignment.levelComments[level] = '';
                        }
                    });
                    coursesTouched++;
                }
            }
        }
    }

    // Guarantee structural integrity after any import
    config.courses.forEach(c => {
        c.assignments = c.assignments || [];
        const levels = Array.isArray(c.levels) && c.levels.length ? c.levels : DEFAULT_LEVELS;
        c.assignments.forEach(a => {
            if (!Array.isArray(a.feedback))   a.feedback   = [];
            if (!Array.isArray(a.nextSteps))  a.nextSteps  = [];
            if (!a.levelComments || typeof a.levelComments !== 'object') a.levelComments = {};
            levels.forEach(l => { if (typeof a.levelComments[l] !== 'string') a.levelComments[l] = ''; });
        });
    });

    return { coursesTouched, assignmentsTouched, feedbackAdded, levelCommentsUpdated };
}
