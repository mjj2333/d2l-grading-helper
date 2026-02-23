/**
 * config.js
 * Global state, localStorage persistence, data migration, and data-access helpers.
 * Depends on: utils.js (uuid)
 */

const STORAGE_KEY   = 'd2lGradingHelperConfig_v1';
const DEFAULT_LEVELS = ['EXTENDING', 'PROFICIENT', 'DEVELOPING', 'EMERGING'];

// Module-level state shared across all content files
let config;
let teacherSignature        = localStorage.getItem('teacherSignature') || '';
let assignmentHighlightActive = false;

// ─── Default structure ────────────────────────────────────────────────────────

function defaultConfig() {
    return {
        courses: [],
        selectedCourseId:    null,
        selectedAssignmentId: null,
        selectedLevel:       'PROFICIENT',
        includeLevelComment: true,
        includeNextSteps:    true,
        panelState: {
            top: null, left: null,
            width: 420, height: 480,
            minimized: false
        }
    };
}

// ─── Migration helpers ────────────────────────────────────────────────────────

/**
 * Very old format stored feedback per-level in a.levels[].
 * Converts to the flat a.levels structure so the next migration can handle it.
 */
function migrateAssignmentsToLevels(cfg) {
    cfg.courses.forEach(course => {
        (course.assignments || []).forEach(a => {
            if (!a.levels) {
                const baseFeedback = Array.isArray(a.feedback) ? a.feedback.slice() : [];
                a.levels = {};
                DEFAULT_LEVELS.forEach(l => { a.levels[l] = []; });
                a.levels.PROFICIENT = baseFeedback;
            } else {
                const courseLevels = Array.isArray(course.levels) && course.levels.length
                    ? course.levels
                    : DEFAULT_LEVELS;
                course.levels = courseLevels;
                courseLevels.forEach(l => {
                    if (!Array.isArray(a.levels[l])) a.levels[l] = [];
                });
            }
        });
    });
}

/**
 * Converts the old per-level arrays into the current flat feedback array + levelComments object.
 */
function migrateLevelsToFeedback(cfg) {
    cfg.courses.forEach(course => {
        (course.assignments || []).forEach(a => {
            if (!Array.isArray(a.feedback)) {
                const all = new Set();
                if (a.levels && typeof a.levels === 'object') {
                    Object.keys(a.levels).forEach(key => {
                        const arr = a.levels[key];
                        if (Array.isArray(arr)) {
                            arr.forEach(t => { const s = String(t || '').trim(); if (s) all.add(s); });
                        }
                    });
                }
                a.feedback = Array.from(all);
            }
            if (!a.levelComments || typeof a.levelComments !== 'object') a.levelComments = {};
            if (!Array.isArray(a.nextSteps)) a.nextSteps = [];
        });
    });
}

// ─── Load / save ──────────────────────────────────────────────────────────────

function loadConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultConfig();

        const parsed = JSON.parse(raw);
        if (!parsed.courses)    parsed.courses    = [];
        if (!parsed.panelState) parsed.panelState = defaultConfig().panelState;
        if (typeof parsed.includeLevelComment !== 'boolean') parsed.includeLevelComment = true;
        if (typeof parsed.includeNextSteps    !== 'boolean') parsed.includeNextSteps    = true;
        if (!parsed.selectedLevel) parsed.selectedLevel = 'PROFICIENT';

        migrateAssignmentsToLevels(parsed);
        migrateLevelsToFeedback(parsed);

        return parsed;
    } catch (e) {
        console.warn('Error loading grading helper config — resetting.', e);
        return defaultConfig();
    }
}

function saveConfig() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.warn('Error saving grading helper config:', e);
    }
}

// Initialise the global on load
config = loadConfig();

// ─── Data-access helpers ──────────────────────────────────────────────────────

function getCourseById(id) {
    return config.courses.find(c => c.id === id) || null;
}

function getAssignmentById(course, id) {
    if (!course) return null;
    return (course.assignments || []).find(a => a.id === id) || null;
}

function getCourseLevels(course) {
    if (!course) return DEFAULT_LEVELS;
    if (!Array.isArray(course.levels) || !course.levels.length) {
        course.levels = DEFAULT_LEVELS.slice();
    }
    return course.levels;
}

function getFeedbackList(assignment) {
    if (!assignment) return [];
    if (!Array.isArray(assignment.feedback)) assignment.feedback = [];
    return assignment.feedback;
}

function getNextStepsList(assignment) {
    if (!assignment) return [];
    if (!Array.isArray(assignment.nextSteps)) assignment.nextSteps = [];
    return assignment.nextSteps;
}

function getLevelCommentsObj(assignment) {
    if (!assignment) return {};
    if (!assignment.levelComments || typeof assignment.levelComments !== 'object') {
        assignment.levelComments = {};
    }
    return assignment.levelComments;
}

/**
 * Ensures selectedCourseId / selectedAssignmentId / selectedLevel all point to
 * valid objects that exist in the config.
 */
function ensureSelection() {
    if (!config.courses.length) return;

    if (!getCourseById(config.selectedCourseId)) {
        config.selectedCourseId = config.courses[0].id;
    }

    const course = getCourseById(config.selectedCourseId);
    if (!course.assignments) course.assignments = [];

    if (course.assignments.length && !getAssignmentById(course, config.selectedAssignmentId)) {
        config.selectedAssignmentId = course.assignments[0].id;
    }

    const levels = getCourseLevels(course);
    if (!levels.includes(config.selectedLevel)) {
        config.selectedLevel = levels.includes('PROFICIENT') ? 'PROFICIENT' : levels[0];
    }
}
