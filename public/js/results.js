document.addEventListener('DOMContentLoaded', () => {
  let studentData = null;

  init();

  async function init() {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();

      if (!data.student) {
        window.location.href = '/';
        return;
      }
      studentData = data.student;
      setupUI();
      loadResults();
    } catch (err) {
      window.location.href = '/';
    }
  }

  function setupUI() {
    document.getElementById('studentName').textContent = studentData.name || 'Student';
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await fetch('/api/logout');
      window.location.href = '/';
    });
  }

  async function loadResults() {
    const hero = document.getElementById('cgpaHero');
    const semList = document.getElementById('semesterList');

    try {
      const res = await fetch('/api/results');
      const data = await res.json();

      if (data.success && data.data) {
        renderCGPA(hero, data.data);
        renderSemesters(semList, data.data.semesters);
      } else {
        hero.innerHTML = `
          <div class="error-state">
            <div class="error-icon">📊</div>
            <p>${data.error || 'Could not load results'}</p>
            <button class="btn-outline" onclick="location.reload()">Try Again</button>
          </div>`;
      }
    } catch (err) {
      hero.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <p>Connection error. Please try again.</p>
          <button class="btn-outline" onclick="location.reload()">Retry</button>
        </div>`;
    }
  }

  function renderCGPA(container, data) {
    const { cgpa, percentage, totalBacklogs, semesters } = data;
    const backlogClass = totalBacklogs === 0 ? 'clear' : 'has-backlogs';
    const backlogText = totalBacklogs === 0
      ? '✅ No Backlogs'
      : `⚠️ ${totalBacklogs} Backlog${totalBacklogs > 1 ? 's' : ''}`;

    container.innerHTML = `
      <div class="cgpa-big">${cgpa.toFixed(2)}</div>
      <div class="cgpa-label">Cumulative GPA</div>
      <div class="cgpa-sub">
        <div class="cgpa-sub-item">
          <div class="cgpa-sub-value">${percentage}%</div>
          <div class="cgpa-sub-label">Percentage</div>
        </div>
        <div class="cgpa-sub-item">
          <div class="cgpa-sub-value">${semesters.length}</div>
          <div class="cgpa-sub-label">Semesters</div>
        </div>
      </div>
      <div class="backlogs-badge ${backlogClass}">${backlogText}</div>
    `;
  }

  function renderSemesters(container, semesters) {
    let html = '';

    semesters.forEach((sem, idx) => {
      const sgpaClass = getSgpaClass(sem.sgpa);
      const expanded = idx === semesters.length - 1 ? 'expanded' : '';

      html += `
        <div class="semester-card ${expanded}" data-idx="${idx}">
          <div class="semester-header" onclick="toggleSemester(${idx})">
            <div>
              <div class="semester-title">${sem.label}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="semester-sgpa ${sgpaClass}">${sem.sgpa.toFixed(2)} SGPA</span>
              <span class="expand-icon">▼</span>
            </div>
          </div>

          <div class="semester-meta">
            <span>✅ ${sem.passed} Passed</span>
            ${sem.failed > 0 ? `<span style="color:#ff6b6b">❌ ${sem.failed} Failed</span>` : ''}
            <span>📚 ${sem.earnedCredits}/${sem.totalCredits} Credits</span>
          </div>

          <div class="semester-body">
            <table class="subjects-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Int</th>
                  <th>Ext</th>
                  <th>Total</th>
                  <th>Grade</th>
                  <th>Cr</th>
                </tr>
              </thead>
              <tbody>
                ${sem.subjects.map(sub => `
                  <tr>
                    <td class="subject-name" title="${sub.name}">${sub.name}</td>
                    <td>${sub.internal}</td>
                    <td>${sub.external}</td>
                    <td><strong>${sub.total}</strong></td>
                    <td><span class="grade-badge grade-${sub.grade}">${sub.grade}</span></td>
                    <td>${sub.credits}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function getSgpaClass(sgpa) {
    if (sgpa >= 9) return 'sgpa-excellent';
    if (sgpa >= 8) return 'sgpa-good';
    if (sgpa >= 6) return 'sgpa-avg';
    return 'sgpa-low';
  }

  // Toggle semester accordion
  window.toggleSemester = function (idx) {
    const card = document.querySelector(`.semester-card[data-idx="${idx}"]`);
    if (card) card.classList.toggle('expanded');
  };
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('ServiceWorker registration failed: ', err);
    });
  });
}
