document.addEventListener('DOMContentLoaded', () => {
  let studentData = null;

  // Initialize
  init();

  async function init() {
    // Check auth
    try {
      const res = await fetch('/api/me');
      const data = await res.json();

      if (!data.student) {
        window.location.href = '/';
        return;
      }

      studentData = data.student;
      setupUI();
      loadTodayAttendance();
      loadOverviewAttendance();
    } catch (err) {
      window.location.href = '/';
    }
  }

  function setupUI() {
    // Greeting based on time
    const hour = new Date().getHours();
    let greetText = 'Good Evening';
    if (hour < 12) greetText = 'Good Morning';
    else if (hour < 17) greetText = 'Good Afternoon';

    document.getElementById('greeting').textContent = greetText;
    document.getElementById('studentName').textContent = studentData.name || 'Student';

    // Avatar
    const initials = (studentData.name || 'S').charAt(0).toUpperCase();
    document.getElementById('avatar').textContent = initials;

    // Student info
    document.getElementById('rollDisplay').textContent = studentData.roll_number;
    document.getElementById('deptDisplay').textContent =
      `${studentData.department} • Year ${studentData.year} • Section ${studentData.section}`;

    // Today's date
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    document.getElementById('todayDay').textContent = days[today.getDay()];
    document.getElementById('todayDate').textContent =
      `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

    // Set default date range (semester start to today)
    const fromDefault = '2025-12-22';
    const toDefault = today.toISOString().split('T')[0];
    document.getElementById('fromDate').value = fromDefault;
    document.getElementById('toDate').value = toDefault;

    // Event listeners
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('refreshToday').addEventListener('click', loadTodayAttendance);
    document.getElementById('refreshOverview').addEventListener('click', loadOverviewAttendance);
    document.getElementById('fetchRange').addEventListener('click', loadOverviewAttendance);
  }

  // ===== TODAY'S ATTENDANCE =====
  async function loadTodayAttendance() {
    const grid = document.getElementById('periodsGrid');
    const refreshBtn = document.getElementById('refreshToday');

    grid.innerHTML = `
      <div class="card-loading">
        <div class="loader"></div>
        <p>Fetching today's attendance...</p>
      </div>
    `;
    refreshBtn.classList.add('spinning');

    try {
      const res = await fetch('/api/attendance/today');
      const data = await res.json();

      refreshBtn.classList.remove('spinning');

      if (data.success && data.data) {
        renderPeriods(data.data);
      } else {
        grid.innerHTML = `
          <div class="error-state">
            <div class="error-icon">📭</div>
            <p>${data.error || 'Could not load today\'s attendance'}</p>
            <button class="btn-outline" onclick="location.reload()">Try Again</button>
          </div>
        `;
      }
    } catch (err) {
      refreshBtn.classList.remove('spinning');
      grid.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <p>Connection error. Please try again.</p>
          <button class="btn-outline" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  function renderPeriods(periods) {
    const grid = document.getElementById('periodsGrid');
    let presentCount = 0;
    let html = '';

    periods.forEach((period, index) => {
      let statusClass = 'pending';
      let statusText = 'Upcoming';
      let statusEmoji = '⏳';

      if (period.noClass) {
        statusClass = 'pending';
        statusText = 'No Class';
        statusEmoji = '📭';
      } else if (period.present === true) {
        statusClass = 'present';
        statusText = 'Present';
        statusEmoji = '✅';
        presentCount++;
      } else if (period.present === false) {
        statusClass = 'absent';
        statusText = 'Absent';
        statusEmoji = '❌';
      } else {
        // null = no data yet
        statusClass = 'pending';
        statusText = 'No Data';
        statusEmoji = '⏳';
      }

      html += `
        <div class="period-card ${statusClass}">
          <div class="period-number">${period.hour}</div>
          <div class="period-info">
            <div class="period-subject">${period.subject || 'Period ' + period.hour}</div>
            <div class="period-time">${period.timing}</div>
          </div>
          <div class="period-status">${statusEmoji} ${statusText}</div>
        </div>
      `;
    });

    grid.innerHTML = html;
    document.getElementById('presentCount').textContent = presentCount;
  }

  // ===== OVERALL ATTENDANCE =====
  async function loadOverviewAttendance() {
    const content = document.getElementById('overviewContent');
    const refreshBtn = document.getElementById('refreshOverview');

    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;

    content.innerHTML = `
      <div class="card-loading">
        <div class="loader"></div>
        <p>Fetching attendance data...</p>
      </div>
    `;
    refreshBtn.classList.add('spinning');

    try {
      const url = fromDate && toDate
        ? `/api/attendance/range?from=${fromDate}&to=${toDate}`
        : '/api/attendance/overview';

      const res = await fetch(url);
      const data = await res.json();

      refreshBtn.classList.remove('spinning');

      if (data.success && data.data) {
        renderOverview(data.data);
      } else {
        content.innerHTML = `
          <div class="error-state">
            <div class="error-icon">📊</div>
            <p>${data.error || 'Could not load attendance data'}</p>
            <button class="btn-outline" onclick="location.reload()">Try Again</button>
          </div>
        `;
      }
    } catch (err) {
      refreshBtn.classList.remove('spinning');
      content.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <p>Connection error. Please try again.</p>
          <button class="btn-outline" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  function renderOverview(data) {
    const content = document.getElementById('overviewContent');
    const percentage = data.overallPercentage || 0;

    // Calculate total hours
    let totalConducted = 0;
    let totalAttended = 0;
    if (data.subjects && data.subjects.length > 0) {
      data.subjects.forEach(s => {
        totalConducted += s.conducted;
        totalAttended += s.attended;
      });
    }

    // Progress ring circumference = 2 * PI * radius (60)
    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (percentage / 100) * circumference;

    // Determine color based on percentage
    let percentColor = '#00d4aa'; // green
    if (percentage < 65) percentColor = '#ff6b6b'; // red
    else if (percentage < 75) percentColor = '#ffa726'; // orange

    let html = `
      <div class="progress-ring-container">
        <div class="progress-ring-wrapper">
          <svg class="progress-ring" viewBox="0 0 130 130">
            <circle class="progress-ring-bg" cx="65" cy="65" r="60" />
            <circle class="progress-ring-fill" cx="65" cy="65" r="60" 
              style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${circumference};"
              data-target="${offset}" />
          </svg>
          <div class="progress-text">
            <div class="progress-value" style="color: ${percentColor}">${percentage}%</div>
            <div class="progress-label">Overall</div>
          </div>
        </div>
      </div>

      <div class="attendance-stats">
        <div class="stat-item">
          <div class="stat-value">${totalConducted}</div>
          <div class="stat-label">Total Classes</div>
        </div>
        <div class="stat-item">
          <div class="stat-value ${totalConducted - totalAttended > 20 ? 'danger' : ''}">${totalAttended}</div>
          <div class="stat-label">Classes Attended</div>
        </div>
      </div>
    `;

    // Subject-wise breakdown
    if (data.subjects && data.subjects.length > 0) {
      html += `<div class="subjects-list">`;
      data.subjects.forEach(subject => {
        let barColor = '#00d4aa';
        if (subject.percentage < 65) barColor = '#ff6b6b';
        else if (subject.percentage < 75) barColor = '#ffa726';

        html += `
          <div class="subject-item">
            <div class="subject-name">${subject.name}</div>
            <div class="subject-progress">
              <div class="subject-bar">
                <div class="subject-bar-fill" style="width: 0%; background: ${barColor};" data-width="${subject.percentage}%"></div>
              </div>
              <div class="subject-percentage" style="color: ${barColor}">${subject.percentage}%</div>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    content.innerHTML = html;

    // Animate progress ring
    setTimeout(() => {
      const ring = content.querySelector('.progress-ring-fill');
      if (ring) {
        ring.style.strokeDashoffset = ring.dataset.target;
      }

      // Animate subject bars
      content.querySelectorAll('.subject-bar-fill').forEach(bar => {
        setTimeout(() => {
          bar.style.width = bar.dataset.width;
        }, 200);
      });
    }, 100);
  }

  // ===== LOGOUT =====
  async function logout() {
    try {
      await fetch('/api/logout');
    } catch (e) { }
    window.location.href = '/';
  }
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('ServiceWorker registration failed: ', err);
    });
  });
}
