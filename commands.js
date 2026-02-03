// --- Virtual File System Data ---
const fileSystem = {
    "~": {
        type: "dir",
        children: {
            "desktop": { type: "dir", children: {} },
            "documents": {
                type: "dir", children: {
                    "report.txt": { type: "file", content: "Annual Security Report 2025\nStatus: Confidential\n..." },
                    "notes.md": { type: "file", content: "# Todo\n- Update firewall rules\n- Patch server 3" }
                }
            },
            "src": {
                type: "dir", children: {
                    "main.py": { type: "file", content: "print('Starting PAMA Service...')\nimport monitor" },
                    "utils.js": { type: "file", content: "console.log('Utils loaded');" },
                    "config.yaml": { type: "file", content: "version: 1.0\nenv: production" }
                }
            },
            "logs": {
                type: "dir", children: {
                    "access.log": { type: "file", content: "[2025-01-20 10:00:01] User logged in\n[2025-01-20 10:05:22] Failed attempt" },
                    "error.log": { type: "file", content: "No errors found." }
                }
            },
            "readme.txt": { type: "file", content: "Welcome to PAMA OS v1.0" }
        }
    }
};

// --- Command Database ---
const commandRegistry = {
    "date": () => new Date().toString(),
    "pwd": (path) => path.join('/'),
    "whoami": (user) => user.name.toLowerCase().replace(/\s/g, '_'),
    "echo": (args) => args.join(' '),
    "hostname": () => "pama-secure-node-01"
};

// --- Helper Functions for FS traversal ---
// These will be used by app.js
function getDirFromPath(currentPath, pathStr) {
    // Simplified Mock FS Resolver (supports basic relative paths)
    // For this demo, we assume we stay in "~" mostly or simple children
    if (pathStr === '/') return fileSystem["~"]; // Root

    // Return current dir object
    // Implementation in app.js will handle the state 'currentDirNode'
    // This file just holds the data.
}
