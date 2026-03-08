document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    let studentData = null;

    if (!token) { window.location.href = '/'; return; }

    async function authFetch(url, options = {}) {
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        try {
            const res = await fetch(url, { ...options, headers });
            if (res.status === 401) {
                localStorage.removeItem('authToken');
                window.location.href = '/';
                return null;
            }
            return res;
        } catch (err) {
            console.error('authFetch error:', err);
            return null;
        }
    }

    init();

    async function init() {
        try {
            const res = await authFetch('/api/me');
            if (!res) return;

            let data;
            try {
                data = await res.json();
            } catch (parseErr) {
                console.error('Failed to parse /api/me response:', parseErr);
                showPageError('Failed to load profile data. Please try again.');
                return;
            }

            if (!data.student) {
                console.error('/api/me returned no student:', data);
                showPageError('Session expired. Please login again.');
                setTimeout(() => {
                    localStorage.removeItem('authToken');
                    window.location.href = '/';
                }, 2000);
                return;
            }

            studentData = data.student;
            setupUI();
            loadPhoto();
        } catch (err) {
            console.error('Profile init error:', err);
            showPageError('Something went wrong. Please try again.');
        }
    }

    function showPageError(msg) {
        const card = document.getElementById('profileCard');
        if (card) {
            card.innerHTML = `<div style="text-align:center;padding:30px;"><p style="color:var(--text-secondary);">${msg}</p><a href="/" class="btn btn-primary" style="display:inline-block;margin-top:12px;">Go to Login</a></div>`;
        }
    }

    function setupUI() {
        document.getElementById('headerName').textContent = studentData.name || 'Student';
        document.getElementById('profileName').textContent = studentData.name || 'Student';
        document.getElementById('profileRoll').textContent = studentData.roll_number;
        document.getElementById('profileDept').textContent = `${studentData.department} • Year ${studentData.year} • Section ${studentData.section}`;
        document.getElementById('editName').value = studentData.name || '';

        document.getElementById('infoEmail').textContent = studentData.email || '—';
        document.getElementById('infoDept').textContent = studentData.department || '—';
        document.getElementById('infoYear').textContent = studentData.year || '—';
        document.getElementById('infoSection').textContent = studentData.section || '—';

        if (studentData.created_at) {
            const d = new Date(studentData.created_at);
            document.getElementById('infoJoined').textContent = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        if (studentData.is_admin) {
            document.getElementById('adminBadge').style.display = 'inline-block';
        }

        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = '/';
        });

        document.getElementById('saveNameBtn').addEventListener('click', saveName);
        document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);
    }

    async function loadPhoto() {
        try {
            const res = await authFetch(`/api/profile/photo/${studentData.roll_number}`);
            if (!res) return;
            const data = await res.json();
            if (data.success && data.photo) {
                const container = document.getElementById('photoContainer');
                container.innerHTML = `<img src="${data.photo}" class="profile-photo" alt="Profile">`;
            } else {
                const initials = (studentData.name || 'S').charAt(0).toUpperCase();
                document.getElementById('photoContainer').textContent = initials;
            }
        } catch (err) { /* ignore photo load errors */ }
    }

    async function saveName() {
        const btn = document.getElementById('saveNameBtn');
        const name = document.getElementById('editName').value.trim();
        const alertEl = document.getElementById('editAlert');

        if (!name) { showAlert(alertEl, 'Name cannot be empty', 'error'); return; }

        btn.classList.add('loading'); btn.disabled = true;

        try {
            const res = await authFetch('/api/profile/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!res) return;
            const data = await res.json();
            if (data.success) {
                showAlert(alertEl, 'Name updated!', 'success');
                document.getElementById('profileName').childNodes[0].textContent = name;
                document.getElementById('headerName').textContent = name;
            } else {
                showAlert(alertEl, data.error || 'Failed to update', 'error');
            }
        } catch (err) { showAlert(alertEl, 'Connection error', 'error'); }

        btn.classList.remove('loading'); btn.disabled = false;
    }

    async function handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 500000) {
            alert('Photo must be under 500KB. Please choose a smaller image.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async function (event) {
            const base64 = event.target.result;
            const container = document.getElementById('photoContainer');
            container.innerHTML = `<img src="${base64}" class="profile-photo" alt="Profile">`;

            try {
                const res = await authFetch('/api/profile/photo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ photo: base64 }),
                });
                if (!res) return;
                const data = await res.json();
                if (!data.success) alert(data.error || 'Failed to upload photo');
            } catch (err) { alert('Failed to upload photo'); }
        };
        reader.readAsDataURL(file);
    }

    function showAlert(el, msg, type) {
        el.textContent = msg;
        el.className = `alert alert-${type} show`;
        setTimeout(() => { el.className = 'alert'; }, 3000);
    }
});
