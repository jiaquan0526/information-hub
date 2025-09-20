// Information Hub - Main JavaScript File
class InformationHub {
    constructor() {
        this.currentUser = null;
        this.sections = {
            'costing': {
                name: 'Costing',
                icon: 'fas fa-calculator',
                color: '#4CAF50',
                playbooks: [],
                boxLinks: [],
                dashboards: []
            },
            'supply-planning': {
                name: 'Supply Planning',
                icon: 'fas fa-truck',
                color: '#2196F3',
                playbooks: [],
                boxLinks: [],
                dashboards: []
            },
            'operations': {
                name: 'Operations',
                icon: 'fas fa-cogs',
                color: '#FF9800',
                playbooks: [],
                boxLinks: [],
                dashboards: []
            },
            'quality': {
                name: 'Quality Management',
                icon: 'fas fa-check-circle',
                color: '#9C27B0',
                playbooks: [],
                boxLinks: [],
                dashboards: []
            },
            'hr': {
                name: 'Human Resources',
                icon: 'fas fa-users',
                color: '#E91E63',
                playbooks: [],
                boxLinks: [],
                dashboards: []
            },
            'it': {
                name: 'IT & Technology',
                icon: 'fas fa-laptop-code',
                color: '#607D8B',
                playbooks: [],
                boxLinks: [],
                dashboards: []
            },
            'sales': {
                name: 'Sales & Marketing',
                icon: 'fas fa-chart-line',
                color: '#795548',
                playbooks: [],
                boxLinks: [],
                dashboards: []
            },
            'compliance': {
                name: 'Compliance & Legal',
                icon: 'fas fa-gavel',
                color: '#F44336',
                playbooks: [],
                boxLinks: [],
                dashboards: []
            }
        };
        
        this.currentSection = null;
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.loadData();
        this.bindEvents();
        this.addSampleData();
        this.updateUserInterface();
        // Track hub page session
        this.hubSessionStartMs = Date.now();
        try {
            if (window.hubDatabase && hubDatabase.saveActivity && this.currentUser) {
                hubDatabase.saveActivity({
                    id: Date.now().toString(),
                    userId: this.currentUser.id,
                    username: this.currentUser.username,
                    action: 'OPEN_HUB',
                    description: 'Opened hub page',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (_) {}
        this._hubSessionLogged = false;
        this.setupHubSessionLogging();
    }

    checkAuthentication() {
        const session = localStorage.getItem('hubSession');
        if (!session) {
            window.location.href = 'auth.html';
            return;
        }
        
        const sessionData = JSON.parse(session);
        this.currentUser = sessionData;
    }

    updateUserInterface() {
        if (!this.currentUser) return;

        // Update user info in header (guard if elements not yet in DOM)
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = this.currentUser.username;
        const userRoleEl = document.getElementById('userRole');
        if (userRoleEl) userRoleEl.textContent = this.currentUser.role;

        // Show/hide admin panel button
        const adminBtn = document.getElementById('adminPanelBtn');
        if (adminBtn && this.currentUser.permissions && this.currentUser.permissions.canManageUsers) {
            adminBtn.style.display = 'inline-flex';
        }

        // Show/hide export button for admins/managers only
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            const role = (this.currentUser.role || '').toLowerCase();
            if (role === 'admin' || role === 'manager') {
                exportBtn.style.display = 'inline-flex';
            } else {
                exportBtn.style.display = 'none';
            }
        }

        // Show/hide reshuffle backgrounds button for admins only
        const reshuffleBtn = document.getElementById('reshuffleBackgroundsBtn');
        if (reshuffleBtn) {
            const role = (this.currentUser.role || '').toLowerCase();
            reshuffleBtn.style.display = (role === 'admin') ? 'inline-flex' : 'none';
        }

        // Update hub cards with access restrictions
        this.updateHubCardsAccess();
    }

    updateHubCardsAccess() {
        const hubCards = document.querySelectorAll('.hub-card');
        hubCards.forEach(card => {
            const sectionId = card.onclick.toString().match(/navigateToSection\('([^']+)'\)/)[1];
            if (!this.currentUser.permissions.sections.includes(sectionId)) {
                card.classList.add('restricted');
                card.onclick = () => {
                    this.showMessage('You do not have access to this section', 'error');
                };
            }
        });
    }

    bindEvents() {
        // Quick action buttons
        window.showAllSections = () => this.showAllSections();
        window.searchAcrossHub = () => this.searchAcrossHub();
        window.showRecentActivity = () => this.showRecentActivity();
        
        // Navigation
        window.navigateToSection = (sectionId) => this.navigateToSection(sectionId);
        window.goBackToHub = () => this.goBackToHub();
        
        // User management
        window.showUserProfile = () => this.showUserProfile();
        window.showAdminPanel = () => this.showAdminPanel();
        window.closeModal = (modalId) => this.closeModal(modalId);
        window.switchAdminTab = (tabName) => this.switchAdminTab(tabName);
        window.addUser = () => this.addUser();
    }

    setupHubSessionLogging() {
        const logClose = () => {
            if (this._hubSessionLogged) return;
            this._hubSessionLogged = true;
            const durationMs = Date.now() - (this.hubSessionStartMs || Date.now());
            try {
                if (window.hubDatabase && hubDatabase.saveActivity && this.currentUser) {
                    hubDatabase.saveActivity({
                        id: Date.now().toString(),
                        userId: this.currentUser.id,
                        username: this.currentUser.username,
                        action: 'CLOSE_HUB',
                        description: `Closed hub page after ${Math.round(durationMs/1000)}s`,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (_) {}
        };
        window.addEventListener('beforeunload', logClose);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) logClose();
        });
    }

    // Navigation Functions
    navigateToSection(sectionId) {
        // Store the current section in localStorage for the section page
        localStorage.setItem('currentSection', sectionId);

        // Attempt to record hub card click (non-blocking)
        try {
            const user = this.currentUser;
            if (window.hubDatabase && hubDatabase.saveActivity && user) {
                hubDatabase.saveActivity({
                    id: Date.now().toString(),
                    userId: user.id,
                    username: user.username,
                    action: 'CLICK_HUB_CARD',
                    description: `Opened section ${sectionId} from hub`,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (_) {}

        // Navigate to a dedicated section page
        window.location.href = `section.html?section=${sectionId}`;
    }

    bindSectionEvents() {
        // Tab switching
        window.switchTab = (tabName) => this.switchTab(tabName);
        
        // Search and filter
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterResources());
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterResources());
        }
        
        // Add resource
        window.addResource = (type) => this.addResource(type);
        
        // Back to hub
        window.goBackToHub = () => this.goBackToHub();
    }

    switchTab(tabName) {
        // Update tab appearance
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');

        // Show/hide content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${tabName}-section`).classList.add('active');

        // Render the appropriate content
        this.renderCurrentSection();
    }

    renderCurrentSection() {
        const activeTab = document.querySelector('.nav-tab.active');
        if (!activeTab) return;

        const tabName = activeTab.onclick.toString().match(/switchTab\('([^']+)'\)/)[1];
        this.renderResources(tabName);
    }

    renderResources(type) {
        const gridId = `${type.replace('-', '-')}-grid`;
        const grid = document.getElementById(gridId);
        const emptyState = document.getElementById('emptyState');
        
        if (!grid) return;

        const resources = this.sections[this.currentSection][type.replace('-', '')];
        const filteredResources = this.getFilteredResources(resources);

        if (filteredResources.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        emptyState.style.display = 'none';

        grid.innerHTML = filteredResources.map(resource => this.createResourceCard(resource, type)).join('');
    }

    createResourceCard(resource, type) {
        const typeLabels = {
            'playbooks': 'PLAYBOOK',
            'box-links': 'BOX LINK',
            'dashboards': 'DASHBOARD'
        };

        return `
            <div class="resource-card" data-id="${resource.id}">
                <div class="resource-header">
                    <div>
                        <h3 class="resource-title">${this.escapeHtml(resource.title)}</h3>
                    </div>
                    <div class="resource-type">${typeLabels[type]}</div>
                </div>
                
                ${resource.description ? `<p class="resource-description">${this.escapeHtml(resource.description)}</p>` : ''}
                
                <a href="${resource.url}" target="_blank" rel="noopener noreferrer" class="resource-url">
                    <i class="fas fa-external-link-alt"></i> ${this.escapeHtml(resource.url)}
                </a>
                
                <div class="resource-meta">
                    ${resource.tags && resource.tags.length > 0 ? `
                        <div class="resource-tags">
                            ${resource.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="resource-footer">
                    <span>Added: ${new Date(resource.createdAt).toLocaleDateString()}</span>
                    <div>
                        <button class="action-btn edit-btn" onclick="editResource('${type}', '${resource.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteResource('${type}', '${resource.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getFilteredResources(resources) {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';

        return resources.filter(resource => {
            const matchesSearch = !searchTerm || 
                resource.title.toLowerCase().includes(searchTerm) ||
                resource.description.toLowerCase().includes(searchTerm) ||
                (resource.tags && resource.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
                resource.url.toLowerCase().includes(searchTerm);

            const matchesCategory = !categoryFilter || resource.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }

    filterResources() {
        this.renderCurrentSection();
    }

    // Resource Management
    addResource(type) {
        const title = prompt(`Enter ${type.replace('-', ' ')} title:`);
        if (!title) return;

        const description = prompt(`Enter description (optional):`);
        const url = prompt(`Enter URL:`);
        if (!url) return;

        const tags = prompt(`Enter tags (comma-separated, optional):`);

        const resource = {
            id: Date.now().toString(),
            title: title,
            description: description || '',
            url: url,
            tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            category: 'process',
            createdAt: new Date().toISOString()
        };

        const resourceType = type.replace('-', '');
        this.sections[this.currentSection][resourceType].unshift(resource);
        this.saveData();
        this.renderCurrentSection();
        this.showMessage(`${type.replace('-', ' ')} added successfully!`, 'success');
    }

    editResource(type, id) {
        const resourceType = type.replace('-', '');
        const resource = this.sections[this.currentSection][resourceType].find(r => r.id === id);
        if (!resource) return;

        const newTitle = prompt('Enter new title:', resource.title);
        if (newTitle === null) return;

        const newDescription = prompt('Enter new description:', resource.description);
        const newUrl = prompt('Enter new URL:', resource.url);
        if (!newUrl) return;

        const newTags = prompt('Enter new tags (comma-separated):', resource.tags.join(', '));

        resource.title = newTitle;
        resource.description = newDescription || '';
        resource.url = newUrl;
        resource.tags = newTags ? newTags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        resource.updatedAt = new Date().toISOString();

        this.saveData();
        this.renderCurrentSection();
        this.showMessage(`${type.replace('-', ' ')} updated successfully!`, 'success');
    }

    deleteResource(type, id) {
        if (!confirm('Are you sure you want to delete this resource?')) return;

        const resourceType = type.replace('-', '');
        this.sections[this.currentSection][resourceType] = this.sections[this.currentSection][resourceType].filter(r => r.id !== id);
        this.saveData();
        this.renderCurrentSection();
        this.showMessage(`${type.replace('-', ' ')} deleted successfully!`, 'success');
    }

    // Utility Functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        const container = document.querySelector('.container');
        container.insertBefore(messageDiv, container.firstChild);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // Data Management
    saveData() {
        localStorage.setItem('informationHub', JSON.stringify(this.sections));
    }

    loadData() {
        const stored = localStorage.getItem('informationHub');
        if (stored) {
            const loadedSections = JSON.parse(stored);
            Object.keys(loadedSections).forEach(key => {
                if (this.sections[key]) {
                    this.sections[key] = { ...this.sections[key], ...loadedSections[key] };
                }
            });
        }
    }

    // Quick Actions
    showAllSections() {
        alert('All sections view - This would show a comprehensive list of all resources across all sections.');
    }

    searchAcrossHub() {
        const searchTerm = prompt('Enter search term:');
        if (searchTerm) {
            alert(`Searching for "${searchTerm}" across all sections...`);
        }
    }

    showRecentActivity() {
        alert('Recent activity - This would show recently added or modified resources.');
    }

    goBackToHub() {
        location.reload();
    }

    // Sample Data
    addSampleData() {
        // Start blank by default. Only seed example if no data anywhere.
        try {
            const anyLocal = localStorage.getItem('informationHub');
            const anySectionOrder = localStorage.getItem('sectionOrder');
            if (anyLocal || anySectionOrder) return;
        } catch (_) {}
        // Optional: Seed a tiny example dataset in the single example section if present
        if (this.sections['example']) {
            this.addSampleDataForSection('example');
            this.saveData();
        }
    }

    addSampleDataForSection(sectionId) {
        const section = this.sections[sectionId];
        
        // Sample playbooks
        const samplePlaybooks = this.getSamplePlaybooks(sectionId);
        section.playbooks = samplePlaybooks.map(r => ({ ...r, id: r.id || `${sectionId}:playbooks:${Date.now()}:${Math.random().toString(36).slice(2)}` }));

        // Sample box links
        const sampleBoxLinks = this.getSampleBoxLinks(sectionId);
        section.boxLinks = sampleBoxLinks.map(r => ({ ...r, id: r.id || `${sectionId}:boxLinks:${Date.now()}:${Math.random().toString(36).slice(2)}` }));

        // Sample dashboards
        const sampleDashboards = this.getSampleDashboards(sectionId);
        section.dashboards = sampleDashboards.map(r => ({ ...r, id: r.id || `${sectionId}:dashboards:${Date.now()}:${Math.random().toString(36).slice(2)}` }));
    }

    getSamplePlaybooks(sectionId) {
        const playbookTemplates = {
            'example': [
                { title: 'Getting Started Guide', description: 'How to add your first resources', url: 'https://example.com/getting-started', tags: ['onboarding','setup'] }
            ]
        };

        return (playbookTemplates[sectionId] || []).map(playbook => ({
            ...playbook,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            category: 'process',
            createdAt: new Date().toISOString()
        }));
    }

    getSampleBoxLinks(sectionId) {
        const boxLinkTemplates = {
            'example': [
                { title: 'Company Docs Folder', description: 'Place to store your team docs', url: 'https://box.com/', tags: ['storage','docs'] }
            ]
        };

        return (boxLinkTemplates[sectionId] || []).map(link => ({
            ...link,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            category: 'process',
            createdAt: new Date().toISOString()
        }));
    }

    getSampleDashboards(sectionId) {
        const dashboardTemplates = {
            'example': [
                { title: 'Starter Dashboard', description: 'A placeholder dashboard link', url: 'https://dashboard.example.com', tags: ['starter'] }
            ]
        };

        return (dashboardTemplates[sectionId] || []).map(dashboard => ({
            ...dashboard,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            category: 'process',
            createdAt: new Date().toISOString()
        }));
    }

    // User Management Functions
    showUserProfile() {
        const user = this.currentUser;
        if (!user) return;

        document.getElementById('profileName').textContent = user.name || user.username;
        document.getElementById('profileUsername').textContent = user.username;
        document.getElementById('profileRole').textContent = user.role;
        document.getElementById('profileEmail').textContent = user.email || 'Not provided';
        
        const sectionsList = document.getElementById('profileSections');
        sectionsList.innerHTML = user.permissions.sections.map(section => 
            `<span class="tag">${section.replace('-', ' ')}</span>`
        ).join('');

        document.getElementById('userProfileModal').style.display = 'block';
    }

    showAdminPanel() {
        if (!this.currentUser.permissions.canManageUsers) {
            this.showMessage('You do not have permission to access the admin panel', 'error');
            return;
        }

        this.loadUsersList();
        this.loadAuditLog();
        document.getElementById('adminPanelModal').style.display = 'block';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    switchAdminTab(tabName) {
        // Update tab appearance
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');

        // Show/hide content sections
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load specific tab content
        if (tabName === 'users') {
            this.loadUsersList();
        } else if (tabName === 'audit') {
            this.loadAuditLog();
        } else if (tabName === 'export') {
            this.loadExportOptions();
        }
    }

    loadUsersList() {
        const users = JSON.parse(localStorage.getItem('hubUsers') || '[]');
        const usersList = document.getElementById('usersList');
        
        usersList.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-details-info">
                    <div class="name">${user.name || user.username}</div>
                    <div class="role">${user.role}</div>
                    <div class="sections">Access: ${user.permissions.sections.length} sections</div>
                </div>
                <div class="user-item-actions">
                    <button class="btn btn-secondary" onclick="editUser(${user.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteUser(${user.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    loadAuditLog() {
        const activities = JSON.parse(localStorage.getItem('hubActivities') || '[]');
        const auditLog = document.getElementById('auditLog');
        
        auditLog.innerHTML = activities.map(activity => `
            <div class="audit-entry">
                <div class="audit-info">
                    <div class="audit-user">${activity.username}</div>
                    <div class="audit-action">${activity.action}</div>
                    <div class="audit-description">${activity.description}</div>
                </div>
                <div class="audit-time">${new Date(activity.timestamp).toLocaleString()}</div>
            </div>
        `).join('');
    }

    addUser() {
        const username = prompt('Enter username:');
        if (!username) return;

        const password = prompt('Enter password:');
        if (!password) return;

        const name = prompt('Enter full name:');
        const email = prompt('Enter email:');
        const role = prompt('Enter role (admin/manager/user):');
        
        if (!['admin', 'manager', 'user'].includes(role)) {
            this.showMessage('Invalid role. Must be admin, manager, or user', 'error');
            return;
        }

        const newUser = {
            id: Date.now(),
            username: username,
            password: password,
            name: name || username,
            email: email || '',
            role: role,
            permissions: this.getDefaultPermissions(role),
            createdAt: new Date().toISOString()
        };

        const users = JSON.parse(localStorage.getItem('hubUsers') || '[]');
        users.push(newUser);
        localStorage.setItem('hubUsers', JSON.stringify(users));
        try {
            if (window.hubDatabase && hubDatabase.saveUser) {
                hubDatabase.saveUser(newUser);
            }
        } catch (_) {}

        // Refresh export users dropdown if visible
        try { this.loadExportOptions(); } catch (_) {}

        this.loadUsersList();
        this.showMessage('User added successfully', 'success');
        this.logActivity('CREATE_USER', `Created user: ${username}`);
    }

    getDefaultPermissions(role) {
        const permissions = {
            'admin': {
                canManageUsers: true,
                canEditAllSections: true,
                canDeleteResources: true,
                canViewAuditLog: true,
                canManageRoles: true,
                sections: ['costing', 'supply-planning', 'operations', 'quality', 'hr', 'it', 'sales', 'compliance']
            },
            'manager': {
                canManageUsers: false,
                canEditAllSections: false,
                canDeleteResources: true,
                canViewAuditLog: false,
                canManageRoles: false,
                sections: ['costing', 'supply-planning', 'operations', 'quality']
            },
            'user': {
                canManageUsers: false,
                canEditAllSections: false,
                canDeleteResources: false,
                canViewAuditLog: false,
                canManageRoles: false,
                sections: ['costing', 'supply-planning']
            }
        };
        return permissions[role] || permissions['user'];
    }

    logActivity(action, description) {
        const user = this.currentUser;
        if (!user) return;

        const activity = {
            id: Date.now().toString(),
            userId: user.id,
            username: user.username,
            action: action,
            description: description,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
        };

        const activities = JSON.parse(localStorage.getItem('hubActivities') || '[]');
        activities.unshift(activity);
        
        if (activities.length > 1000) {
            activities.splice(1000);
        }
        
        localStorage.setItem('hubActivities', JSON.stringify(activities));
    }

    // Export Functions
    async loadExportOptions() {
        // Load users for export dropdown
        let users = [];
        try { users = await hubDatabase.getAllUsers(); } catch (_) { users = []; }
        try {
            const lsUsers = JSON.parse(localStorage.getItem('hubUsers') || '[]');
            const byId = new Map((users || []).map(u => [u.id, u]));
            lsUsers.forEach(u => { if (!byId.has(u.id)) byId.set(u.id, u); });
            users = Array.from(byId.values());
        } catch (_) {}
        const userSelect = document.getElementById('userExportSelect');
        userSelect.innerHTML = '<option value="">Select User</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.username} (${user.role})`;
            userSelect.appendChild(option);
        });
    }

    // Global export functions
    window.exportAllData = async () => {
        try {
            this.showMessage('Preparing export...', 'success');
            const result = await excelExporter.exportToExcel();
            if (result.success) {
                this.showMessage(`Export completed! File: ${result.fileName}`, 'success');
                this.logActivity('EXPORT', `Exported all data - ${result.fileName}`);
            } else {
                this.showMessage(`Export failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`Export failed: ${error.message}`, 'error');
        }
    };

    window.exportSectionData = async () => {
        const sectionId = document.getElementById('sectionExportSelect').value;
        if (!sectionId) {
            this.showMessage('Please select a section', 'error');
            return;
        }

        try {
            this.showMessage('Preparing section export...', 'success');
            const result = await excelExporter.exportSectionToExcel(sectionId);
            if (result.success) {
                this.showMessage(`Section export completed! File: ${result.fileName}`, 'success');
                this.logActivity('EXPORT', `Exported section data - ${result.sectionName}`);
            } else {
                this.showMessage(`Export failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`Export failed: ${error.message}`, 'error');
        }
    };

    window.exportUserData = async () => {
        const userId = document.getElementById('userExportSelect').value;
        if (!userId) {
            this.showMessage('Please select a user', 'error');
            return;
        }

        try {
            this.showMessage('Preparing user data export...', 'success');
            const result = await excelExporter.exportUserDataToExcel(parseInt(userId));
            if (result.success) {
                this.showMessage(`User data export completed! File: ${result.fileName}`, 'success');
                this.logActivity('EXPORT', `Exported user data - ${result.username}`);
            } else {
                this.showMessage(`Export failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`Export failed: ${error.message}`, 'error');
        }
    };

    window.exportAuditLog = async () => {
        try {
            this.showMessage('Preparing audit log export...', 'success');
            const activities = await hubDatabase.getActivities();
            
            // Create workbook
            const workbook = XLSX.utils.book_new();
            const activityData = activities.map(activity => ({
                'ID': activity.id,
                'User ID': activity.userId,
                'Username': activity.username,
                'Action': activity.action,
                'Description': activity.description,
                'Timestamp': new Date(activity.timestamp).toLocaleString(),
                'IP Address': activity.ip || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(activityData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Log');

            const fileName = `Audit_Log_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            this.showMessage(`Audit log export completed! File: ${fileName}`, 'success');
            this.logActivity('EXPORT', 'Exported audit log');
        } catch (error) {
            this.showMessage(`Export failed: ${error.message}`, 'error');
        }
    };

    // JSON Backup/Restore (raw)
    window.backupJson = async () => {
        try {
            let raw;
            try {
                if (window.hubDatabase && hubDatabase.exportRawState) {
                    raw = await hubDatabase.exportRawState();
                }
            } catch (_) {}

            if (!raw) {
                // Fallback to localStorage-only backup
                let local = {};
                try {
                    local = {
                        sectionOrder: JSON.parse(localStorage.getItem('sectionOrder') || 'null'),
                        hubUsers: JSON.parse(localStorage.getItem('hubUsers') || 'null'),
                        informationHub: JSON.parse(localStorage.getItem('informationHub') || 'null'),
                        hubActivities: JSON.parse(localStorage.getItem('hubActivities') || 'null')
                    };
                } catch (_) {}
                raw = { users: [], sections: [], resources: [], activities: [], views: [], exportDate: new Date().toISOString(), localStorage: local };
            }

            const blob = new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Information_Hub_Backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            this.showMessage('Backup downloaded', 'success');
        } catch (error) {
            this.showMessage(`Backup failed: ${error.message}`, 'error');
        }
    };

    window.restoreJson = async () => {
        try {
            if (!window.hubDatabase || !hubDatabase.importRawState) throw new Error('Database not ready');
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = async () => {
                const file = input.files && input.files[0];
                if (!file) return;
                const text = await file.text();
                const json = JSON.parse(text);
                await hubDatabase.importRawState(json);
                updateMainHubSections();
                this.showMessage('Restore completed', 'success');
            };
            input.click();
        } catch (error) {
            this.showMessage(`Restore failed: ${error.message}`, 'error');
        }
    };
}

// Initialize the application (once)
let informationHub;
function initInformationHubOnce() {
	if (informationHub && informationHub instanceof InformationHub) return;
	informationHub = new InformationHub();
	// Export for global access
	window.informationHub = informationHub;
}
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initInformationHubOnce);
} else {
	initInformationHubOnce();
}
