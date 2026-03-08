document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    let studentData = null;
    let isAdmin = false;

    if (!token) { window.location.href = '/'; return; }

    async function authFetch(url, options = {}) {
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) { localStorage.removeItem('authToken'); window.location.href = '/'; return null; }
        return res;
    }

    init();

    async function init() {
        try {
            const res = await authFetch('/api/me');
            if (!res) return;
            const data = await res.json();
            if (!data.student) { localStorage.removeItem('authToken'); window.location.href = '/'; return; }
            studentData = data.student;
            isAdmin = studentData.is_admin || false;
            setupUI();
            loadAnnouncements();
        } catch (err) { localStorage.removeItem('authToken'); window.location.href = '/'; }
    }

    function setupUI() {
        document.getElementById('headerName').textContent = studentData.name || 'Student';
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = '/';
        });

        if (isAdmin) {
            document.getElementById('adminPostSection').style.display = 'block';
            document.getElementById('postBtn').addEventListener('click', postAnnouncement);
        }
    }

    async function loadAnnouncements() {
        const feed = document.getElementById('announcementsFeed');
        try {
            const res = await authFetch('/api/announcements');
            if (!res) return;
            const data = await res.json();

            if (data.success && data.data && data.data.length > 0) {
                let html = '';
                data.data.forEach((item, idx) => {
                    const date = new Date(item.created_at);
                    const timeAgo = getTimeAgo(date);
                    const deleteBtn = isAdmin ? `<button class="delete-btn" onclick="deletePost('${item._id}')">🗑️</button>` : '';

                    html += `
            <div class="announcement-item" style="animation-delay:${idx * 0.05}s;">
              <div class="announcement-title">
                <span class="title-text">${escapeHtml(item.title)}</span>
                ${deleteBtn}
              </div>
              <div class="announcement-body">${escapeHtml(item.message)}</div>
              <div class="announcement-meta">
                <span>By ${escapeHtml(item.posted_by_name || 'Admin')}</span>
                <span>${timeAgo}</span>
              </div>
            </div>
          `;
                });
                feed.innerHTML = html;
            } else {
                feed.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <p>No announcements yet</p>
          </div>
        `;
            }
        } catch (err) {
            feed.innerHTML = `<div class="error-state"><p>Failed to load announcements</p></div>`;
        }
    }

    async function postAnnouncement() {
        const btn = document.getElementById('postBtn');
        const title = document.getElementById('postTitle').value.trim();
        const message = document.getElementById('postMessage').value.trim();
        const alertEl = document.getElementById('postAlert');

        if (!title || !message) { showAlert(alertEl, 'Title and message are required', 'error'); return; }

        btn.classList.add('loading'); btn.disabled = true;

        try {
            const res = await authFetch('/api/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, message }),
            });
            if (!res) return;
            const data = await res.json();
            if (data.success) {
                showAlert(alertEl, 'Posted!', 'success');
                document.getElementById('postTitle').value = '';
                document.getElementById('postMessage').value = '';
                loadAnnouncements();
            } else {
                showAlert(alertEl, data.error || 'Failed to post', 'error');
            }
        } catch (err) { showAlert(alertEl, 'Connection error', 'error'); }

        btn.classList.remove('loading'); btn.disabled = false;
    }

    window.deletePost = async function (id) {
        if (!confirm('Delete this announcement?')) return;
        try {
            const res = await authFetch(`/api/announcements/${id}`, { method: 'DELETE' });
            if (!res) return;
            const data = await res.json();
            if (data.success) loadAnnouncements();
            else alert(data.error || 'Failed to delete');
        } catch (err) { alert('Failed to delete'); }
    };

    function getTimeAgo(date) {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showAlert(el, msg, type) {
        el.textContent = msg;
        el.className = `alert alert-${type} show`;
        setTimeout(() => { el.className = 'alert'; }, 3000);
    }
});
