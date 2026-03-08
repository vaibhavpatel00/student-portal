document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgotForm');
    const alert = document.getElementById('alert');
    const forgotBtn = document.getElementById('forgotBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();

        if (!email) {
            showAlert('Please enter your email address', 'error');
            return;
        }

        forgotBtn.classList.add('loading');
        forgotBtn.disabled = true;
        hideAlert();

        try {
            const res = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (data.success) {
                showAlert(data.message || 'Reset link sent! Check your email.', 'success');
                form.reset();
            } else {
                showAlert(data.error || 'Failed to send reset link.', 'error');
            }
        } catch (err) {
            showAlert('Connection error. Please try again.', 'error');
        }

        forgotBtn.classList.remove('loading');
        forgotBtn.disabled = false;
    });

    function showAlert(message, type) {
        alert.textContent = message;
        alert.className = `alert alert-${type} show`;
    }

    function hideAlert() {
        alert.className = 'alert';
    }
});
