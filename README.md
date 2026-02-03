# PAMA - Privileged Access Management AI (Web Interface)

PAMA is a premium, AI-driven monitoring dashboard designed to simulate privileged access tracking, command execution, and threat detection.

## 🚀 Getting Started

This is a **Zero-Dependency** application. It runs entirely in your web browser without the need for Node.js, Python, or a backend server.

### Prerequisites
- A modern web browser (Chrome, Edge, Firefox, Safari).

### how to Run
1.  Locate the `index.html` file in this folder.
2.  Double-click it or drag it into your browser window.
3.  The application will launch immediately.

---

## ✨ Features

### 1. Authentication Module
-   **Role-Based Access**: Toggle between **User** and **Higher Authority** (Admin) roles.
-   **Registration**: Create new accounts that are saved locally (in your browser's memory).
-   **Login**: Secure-style login with role validation.
-   **Premium UI**: Glassmorphism design with dynamic animations and glowing effects.

### 2. IDE / Dashboard Module
-   **File Explorer**: Simulated sidebar showing project files.
-   **Terminal Emulator**: A fully interactive mock terminal.
    -   Typing effect and auto-scrolling.
    -   Command history visualization.

---

## 🎮 Usage Guide

### Default Credentials (Demo)
If you don't want to register, use these demo credentials:
-   **Email**: `demo@pama.ai`
-   **Password**: `demo`
-   **Role**: Works for both *User* and *Higher Authority* (just select the matching toggle).

### Available Terminal Commands
Once logged in, try typing these commands in the terminal:

| Command | Description |
| :--- | :--- |
| `help` | Show list of available commands. |
| `clear` | Clear the terminal screen. |
| `whoami` | Display current user session info. |
| `status` | Check system and AI engine status. |
| `run-analysis` | **(Visual)** Run a simulated AI threat detection scan. |
| `sudo-logs` | **(Admin Only)** View privileged access logs. |
| `terminate <id>` | **(Admin Only)** Simulate terminating a session. |


