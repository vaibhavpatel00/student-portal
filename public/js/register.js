document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const alert = document.getElementById('alert');
    const registerBtn = document.getElementById('registerBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const roll_number = document.getElementById('roll_number').value.trim().toUpperCase();
        const email = document.getElementById('email').value.trim();
        const department = document.getElementById('department').value;
        const year = document.getElementById('year').value;
        const section = document.getElementById('section').value;
        const password = document.getElementById('password').value;
        const confirm_password = document.getElementById('confirm_password').value;

        // Validation
        if (!name || !roll_number || !email || !department || !year || !section || !password) {
            showAlert('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 6) {
            showAlert('Password must be at least 6 characters', 'error');
            return;
        }

        if (password !== confirm_password) {
            showAlert('Passwords do not match', 'error');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Please enter a valid email address', 'error');
            return;
        }

        // Loading state
        registerBtn.classList.add('loading');
        registerBtn.disabled = true;
        hideAlert();

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, roll_number, email, department, year, section, password }),
            });

            const data = await res.json();

            if (data.success) {
                showAlert('Registration successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                showAlert(data.error || 'Registration failed. Please try again.', 'error');
                registerBtn.classList.remove('loading');
                registerBtn.disabled = false;
            }
        } catch (err) {
            showAlert('Connection error. Please try again.', 'error');
            registerBtn.classList.remove('loading');
            registerBtn.disabled = false;
        }
    });

    function showAlert(message, type) {
        alert.textContent = message;
        alert.className = `alert alert-${type} show`;

        // Scroll to top to show alert
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
