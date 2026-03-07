document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const alert = document.getElementById('alert');
    const loginBtn = document.getElementById('loginBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const roll_number = document.getElementById('roll_number').value.trim().toUpperCase();
        const password = document.getElementById('password').value;

        if (!roll_number || !password) {
            showAlert('Please fill in all fields', 'error');
            return;
        }

        // Loading state
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        hideAlert();

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roll_number, password }),
            });

            const data = await res.json();

            if (data.success) {
                showAlert('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 800);
            } else {
                showAlert(data.error || 'Login failed. Please try again.', 'error');
                loginBtn.classList.remove('loading');
                loginBtn.disabled = false;
            }
        } catch (err) {
            showAlert('Connection error. Please try again.', 'error');
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
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

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.error('ServiceWorker registration failed: ', err);
        });
    });
}
