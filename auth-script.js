// Authentication System
class AuthSystem {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkExistingSession();
    }

    bindEvents() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
        }

        const tabLogin = document.getElementById('tabLogin');
        const tabSignup = document.getElementById('tabSignup');
        if (tabLogin && tabSignup) {
            tabLogin.addEventListener('click', () => this.switchAuthTab('login'));
            tabSignup.addEventListener('click', () => this.switchAuthTab('signup'));
        }

        // Demo account filling
        window.fillDemoAccount = (role) => {
            const accounts = {
                'admin': { username: 'admin', password: 'admin123' },
                'manager': { username: 'manager', password: 'manager123' },
                'user': { username: 'user', password: 'user123' }
            };
            
            const account = accounts[role];
            document.getElementById('username').value = account.username;
            document.getElementById('password').value = account.password;
        };
    }

    switchAuthTab(tab) {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const subtitle = document.getElementById('authSubtitle');
        const tabLogin = document.getElementById('tabLogin');
        const tabSignup = document.getElementById('tabSignup');
        if (!loginForm || !signupForm) return;
        if (tab === 'login') {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
            if (subtitle) subtitle.textContent = 'Please sign in to access your resources';
            if (tabLogin) { tabLogin.className = 'btn btn-primary'; }
            if (tabSignup) { tabSignup.className = 'btn btn-secondary'; }
        } else {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            if (subtitle) subtitle.textContent = 'Create an account to request access';
            if (tabLogin) { tabLogin.className = 'btn btn-secondary'; }
            if (tabSignup) { tabSignup.className = 'btn btn-primary'; }
        }
    }

    async loadUsers() {
        // Source of truth: GitHub users.json
        try {
            if (window.githubData && typeof githubData.readUsers === 'function') {
                const data = await githubData.readUsers();
                const list = Array.isArray(data.json) ? data.json : [];
                if (list.length > 0) {
                    try { localStorage.setItem('hubUsers', JSON.stringify(list)); } catch(_) {}
                    return list;
                }
            }
        } catch(_) {}
        // Fallback: local cached admin only (no demo accounts)
        const stored = localStorage.getItem('hubUsers');
        if (stored) return JSON.parse(stored);
        const adminOnly = [
            {
                id: 1,
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                name: 'System Administrator',
                email: 'admin@company.com',
                permissions: {
                    canManageUsers: true,
                    canEditAllSections: true,
                    canDeleteResources: true,
                    canViewAuditLog: true,
                    canManageRoles: true,
                    canAssignSections: true,
                    canManagePermissions: true,
                    sections: ['costing','supply-planning','operations','quality','hr','it','sales','compliance'],
                    editableSections: ['costing','supply-planning','operations','quality','hr','it','sales','compliance']
                },
                createdAt: new Date().toISOString()
            }
        ];
        try { localStorage.setItem('hubUsers', JSON.stringify(adminOnly)); } catch(_) {}
        return adminOnly;
    }

    handleLogin() {
        const identifierRaw = document.getElementById('username').value || '';
        const identifier = identifierRaw.trim();
        const lowered = identifier.toLowerCase();
        const password = (document.getElementById('password').value || '').trim();

        // Always reload users from GitHub (source of truth), with cached fallback
        try { this.users = await this.loadUsers(); } catch(_) { this.users = await this.loadUsers(); }
        console.log('=== LOGIN PROCESS ===');
        console.log('Users loaded for login:', this.users);
        
        const user = this.users.find(u => (
            (u.username && String(u.username).toLowerCase() === lowered) ||
            (u.email && String(u.email).toLowerCase() === lowered) ||
            (u.name && String(u.name).toLowerCase() === lowered)
        ) && String(u.password) === password);
        console.log('Found user for login:', user);
        
        if (user) {
            console.log('User permissions before session creation:', user.permissions);
            console.log('User sections before session creation:', user.permissions?.sections);
            
            // Make sure we have the latest user data
            this.currentUser = user;
            
            // Create session with fresh user data
            this.createSession(user);
            
            // Set flag to force update on hub page
            localStorage.setItem('freshLogin', 'true');
            localStorage.setItem('lastLoginUser', JSON.stringify(user));
            
            console.log('Session created with fresh data, redirecting to hub...');
            this.redirectToHub();
        } else {
            this.showMessage('Invalid username or password', 'error');
        }
    }

    async handleSignup() {
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim().toLowerCase();
        const password = document.getElementById('signupPassword').value;
        if (!name || !email || !password) {
            this.showMessage('All fields are required', 'error');
            return;
        }
        // Reload current users from GitHub as source of truth
        this.users = await this.loadUsers();
        if (this.users.find(u => u.email && u.email.toLowerCase() === email)) {
            this.showMessage('Email already registered', 'error');
            return;
        }
        const nextId = (this.users.reduce((m,u) => Math.max(m, u.id || 0), 0) + 1) || Date.now();
        // Default permissions: view-only to ALL current sections from GitHub (fallback: cached sectionOrder)
        let visibleSections = [];
        try {
            if (window.githubData && typeof githubData.readSections === 'function') {
                const remote = await githubData.readSections();
                const arr = Array.isArray(remote.json) ? remote.json : [];
                visibleSections = arr.filter(s => s && s.visible !== false).map(s => s.id);
            }
        } catch (_) {}
        if (!Array.isArray(visibleSections) || visibleSections.length === 0) {
            visibleSections = [];
            try { this.showMessage('No sections available yet. Ask admin to configure sections.', 'error'); } catch(_) {}
        }
        const newUser = {
            id: nextId,
            username: email, // allow login via email
            password: password,
            role: 'user',
            name: name,
            email: email,
            permissions: {
                canManageUsers: false,
                canEditAllSections: false,
                canDeleteResources: false,
                canViewAuditLog: false,
                canManageRoles: false,
                canAssignSections: false,
                canManagePermissions: false,
                sections: visibleSections,
                editableSections: []
            },
            createdAt: new Date().toISOString()
        };
        this.users.push(newUser);
        localStorage.setItem('hubUsers', JSON.stringify(this.users));
        // Persist to IndexedDB (best-effort)
        try {
            if (window.hubDatabase && hubDatabase.saveUser) {
                await hubDatabase.saveUser(newUser);
            }
        } catch (_) {}
        // Persist to GitHub store so signup users are part of the system immediately (role remains 'user')
        try {
            if (window.githubData && typeof githubData.upsertUser === 'function') {
                await githubData.upsertUser(newUser);
            }
        } catch (_) {}
        // Auto-login the new user and redirect to hub (view-only until admin assigns)
        this.createSession(newUser);
        this.redirectToHub();
    }

    createSession(user) {
        // ALWAYS get the latest user data from localStorage
        const latestUsers = this.loadUsers();
        const latestUser = latestUsers.find(u => u.id === user.id);
        
        if (latestUser) {
            user = latestUser; // Use the latest user data
            console.log('=== USING LATEST USER DATA ===');
            console.log('Latest user from localStorage:', user);
            console.log('Latest user permissions:', user.permissions);
            console.log('Latest user sections:', user.permissions?.sections);
        } else {
            console.log('=== WARNING: USER NOT FOUND IN LATEST DATA ===');
            console.log('Using original user data:', user);
        }
        
        const session = {
            userId: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            email: user.email,
            loginTime: new Date().toISOString(),
            permissions: user.permissions
        };
        
        console.log('=== CREATING SESSION ===');
        console.log('Session data:', session);
        console.log('Session permissions:', session.permissions);
        console.log('Session sections:', session.permissions?.sections);
        
        localStorage.setItem('hubSession', JSON.stringify(session));
        this.logActivity('LOGIN', `User ${user.username} logged in`);
        
        console.log('=== SESSION CREATED SUCCESSFULLY ===');
    }

    checkExistingSession() {
        try {
            const session = localStorage.getItem('hubSession');
            if (!session) return;
            const sessionData = JSON.parse(session);
            // Reload users from localStorage to get updated permissions
            this.users = this.loadUsers();
            const user = this.users.find(u => u.id === sessionData.userId);
            if (!user) return;
            this.currentUser = user;
            const updatedSession = {
                userId: user.id,
                username: user.username,
                role: user.role,
                name: user.name,
                email: user.email,
                loginTime: sessionData.loginTime,
                permissions: user.permissions
            };
            localStorage.setItem('hubSession', JSON.stringify(updatedSession));
            // Do not auto-redirect if already on auth page from a manual logout; keep behavior
            if (location.pathname.endsWith('auth.html')) return;
            this.redirectToHub();
        } catch (e) {
            console.warn('Invalid existing session; clearing.', e);
            localStorage.removeItem('hubSession');
        }
    }

    redirectToHub() {
        // Set a flag to indicate fresh login
        localStorage.setItem('freshLogin', 'true');
        console.log('Redirecting to hub...');
        window.location.href = 'index.html';
    }

    logout() {
        if (this.currentUser) {
            this.logActivity('LOGOUT', `User ${this.currentUser.username} logged out`);
        }
        localStorage.removeItem('hubSession');
        this.currentUser = null;
        window.location.href = 'auth.html';
    }

    // Global logout function
    static logout() {
        const authSystem = new AuthSystem();
        authSystem.logout();
    }

    getCurrentUser() {
        const session = localStorage.getItem('hubSession');
        if (session) {
            const sessionData = JSON.parse(session);
            return this.users.find(u => u.id === sessionData.userId);
        }
        return null;
    }

    hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;
        return user.permissions[permission] || false;
    }

    canAccessSection(sectionId) {
        const user = this.getCurrentUser();
        if (!user) return false;
        return user.permissions.sections.includes(sectionId);
    }

    canEditResource(sectionId) {
        const user = this.getCurrentUser();
        if (!user) return false;
        return user.permissions.canEditAllSections || user.permissions.sections.includes(sectionId);
    }

    canDeleteResource(sectionId) {
        const user = this.getCurrentUser();
        if (!user) return false;
        return user.permissions.canDeleteResources && this.canEditResource(sectionId);
    }

    logActivity(action, description) {
        const user = this.getCurrentUser();
        if (!user) return;

        const activity = {
            id: Date.now().toString(),
            userId: user.id,
            username: user.username,
            action: action,
            description: description,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1' // In a real app, this would be the actual IP
        };

        const activities = this.getActivities();
        activities.unshift(activity);
        
        // Keep only last 1000 activities
        if (activities.length > 1000) {
            activities.splice(1000);
        }
        
        localStorage.setItem('hubActivities', JSON.stringify(activities));
    }

    getActivities() {
        const stored = localStorage.getItem('hubActivities');
        return stored ? JSON.parse(stored) : [];
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        // Insert at the top of the container
        const container = document.querySelector('.auth-container');
        container.insertBefore(messageDiv, container.firstChild);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// Initialize authentication system
const authSystem = new AuthSystem();

// Export for global access
window.authSystem = authSystem;
