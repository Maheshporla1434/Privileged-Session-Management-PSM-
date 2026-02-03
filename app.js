// State
const state = {
    role: 'user',
    authMode: 'login',
    currentUser: null,
    isLoggedIn: false,
    currentPath: ['~'],
    currentDirNode: fileSystem["~"],
    serverOnline: true,
    lastNotificationId: 0,
    unreadCount: 0
};

// DOM Elements
const authModule = document.getElementById('auth-module');
const ideModule = document.getElementById('ide-module');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const terminalBody = document.getElementById('terminal-body');
const terminalInput = document.getElementById('terminal-input');
const promptLabel = document.getElementById('prompt-label');

const adminBtn = document.getElementById('admin-logs-btn');
const adminOverlay = document.getElementById('admin-overlay');
const alertBadge = document.getElementById('alert-badge');
const logsTableBody = document.querySelector('#logs-table tbody');

const toastContainer = document.createElement('div');
toastContainer.classList.add('notification-container');
document.body.appendChild(toastContainer);

// --- Initialization ---
function init() {
    setTimeout(() => {
        authModule.classList.add('active');
    }, 100);

    document.querySelector('.terminal-wrapper').addEventListener('click', () => {
        if (state.isLoggedIn && adminOverlay.classList.contains('hidden')) {
            terminalInput.focus();
        }
    });

    checkServer();
}

async function checkServer() {
    try {
        await fetch('http://localhost:8000/');
        state.serverOnline = true;
    } catch (e) {
        state.serverOnline = false;
        console.warn("Server offline");
    }
}

// --- Admin Dashboard Logic ---
function toggleAdminLogs() {
    adminOverlay.classList.toggle('hidden');
    if (!adminOverlay.classList.contains('hidden')) {
        fetchAndRenderLogs();
        // Reset count when viewed
        state.unreadCount = 0;
        updateBadge();
    }
}

async function fetchAndRenderLogs() {
    const userCommandsContainer = document.getElementById('user-commands-container');
    const userCommandsTableBody = document.querySelector('#user-commands-table tbody');

    // Hide user commands section by default
    if (userCommandsContainer) userCommandsContainer.classList.add('hidden');
    if (userCommandsTableBody) userCommandsTableBody.innerHTML = '';

    try {
        const res = await fetch('http://localhost:8000/notifications');
        const logs = await res.json();

        logsTableBody.innerHTML = '';

        // Track users with exceeded limits
        const usersWithExceededLimits = new Set();

        logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${log.timestamp}</td>
                <td>${log.user}</td>
                <td style="font-family: monospace">${log.command}</td>
                <td class="risk-high">${log.daily_avg}</td>
                <td class="risk-high">${log.weekly_total}</td>
                <td><span class="badge">RISKY</span></td>
            `;
            logsTableBody.appendChild(row);

            // Check if limit was exceeded
            if (log.limit_exceeded) {
                usersWithExceededLimits.add(log.user);
            }
        });

        // Fetch and display command history for users with exceeded limits
        if (usersWithExceededLimits.size > 0 && userCommandsContainer && userCommandsTableBody) {
            userCommandsContainer.classList.remove('hidden');

            for (const username of usersWithExceededLimits) {
                try {
                    const cmdRes = await fetch(`http://localhost:8000/user_commands/${encodeURIComponent(username)}`);
                    const commands = await cmdRes.json();

                    commands.forEach(cmd => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${cmd.time}</td>
                            <td style="font-family: monospace">${cmd.command}</td>
                            <td class="${cmd.score > 5 ? 'risk-high' : ''}">${cmd.score}</td>
                        `;
                        userCommandsTableBody.appendChild(row);
                    });
                } catch (cmdErr) {
                    console.error(`Error fetching commands for ${username}:`, cmdErr);
                }
            }
        }

    } catch (e) {
        logsTableBody.innerHTML = '<tr><td colspan="6">Error fetching logs. Server offline?</td></tr>';
    }
}

function updateBadge() {
    if (state.unreadCount > 0) {
        alertBadge.textContent = state.unreadCount;
        alertBadge.classList.remove('hidden');
    } else {
        alertBadge.classList.add('hidden');
    }
}

// --- Auth Handling ---
function setRole(role) {
    state.role = role;
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.role === role);
    });
}

function toggleAuthMode(mode) {
    state.authMode = mode;
    if (mode === 'login') {
        registerForm.classList.remove('active');
        setTimeout(() => loginForm.classList.add('active'), 50);
    } else {
        loginForm.classList.remove('active');
        setTimeout(() => registerForm.classList.add('active'), 50);
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if (!name || !email || !password) return;

    const user = { name, email, password, role: state.role };
    localStorage.setItem(`user_${email}`, JSON.stringify(user));

    addToTerminal('system', `New account created for ${email}`);
    alert(`Account created! Please log in.`);
    toggleAuthMode('login');
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const storedUserStr = localStorage.getItem(`user_${email}`);
    let user = storedUserStr ? JSON.parse(storedUserStr) : null;

    if (user && user.password === password) {
        if (user.role !== state.role) {
            alert(`Role mismatch! This account is for ${user.role.toUpperCase()}s.`);
            return;
        }
        loginSuccess(user);
    } else {
        if (email === 'demo@pama.ai' && password === 'demo') {
            loginSuccess({ name: 'Demo User', email, role: state.role });
        } else {
            alert('Invalid credentials. Try demo@pama.ai / demo');
        }
    }
}

function loginSuccess(user) {
    state.currentUser = user;
    state.isLoggedIn = true;

    // RESET TERMINAL FOR NEW USER
    terminalBody.innerHTML = '';
    state.currentPath = ['~'];
    state.currentDirNode = fileSystem["~"];

    authModule.classList.remove('active');
    setTimeout(() => {
        authModule.style.display = 'none';
        ideModule.style.display = 'flex';
        setTimeout(() => ideModule.classList.add('active'), 100);
    }, 400);

    updatePrompt();
    document.getElementById('current-session-user').textContent = `Session: ${user.name} (${user.role})`;

    addToTerminal('system', `PAMA Secure Shell v2.1.0`);
    if (state.serverOnline) {
        addToTerminal('success', `[SECURE] AI Threat Defenses Active.`);
    } else {
        addToTerminal('error', `[WARNING] Server Offline. Running in restricted mode.`);
    }

    // Reset Dashboard Risk for Fresh Login
    const dailyEl = document.getElementById('daily-risk-val');
    const weeklyEl = document.getElementById('weekly-risk-val');
    if (dailyEl && weeklyEl) {
        dailyEl.textContent = '0.00';
        weeklyEl.textContent = '0';
        dailyEl.className = 'risk-val safe';
        weeklyEl.className = 'risk-val safe';
    }

    terminalInput.focus();

    // Admin Features
    const riskStats = document.getElementById('risk-stats-container');
    if (user.role === 'admin') {
        adminBtn.classList.remove('hidden'); // Show Bell
        riskStats.classList.add('hidden'); // Optional: Hide for admin? Or keep it? User asked for "user dashboard". Usually admin doesn't have personal risk. 
        // Let's hide it for admin to keep their view clean for monitoring OTHERS, or show it if they run commands.
        // Interpretation: "In user dashboard". Admin is a "Higher Authority".
        // Let's show it for everyone for now, or just regular users. 
        // Logic: specific request "user dashboard".
        // Let's show it only for 'user' role for clarity.
    } else {
        adminBtn.classList.add('hidden');
        riskStats.classList.remove('hidden');
    }
}

function logout() {
    state.isLoggedIn = false;
    state.currentUser = null;

    // Hide Admin UI
    adminBtn.classList.add('hidden');
    adminOverlay.classList.add('hidden');

    ideModule.classList.remove('active');
    setTimeout(() => {
        ideModule.style.display = 'none';
        authModule.style.display = 'flex';
        setTimeout(() => authModule.classList.add('active'), 100);
    }, 400);
}

function updatePrompt() {
    state.currentDirNode = fileSystem["~"];
    promptLabel.textContent = `${state.currentUser.role}@pama:~$`;
}

// --- Polling Logic ---
function startPolling() {
    setInterval(async () => {
        if (!state.isLoggedIn || state.currentUser.role !== 'admin' || !state.serverOnline) return;

        try {
            const res = await fetch('http://localhost:8000/notifications');
            const incidents = await res.json();

            incidents.forEach(inc => {
                if (inc.id > state.lastNotificationId) {
                    showToast('SECURITY ALERT',
                        `User <b>${inc.user}</b> attempted risky command: <br/><code>${inc.command}</code>`,
                        'alert');
                    state.lastNotificationId = inc.id;
                    state.unreadCount++;
                    updateBadge();
                }
            });
        } catch (e) { }
    }, 3000);
}

function showToast(title, message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <span>${title}</span>
            <span>Now</span>
        </div>
        <div class="toast-body">${message}</div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// --- Terminal Logic ---
function focusTerminal() {
    if (adminOverlay.classList.contains('hidden')) terminalInput.focus();
}

async function handleCommand(e) {
    if (e.key === 'Enter') {
        const cmdRaw = terminalInput.value;
        const cmdInput = cmdRaw.trim();
        terminalInput.value = '';
        if (!cmdInput) return;

        addToTerminal('echo', `${promptLabel.textContent} ${cmdRaw}`);

        const isSafe = await checkSafety(cmdInput);
        if (isSafe) {
            processCommand(cmdInput);
        } else {
            addToTerminal('error', `[BLOCKED] Command flagged by AI Model.`);
            addToTerminal('system', `Incident logged and reported to Higher Authority.`);
        }
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }
}

async function checkSafety(command) {
    if (!state.serverOnline) return true;

    const safeList = ['ls', 'dir', 'cd', 'pwd', 'echo', 'whoami', 'help', 'clear'];
    if (safeList.includes(command.split(' ')[0].toLowerCase())) return true;

    try {
        // Send role too
        const response = await fetch('http://localhost:8000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: command,
                username: state.currentUser.name,
                role: state.currentUser.role
            })
        });

        const data = await response.json();
        const dailyAvg = data.average_risk_score;
        const weeklyTotal = data.weekly_total_risk;

        // Update Top Level Stats
        const dailyEl = document.getElementById('daily-risk-val');
        const weeklyEl = document.getElementById('weekly-risk-val');

        if (dailyEl && weeklyEl) {
            dailyEl.textContent = dailyAvg;
            weeklyEl.textContent = weeklyTotal;

            // Color Coding
            dailyEl.className = `risk-val ${dailyAvg > 8 ? 'danger' : 'safe'}`;
            weeklyEl.className = `risk-val ${weeklyTotal > 80 ? 'danger' : 'safe'}`;
        }

        if (data.prediction === 'risky') {
            addToTerminal('error', `[ALERT] Threat Detected! (Daily Avg: ${dailyAvg} | Weekly Total: ${weeklyTotal})`);
            return false;
        } else {
            addToTerminal('success', `[SAFE] Daily Avg: ${dailyAvg} | Weekly Total: ${weeklyTotal}`);
            return true;
        }

    } catch (e) {
        addToTerminal('error', `[API Error] Safety check failed.`);
        return true;
    }
}

function addToTerminal(type, text) {
    const div = document.createElement('div');
    div.classList.add('output-line');
    if (type === 'echo') div.classList.add('command-echo');
    if (type === 'system') div.classList.add('system-msg');
    if (type === 'success') div.classList.add('success-msg');
    if (type === 'error') div.classList.add('error-msg');
    div.textContent = text;
    terminalBody.appendChild(div);
}

function processCommand(cmdStr) {
    const parts = cmdStr.split(' ');
    const cmd = parts[0].toLowerCase();

    if (cmd === 'clear') { terminalBody.innerHTML = ''; return; }
    if (cmd === 'help') { addToTerminal('system', 'Try: ls, cd, cat, whoami. Risky: rm -rf, format c:'); return; }
    if (commandRegistry[cmd]) { addToTerminal('system', commandRegistry[cmd](state.currentUser)); return; }

    if (cmd === 'ls' || cmd === 'dir') {
        const children = state.currentDirNode.children;
        for (const name of Object.keys(children)) addToTerminal('system', name);
    } else {
        addToTerminal('error', `Command not found: ${cmd}`);
    }
}

init();
