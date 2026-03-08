document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    let studentData = null;
    let isAdmin = false;
    let pendingAttachments = [];

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
            document.getElementById('attachInput').addEventListener('change', handleFileSelect);
        }
    }

    // ===== FILE ATTACHMENT HANDLING =====
    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        const preview = document.getElementById('attachPreview');

        files.forEach(file => {
            if (pendingAttachments.length >= 5) {
                alert('Maximum 5 attachments allowed');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name} is too large (max 5MB per file)`);
                return;
            }

            const reader = new FileReader();
            reader.onload = function (ev) {
                const attachment = {
                    name: file.name,
                    type: file.type,
                    data: ev.target.result,
                    id: Date.now() + Math.random()
                };
                pendingAttachments.push(attachment);
                renderAttachmentPreview();
            };
            reader.readAsDataURL(file);
        });

        e.target.value = '';
    }

    function renderAttachmentPreview() {
        const preview = document.getElementById('attachPreview');
        if (pendingAttachments.length === 0) {
            preview.innerHTML = '';
            return;
        }

        let html = '';
        pendingAttachments.forEach((a, idx) => {
            const isImage = a.type.startsWith('image/');
            html += `
        <div class="attach-preview-item">
          ${isImage ? `<img src="${a.data}" class="attach-thumb">` : `<div class="attach-file-icon">📄</div>`}
          <span class="attach-name">${a.name}</span>
          <button class="attach-remove" onclick="removeAttachment(${idx})">✕</button>
        </div>
      `;
        });
        preview.innerHTML = html;
    }

    window.removeAttachment = function (idx) {
        pendingAttachments.splice(idx, 1);
        renderAttachmentPreview();
    };

    // ===== LOAD ANNOUNCEMENTS =====
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

                    // Render attachments
                    let attachHtml = '';
                    if (item.attachments && item.attachments.length > 0) {
                        attachHtml = '<div class="attach-list">';
                        item.attachments.forEach(a => {
                            const isImage = a.type && a.type.startsWith('image/');
                            if (isImage) {
                                attachHtml += `<div class="attach-image-wrap"><img src="${a.data}" class="attach-image" onclick="openImage(this.src)" alt="${escapeHtml(a.name)}"></div>`;
                            } else {
                                attachHtml += `<a href="${a.data}" download="${escapeHtml(a.name)}" class="attach-download">📎 ${escapeHtml(a.name)}</a>`;
                            }
                        });
                        attachHtml += '</div>';
                    }

                    html += `
            <div class="announcement-item" style="animation-delay:${idx * 0.05}s;">
              <div class="announcement-title">
                <span class="title-text">${escapeHtml(item.title)}</span>
                ${deleteBtn}
              </div>
              <div class="announcement-body">${escapeHtml(item.message)}</div>
              ${attachHtml}
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

    // ===== POST ANNOUNCEMENT =====
    async function postAnnouncement() {
        const btn = document.getElementById('postBtn');
        const title = document.getElementById('postTitle').value.trim();
        const message = document.getElementById('postMessage').value.trim();
        const alertEl = document.getElementById('postAlert');

        if (!title || !message) { showAlert(alertEl, 'Title and message are required', 'error'); return; }

        btn.classList.add('loading'); btn.disabled = true;

        try {
            const payload = { title, message };
            if (pendingAttachments.length > 0) {
                payload.attachments = pendingAttachments.map(a => ({
                    name: a.name, type: a.type, data: a.data
                }));
            }

            const res = await authFetch('/api/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res) return;
            const data = await res.json();
            if (data.success) {
                showAlert(alertEl, 'Posted!', 'success');
                document.getElementById('postTitle').value = '';
                document.getElementById('postMessage').value = '';
                pendingAttachments = [];
                renderAttachmentPreview();
                loadAnnouncements();
            } else {
                showAlert(alertEl, data.error || 'Failed to post', 'error');
            }
        } catch (err) { showAlert(alertEl, 'Connection error', 'error'); }

        btn.classList.remove('loading'); btn.disabled = false;
    }

    // ===== DELETE =====
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

    // ===== IMAGE VIEWER =====
    window.openImage = function (src) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;padding:20px;';
        overlay.innerHTML = `<img src="${src}" style="max-width:95%;max-height:90vh;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.3);">`;
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    };

    // ===== UTILS =====
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
