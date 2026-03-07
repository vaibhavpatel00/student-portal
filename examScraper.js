const axios = require('axios');

const EXAM_API_BASE = 'https://vignanits.in:8443/examtool-backend-adhikrit/api/v1';

/**
 * Fetch list of all available exam result titles
 * Returns array of strings like "2026-01-08~B.TECH II YEAR I SEMESTER REGULAR...~VR23"
 */
async function getExamTitles() {
    const res = await axios.get(`${EXAM_API_BASE}/tsheet/result/titles`, {
        timeout: 15000,
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });
    return res.data; // array of strings
}

/**
 * Fetch subject-wise results for a specific exam
 */
async function getExamResults(rollNo, examTitle) {
    const res = await axios.get(`${EXAM_API_BASE}/getAllTsheetDataWithRollNo`, {
        params: {
            rollNo,
            userRole: 'ROLE_STUDENT',
            degreeType: 'Major',
            examTitle,
        },
        timeout: 15000,
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });
    return res.data; // object with key = semester name, value = array of subjects
}

/**
 * Fetch overall CGPA and percentage
 */
async function getCGPA(rollNo) {
    const res = await axios.get(`${EXAM_API_BASE}/student/results/percentage`, {
        params: { rollNo, degreeType: 'Major' },
        timeout: 15000,
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });
    return res.data; // { percentage: "83.1", cgpa: "8.81" }
}

/**
 * Parse exam title string: "2026-01-08~B.TECH II YEAR I SEMESTER REGULAR...~VR23"
 */
function parseExamTitle(titleStr) {
    const parts = titleStr.split('~');
    return {
        date: parts[0],
        title: parts[1],
        regulation: parts[2],
    };
}

/**
 * Filter only REGULAR B.TECH exam titles for a specific roll number pattern
 * We look for regular exams (not supply/supplementary)
 */
function filterRegularExams(titles) {
    return titles
        .map(parseExamTitle)
        .filter(t =>
            t.title.includes('B.TECH') &&
            t.title.includes('REGULAR') &&
            !t.title.includes('SUPPLY') &&
            !t.title.includes('SUPPLEMENTARY')
        )
        .sort((a, b) => {
            // Sort by semester order: extract year and sem info
            const getSemOrder = (title) => {
                if (title.includes('I YEAR I SEM')) return 1;
                if (title.includes('I YEAR II SEM')) return 2;
                if (title.includes('II YEAR I SEM')) return 3;
                if (title.includes('II YEAR II SEM')) return 4;
                if (title.includes('III YEAR I SEM')) return 5;
                if (title.includes('III YEAR II SEM')) return 6;
                if (title.includes('IV YEAR I SEM')) return 7;
                if (title.includes('IV YEAR II SEM')) return 8;
                return 9;
            };
            return getSemOrder(a.title) - getSemOrder(b.title);
        });
}

/**
 * Get a friendly semester label from exam title
 */
function getSemesterLabel(title) {
    if (title.includes('I YEAR I SEM')) return '1st Year - Sem 1';
    if (title.includes('I YEAR II SEM')) return '1st Year - Sem 2';
    if (title.includes('II YEAR I SEM')) return '2nd Year - Sem 1';
    if (title.includes('II YEAR II SEM')) return '2nd Year - Sem 2';
    if (title.includes('III YEAR I SEM')) return '3rd Year - Sem 1';
    if (title.includes('III YEAR II SEM')) return '3rd Year - Sem 2';
    if (title.includes('IV YEAR I SEM')) return '4th Year - Sem 1';
    if (title.includes('IV YEAR II SEM')) return '4th Year - Sem 2';
    return title;
}

/**
 * Fetch complete exam results for a student across all available semesters
 */
async function getAllResults(rollNo) {
    try {
        // Get all exam titles and CGPA in parallel
        const [allTitles, cgpaData] = await Promise.all([
            getExamTitles(),
            getCGPA(rollNo),
        ]);

        // Filter to only regular B.Tech exams
        const regularExams = filterRegularExams(allTitles);

        // Fetch results for each semester
        const semesters = [];
        let totalBacklogs = 0;

        for (const exam of regularExams) {
            try {
                const resultData = await getExamResults(rollNo, exam.title);

                // resultData is an object like { "III SEMESTER,examTitle": [ subjects ] }
                for (const [key, subjects] of Object.entries(resultData)) {
                    if (!subjects || subjects.length === 0) continue;

                    let passed = 0;
                    let failed = 0;
                    let totalCredits = 0;
                    let earnedCredits = 0;
                    let sgpa = 0;

                    const subjectList = subjects.map(sub => {
                        const isPassed = sub.status === 'Pass';
                        if (isPassed) {
                            passed++;
                            earnedCredits += parseFloat(sub.credits) || 0;
                        } else {
                            failed++;
                            totalBacklogs++;
                        }
                        totalCredits += parseFloat(sub.credits) || 0;
                        sgpa = parseFloat(sub.sgpa) || sgpa;

                        return {
                            code: sub.courseCode,
                            name: sub.course,
                            internal: parseInt(sub.internalMarks) || 0,
                            external: parseInt(sub.externalMarks) || 0,
                            total: parseInt(sub.total) || 0,
                            credits: parseFloat(sub.credits) || 0,
                            grade: sub.grade,
                            gradePoints: parseInt(sub.gradePoints) || 0,
                            status: sub.status,
                        };
                    });

                    semesters.push({
                        label: getSemesterLabel(exam.title),
                        examTitle: exam.title,
                        date: exam.date,
                        subjects: subjectList,
                        passed,
                        failed,
                        totalCredits,
                        earnedCredits,
                        sgpa,
                    });
                }
            } catch (err) {
                console.error(`Error fetching results for ${exam.title}:`, err.message);
            }
        }

        return {
            semesters,
            totalBacklogs,
            cgpa: parseFloat(cgpaData.cgpa) || 0,
            percentage: parseFloat(cgpaData.percentage) || 0,
        };
    } catch (error) {
        console.error('getAllResults error:', error.message);
        throw new Error('Failed to fetch exam results');
    }
}

module.exports = {
    getAllResults,
    getCGPA,
    getExamResults,
    getExamTitles,
};
