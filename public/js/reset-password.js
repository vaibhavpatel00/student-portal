document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('resetForm');
    const alert = document.getElementById('alert');
    const resetBtn = document.getElementById('resetBtn');

    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showAlert('Invalid or missing reset link. Please request a new one.', 'error');
        resetBtn.disabled = true;
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('password').value;
        const confirm_password = document.getElementById('confirm_password').value;

        if (!password || password.length < 6) {
            showAlert('Password must be at least 6 characters', 'error');
            return;
        }

        if (password !== confirm_password) {
            showAlert('Passwords do not match', 'error');
            return;
        }

        resetBtn.classList.add('loading');
        resetBtn.disabled = true;
        hideAlert();

        try {
            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (data.success) {
                showAlert(data.message || 'Password updated! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                showAlert(data.error || 'Failed to reset password.', 'error');
                resetBtn.classList.remove('loading');
                resetBtn.disabled = false;
            }
        } catch (err) {
            showAlert('Connection error. Please try again.', 'error');
            resetBtn.classList.remove('loading');
            resetBtn.disabled = false;
        }
    });

    function showAlert(message, type) {
        alert.textContent = message;
        alert.className = `alert alert-${type} show`;
    }

    function hideAlert() {
        alert.className = 'alert';
    }
});
