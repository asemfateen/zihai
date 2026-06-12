const API_URL = 'http://localhost:3002/api';

document.addEventListener('DOMContentLoaded', async () => {
  const loginContainer = document.getElementById('login-container');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');
  const statusDiv = document.getElementById('status');

  // Check if already logged in
  const data = await chrome.storage.local.get('token');
  if (data.token) {
    loginContainer.innerHTML = '<p class="success">✓ Connected to Zihai!</p><button id="logout-btn" style="background:#ef4444; margin-top:10px;">Disconnect</button>';
    document.getElementById('logout-btn').onclick = async () => {
      await chrome.storage.local.remove('token');
      location.reload();
    };
  }

  if (loginBtn) {
    loginBtn.onclick = async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      
      if (!email || !password) {
        statusDiv.textContent = 'Please enter email and password.';
        statusDiv.className = 'error';
        return;
      }

      loginBtn.textContent = 'Connecting...';
      loginBtn.disabled = true;

      try {
        const res = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const json = await res.json();
        
        if (res.ok && json.token) {
          await chrome.storage.local.set({ token: json.token });
          location.reload();
        } else {
          throw new Error(json.error || 'Login failed');
        }
      } catch (err) {
        statusDiv.textContent = err.message;
        statusDiv.className = 'error';
        loginBtn.textContent = 'Connect to Zihai';
        loginBtn.disabled = false;
      }
    };
  }
});
