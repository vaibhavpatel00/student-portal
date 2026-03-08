const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://vignanits.ac.in/Attendance';
const PORTAL_USER = '206';
const PORTAL_PASS = 'Vgnt';

/**
 * Login to the Vignan attendance portal and get session cookies
 */
async function loginToPortal() {
    try {
        const response = await axios.post(`${BASE_URL}/Validate.php`,
            `uname=${PORTAL_USER}&pass=${PORTAL_PASS}`, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            maxRedirects: 0,
            validateStatus: () => true,
            timeout: 15000,
        });

        const setCookies = response.headers['set-cookie'];
        if (setCookies) {
            return setCookies.map(c => c.split(';')[0]).join('; ');
        }

        return '';
    } catch (error) {
        console.error('Portal login error:', error.message);
        throw new Error('Failed to login to attendance portal');
    }
}

/**
 * Format date as YYYY-MM-DD for the portal (HTML date input format)
 */
function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
}

/**
 * Fetch student-wise overall attendance report
 * Form fields: rno (roll number), fdt (from date), tdt (to date)
 * Posts to: Srprint.php
 */
async function fetchStudentAttendance(rollNumber, fromDate, toDate) {
    try {
        const cookies = await loginToPortal();

        const formattedFrom = formatDate(fromDate);
        const formattedTo = formatDate(toDate);

        const response = await axios({
            method: 'post',
            url: `${BASE_URL}/Srprint.php`,
            data: `rno=${encodeURIComponent(rollNumber)}&fdt=${formattedFrom}&tdt=${formattedTo}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies,
                'Referer': `${BASE_URL}/Sreports.php`,
            },
            validateStatus: () => true,
            timeout: 15000,
        });

        const $ = cheerio.load(response.data);

        const reportData = {
            studentInfo: {},
            subjects: [],
            overallPercentage: 0,
        };

        // The page has two tables:
        // Table 1: Student info - Roll No., Name, Branch, Year, Section, From date, To Date
        // Table 2: Subject attendance - Subject, No. of Hours Conducted, Attended Hours, Percentage(%)

        const tables = $('table');

        // Parse student info from first table
        if (tables.length >= 1) {
            const rows = $(tables[0]).find('tr');
            if (rows.length >= 2) {
                const cells = $(rows[1]).find('td, th');
                if (cells.length >= 7) {
                    reportData.studentInfo = {
                        rollNumber: $(cells[0]).text().trim(),
                        name: $(cells[1]).text().trim(),
                        branch: $(cells[2]).text().trim(),
                        year: $(cells[3]).text().trim(),
                        section: $(cells[4]).text().trim(),
                        fromDate: $(cells[5]).text().trim(),
                        toDate: $(cells[6]).text().trim(),
                    };
                }
            }
        }

        // Parse subject attendance from second table
        let totalPresent = 0;
        let totalClasses = 0;

        if (tables.length >= 2) {
            const rows = $(tables[1]).find('tr');
            rows.each((j, row) => {
                if (j === 0) return; // Skip header row

                const cells = $(row).find('td, th');
                if (cells.length >= 4) {
                    const subName = $(cells[0]).text().trim();
                    const conducted = parseInt($(cells[1]).text().trim());
                    const attended = parseInt($(cells[2]).text().trim());
                    const percentage = parseFloat($(cells[3]).text().trim());

                    if (subName && !isNaN(conducted) && !isNaN(attended)) {
                        reportData.subjects.push({
                            name: subName,
                            conducted: conducted,
                            attended: attended,
                            percentage: isNaN(percentage)
                                ? (conducted > 0 ? parseFloat(((attended / conducted) * 100).toFixed(1)) : 0)
                                : percentage,
                        });
                        totalPresent += attended;
                        totalClasses += conducted;
                    }
                }
            });
        }

        if (totalClasses > 0) {
            reportData.overallPercentage = parseFloat(((totalPresent / totalClasses) * 100).toFixed(1));
        }

        return reportData;
    } catch (error) {
        console.error('Fetch attendance error:', error.message);
        throw new Error('Failed to fetch attendance data');
    }
}

/**
 * Fetch hour-wise attendance for a specific date and hour
 * Form fields: br (branch), dt (date), hr (hour 1-7)
 * Posts to: Hrprint.php
 * 
 * The report shows ABSENTEES list per section. If the student's roll number 
 * is NOT in the absentees list for their section, they are PRESENT.
 */
async function fetchHourAttendance(department, date, hour, rollNumber, year, section) {
    try {
        const cookies = await loginToPortal();

        const formattedDate = formatDate(date);

        const response = await axios({
            method: 'post',
            url: `${BASE_URL}/Hrprint.php`,
            data: `br=${encodeURIComponent(department)}&dt=${formattedDate}&hr=${hour}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies,
                'Referer': `${BASE_URL}/Hreports.php`,
            },
            validateStatus: () => true,
            timeout: 15000,
        });

        const $ = cheerio.load(response.data);

        // Parse the table to find the student's section row
        // Table columns: Branch, Year, Section, Total Strength, Hour, Subject, Total Present, Total Absent, Absentees list
        let subjectName = '';
        let isPresent = false;
        let totalPresent = 0;
        let totalStrength = 0;
        let found = false;

        $('table tr').each((i, row) => {
            if (i === 0) return; // Skip header

            const cells = $(row).find('td');
            if (cells.length >= 9) {
                const rowBranch = $(cells[0]).text().trim();
                const rowYear = $(cells[1]).text().trim();
                const rowSection = $(cells[2]).text().trim();
                const rowStrength = $(cells[3]).text().trim();
                const rowHour = $(cells[4]).text().trim();
                const rowSubject = $(cells[5]).text().trim();
                const rowPresent = $(cells[6]).text().trim();
                const rowAbsent = $(cells[7]).text().trim();
                const absenteesList = $(cells[8]).text().trim();

                // Match the student's year and section
                if (rowYear === String(year) && rowSection.toUpperCase() === section.toUpperCase()) {
                    found = true;
                    subjectName = rowSubject;
                    totalStrength = parseInt(rowStrength) || 0;
                    totalPresent = parseInt(rowPresent) || 0;

                    // If subject is '--', no class was held
                    if (rowSubject === '--') {
                        subjectName = 'No Class';
                        isPresent = false;
                    } else {
                        // Check if student's roll number is in the absentees list
                        const absentRolls = absenteesList.split(',').map(r => r.trim().toUpperCase());
                        isPresent = !absentRolls.includes(rollNumber.toUpperCase());
                    }
                }
            }
        });

        return {
            hour,
            subjectName: subjectName || 'No Data',
            isPresent: found ? isPresent : null,
            totalPresent,
            totalStrength,
            found,
            noClass: subjectName === 'No Class',
        };
    } catch (error) {
        console.error(`Fetch hour ${hour} error:`, error.message);
        return {
            hour,
            subjectName: 'Error',
            isPresent: null,
            totalPresent: 0,
            totalStrength: 0,
            found: false,
            error: error.message,
        };
    }
}

/**
 * Get today's full hour-wise attendance for a student
 */
async function getTodayAttendance(rollNumber, department, year, section) {
    const today = new Date();
    const results = [];

    // Period timings based on actual college schedule
    // Periods 1-5: 50 min each, break at 10:25-10:40, lunch at 1:10-2:00
    // Periods 6-7: 45 min each after lunch
    const periodTimings = [
        { hour: 1, start: '8:45 AM', end: '9:35 AM' },
        { hour: 2, start: '9:35 AM', end: '10:25 AM' },
        // Short break: 10:25 AM - 10:40 AM
        { hour: 3, start: '10:40 AM', end: '11:30 AM' },
        { hour: 4, start: '11:30 AM', end: '12:20 PM' },
        { hour: 5, start: '12:20 PM', end: '1:10 PM' },
        // Lunch break: 1:10 PM - 2:00 PM
        { hour: 6, start: '2:00 PM', end: '2:45 PM' },
        { hour: 7, start: '2:45 PM', end: '3:30 PM' },
    ];

    // Fetch all hours (sequential to avoid overloading the portal)
    for (const period of periodTimings) {
        const hourData = await fetchHourAttendance(department, today, period.hour, rollNumber, year, section);

        results.push({
            hour: period.hour,
            timing: `${period.start} - ${period.end}`,
            subject: hourData.subjectName,
            present: hourData.isPresent,
            totalPresent: hourData.totalPresent,
            totalStrength: hourData.totalStrength,
            noClass: hourData.noClass,
            found: hourData.found,
        });
    }

    return results;
}

module.exports = {
    fetchStudentAttendance,
    fetchHourAttendance,
    getTodayAttendance,
    loginToPortal,
};
