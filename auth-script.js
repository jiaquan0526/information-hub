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

    loadUsers() {
        const defaultUsers = [
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
                    sections: ['costing', 'supply-planning', 'operations', 'quality', 'hr', 'it', 'sales', 'compliance'],
                    editableSections: ['costing', 'supply-planning', 'operations', 'quality', 'hr', 'it', 'sales', 'compliance']
                },
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                username: 'manager',
                password: 'manager123',
                role: 'manager',
                name: 'Department Manager',
                email: 'manager@company.com',
                permissions: {
                    canManageUsers: true,  // Managers can manage users (but only user role)
                    canEditAllSections: false,
                    canDeleteResources: true,
                    canViewAuditLog: false,
                    canManageRoles: false,  // Cannot change roles, only manage users
                    canAssignSections: false,
                    canManagePermissions: false,
                    canManageUserRole: true,  // Can manage users with user role
                    canManageManagerRole: false,  // Cannot manage other managers
                    canManageAdminRole: false,  // Cannot manage admins
                    sections: ['costing', 'supply-planning', 'operations', 'quality'], // 4 sections for managers
                    editableSections: ['costing', 'supply-planning', 'operations', 'quality'] // Can edit these sections
                },
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                username: 'user',
                password: 'user123',
                role: 'user',
                name: 'Regular User',
                email: 'user@company.com',
                permissions: {
                    canManageUsers: false,
                    canEditAllSections: false,
                    canDeleteResources: false,
                    canViewAuditLog: false,
                    canManageRoles: false,
                    canAssignSections: false,
                    canManagePermissions: false,
                    sections: ['costing', 'supply-planning'], // Default access to 2 sections
                    editableSections: [] // Cannot edit anything
                },
                createdAt: new Date().toISOString()
            }
        ];

        const stored = localStorage.getItem('hubUsers');
        if (stored) {
            console.log('Loading users from localStorage:', JSON.parse(stored));
            return JSON.parse(stored);
        } else {
            console.log('No stored users found, creating default users');
            localStorage.setItem('hubUsers', JSON.stringify(defaultUsers));
            return defaultUsers;
        }
    }

    handleLogin() {
        const identifierRaw = document.getElementById('username').value || '';
        const identifier = identifierRaw.trim();
        const lowered = identifier.toLowerCase();
        const password = (document.getElementById('password').value || '').trim();

        // ALWAYS reload users from localStorage to get the latest permissions
        this.users = this.loadUsers();
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
        // Reload current users
        this.users = this.loadUsers();
        if (this.users.find(u => u.email && u.email.toLowerCase() === email)) {
            this.showMessage('Email already registered', 'error');
            return;
        }
        const nextId = (this.users.reduce((m,u) => Math.max(m, u.id || 0), 0) + 1) || Date.now();
        // Default permissions: view-only to visible sections
        let visibleSections = [];
        try {
            const savedOrder = localStorage.getItem('sectionOrder');
            if (savedOrder) {
                visibleSections = JSON.parse(savedOrder).filter(s => s.visible !== false).map(s => s.id);
            }
        } catch (_) {}
        if (visibleSections.length === 0) {
            visibleSections = ['costing','supply-planning','operations','quality','hr','it','sales','compliance'];
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
        try {
            if (window.hubDatabase && hubDatabase.saveUser) {
                await hubDatabase.saveUser(newUser);
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
