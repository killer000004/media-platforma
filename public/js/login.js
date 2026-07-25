const form = document.getElementById('loginForm');
const errorText = document.getElementById('loginError');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorText.hidden = true;

  const formData = new FormData(form);
  const body = {
    username: formData.get('username'),
    password: formData.get('password'),
  };

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      errorText.textContent = data.error || 'Xatolik yuz berdi';
      errorText.hidden = false;
      return;
    }

    window.location.href = '/';
  } catch (err) {
    errorText.textContent = 'Serverga ulanib bo\'lmadi';
    errorText.hidden = false;
  } finally {
    submitBtn.disabled = false;
  }
});
