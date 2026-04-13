document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('authToken');
  let studentData = null;
  let countdownInterval = null;

  if (!token) {
    window.location.href = '/';
    return;
  }

  // Helper: fetch with auth
  async function authFetch(url, options = {}) {
    const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/';
      return null;
    }
    return res;
  }

  // Initialize
  init();

  async function init() {
    try {
      const res = await authFetch('/api/me');
      if (!res) return;
      const data = await res.json();

      if (!data.student) {
        localStorage.removeItem('authToken');
        window.location.href = '/';
        return;
      }

      studentData = data.student;
      setupUI();
      loadTodayAttendance();
      loadOverviewAttendance();
    } catch (err) {
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
  }

  // Period schedule with display times (+7 min after period starts)
  const PERIOD_SCHEDULE = [
    { hour: 1, start: '8:45 AM', end: '9:35 AM', displayFrom: '09:02', label: '8:45 AM - 9:35 AM' },
    { hour: 2, start: '9:35 AM', end: '10:25 AM', displayFrom: '09:42', label: '9:35 AM - 10:25 AM' },
    // Short break 10:25 - 10:40
    { hour: 3, start: '10:40 AM', end: '11:30 AM', displayFrom: '10:47', label: '10:40 AM - 11:30 AM' },
    { hour: 4, start: '11:30 AM', end: '12:20 PM', displayFrom: '11:37', label: '11:30 AM - 12:20 PM' },
    { hour: 5, start: '12:20 PM', end: '1:10 PM', displayFrom: '12:27', label: '12:20 PM - 1:10 PM' },
    // Lunch break 1:10 - 2:00
    { hour: 6, start: '2:00 PM', end: '2:45 PM', displayFrom: '14:07', label: '2:00 PM - 2:45 PM' },
    { hour: 7, start: '2:45 PM', end: '3:30 PM', displayFrom: '14:57', label: '2:45 PM - 3:30 PM' },
  ];

  function getCurrentIST() {
    // Get current time in IST
    const now = new Date();
    const istOffset = 5.5 * 60; // IST is UTC+5:30
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + istOffset * 60000);
  }

  function getTimeInMinutes(timeStr) {
    // timeStr format: "HH:MM" in 24hr
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  function getNextPeriodCountdown() {
    const now = getCurrentIST();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const period of PERIOD_SCHEDULE) {
      const displayMinutes = getTimeInMinutes(period.displayFrom);
      if (currentMinutes < displayMinutes) {
        const diffMs = (displayMinutes - currentMinutes) * 60000 - now.getSeconds() * 1000;
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        return {
          period: period.hour,
          mins,
          secs,
          label: `Period ${period.hour} attendance in ${mins}m ${secs}s`
        };
      }
    }
    return null; // All periods done for today
  }

  function startCountdownTimer() {
    if (countdownInterval) clearInterval(countdownInterval);

    const countdownEl = document.getElementById('countdownTimer');
    if (!countdownEl) return;

    function updateCountdown() {
      const next = getNextPeriodCountdown();
      if (next) {
        countdownEl.innerHTML = `<span class="countdown-icon">⏱️</span> Period ${next.period} attendance in <strong>${next.mins}m ${next.secs}s</strong>`;
        countdownEl.style.display = 'flex';
      } else {
        const now = getCurrentIST();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        if (currentMinutes < getTimeInMinutes('09:02')) {
          countdownEl.innerHTML = `<span class="countdown-icon">⏱️</span> Period 1 attendance in <strong>${getTimeInMinutes('09:02') - currentMinutes}m</strong>`;
          countdownEl.style.display = 'flex';
        } else {
          countdownEl.innerHTML = `<span class="countdown-icon">✅</span> All periods completed for today`;
          countdownEl.style.display = 'flex';
        }
      }
    }

    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  function setupUI() {
    const hour = new Date().getHours();
    let greetText = 'Good Evening';
    if (hour < 12) greetText = 'Good Morning';
    else if (hour < 17) greetText = 'Good Afternoon';

    document.getElementById('greeting').textContent = greetText;
    document.getElementById('studentName').textContent = studentData.name || 'Student';

    const initials = (studentData.name || 'S').charAt(0).toUpperCase();
    document.getElementById('avatar').textContent = initials;

    document.getElementById('rollDisplay').textContent = studentData.roll_number;
    document.getElementById('deptDisplay').textContent =
      `${studentData.department} • Year ${studentData.year} • Section ${studentData.section}`;

    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    document.getElementById('todayDay').textContent = days[today.getDay()];
    document.getElementById('todayDate').textContent =
      `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

    const fromDefault = '2025-12-22';
    const toDefault = today.toISOString().split('T')[0];
    document.getElementById('fromDate').value = fromDefault;
    document.getElementById('toDate').value = toDefault;

    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('refreshToday').addEventListener('click', loadTodayAttendance);
    document.getElementById('refreshOverview').addEventListener('click', loadOverviewAttendance);
    document.getElementById('fetchRange').addEventListener('click', loadOverviewAttendance);
    
    const showAdBtn = document.getElementById('showAdBtn');
    if (showAdBtn) {
      showAdBtn.addEventListener('click', showTestAd);
    }

    // Start countdown timer
    startCountdownTimer();

    // Set app version
    const versionEl = document.getElementById('appVersionDisplay');
    if (versionEl) {
      if (window.Capacitor && window.Capacitor.isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.getInfo().then(info => {
          versionEl.textContent = `${info.version} (Build ${info.build})`;
        }).catch(() => {
          versionEl.textContent = 'Native (Unknown)';
        });
      } else if (window.Capacitor && window.Capacitor.isNative) {
        versionEl.textContent = 'Native (Missing App Plugin)';
      } else if (window.Capacitor) {
        versionEl.textContent = 'Web (Capacitor mapped, but isNative is false)';
      } else {
        const isWebView = navigator.userAgent.includes('wv') || (navigator.userAgent.includes('Android') && navigator.userAgent.includes('Version/'));
        versionEl.textContent = isWebView ? 'WebView (Bridge Missing)' : 'Web Browser';
      }
    }

    // Load Bottom Banner Ad natively
    if (window.Capacitor && window.Capacitor.isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.UnityAds) {
      setTimeout(() => {
        window.Capacitor.Plugins.UnityAds.showBanner({ placementId: 'Banner_Android' })
          .catch(e => console.error("Banner load error:", e));
      }, 1500); // slight delay to ensure UI is ready
    }

    // Intercept Interstitial Ad Links
    setupNavigationAds();
  }

  function setupNavigationAds() {
    const navLinks = document.querySelectorAll('a[href="/results"], a[href="/announcements"]');
    navLinks.forEach(link => {
      link.addEventListener('click', async (e) => {
        if (!window.Capacitor || !window.Capacitor.isNative || !window.Capacitor.Plugins || !window.Capacitor.Plugins.UnityAds) {
          return; // Allow normal navigation if not native
        }

        e.preventDefault();
        const targetUrl = link.getAttribute('href');
        
        const overlay = document.createElement('div');
        overlay.id = 'adLoadingOverlay';
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.7); z-index:999999; display:flex; align-items:center; justify-content:center; color:white; font-family:sans-serif; font-weight:bold;';
        overlay.innerHTML = '<div class="loader"></div><div style="margin-left:16px;">Loading Ad...</div>';
        document.body.appendChild(overlay);

        try {
          const { UnityAds } = window.Capacitor.Plugins;
          UnityAds.hideBanner().catch(e => {});

          const loadPromise = UnityAds.loadAd({ placementId: 'Rewarded_Android' });
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Ad Load Timeout')), 4500));
          
          await Promise.race([loadPromise, timeoutPromise]);
          
          const result = await UnityAds.showAd({ placementId: 'Rewarded_Android' });
          
          if (result && result.state === 'SKIPPED') {
            alert('You must watch the full ad to access this page.');
            overlay.remove();
            return; // Abort navigation
          }
          
          // Ad completed successfully or we are in a fallback state
          window.location.href = targetUrl;
        } catch (err) {
          console.error("Navigation Ad Error or Timeout: ", err);
          // If Unity fails entirely (timeout, no fill), let them through so app doesn't break
          window.location.href = targetUrl;
        }
      });
    });
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
      const res = await authFetch('/api/attendance/today');
      if (!res) return;
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
    const now = getCurrentIST();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let presentCount = 0;
    let html = '';

    periods.forEach((period, index) => {
      const schedule = PERIOD_SCHEDULE[index];
      const displayMinutes = schedule ? getTimeInMinutes(schedule.displayFrom) : 0;
      const isDisplayed = currentMinutes >= displayMinutes;

      let statusClass = 'pending';
      let statusText = 'Upcoming';
      let statusEmoji = '⏳';

      if (!isDisplayed) {
        // Period not yet displayable
        statusClass = 'pending';
        statusText = 'Upcoming';
        statusEmoji = '⏳';
      } else if (period.noClass) {
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
        statusClass = 'pending';
        statusText = 'No Data';
        statusEmoji = '⏳';
      }

      const timing = schedule ? schedule.label : period.timing;

      html += `
        <div class="period-card ${statusClass}">
          <div class="period-number">${period.hour}</div>
          <div class="period-info">
            <div class="period-subject">${isDisplayed ? (period.subject || 'Period ' + period.hour) : 'Period ' + period.hour}</div>
            <div class="period-time">${timing}</div>
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

      const res = await authFetch(url);
      if (!res) return;
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

    let totalConducted = 0;
    let totalAttended = 0;
    if (data.subjects && data.subjects.length > 0) {
      data.subjects.forEach(s => {
        totalConducted += s.conducted;
        totalAttended += s.attended;
      });
    }

    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (percentage / 100) * circumference;

    let percentColor = '#00d4aa';
    if (percentage < 65) percentColor = '#ff6b6b';
    else if (percentage < 75) percentColor = '#ffa726';

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

    setTimeout(() => {
      const ring = content.querySelector('.progress-ring-fill');
      if (ring) {
        ring.style.strokeDashoffset = ring.dataset.target;
      }
      content.querySelectorAll('.subject-bar-fill').forEach(bar => {
        setTimeout(() => {
          bar.style.width = bar.dataset.width;
        }, 200);
      });
    }, 100);
  }

  // ===== LOGOUT =====
  async function logout() {
    if (window.Capacitor && window.Capacitor.isNative && window.Capacitor.Plugins.UnityAds) {
      window.Capacitor.Plugins.UnityAds.hideBanner().catch(e => {});
    }
    localStorage.removeItem('authToken');
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
