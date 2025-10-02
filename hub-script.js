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
            },
            'test-section': {
                name: 'Test Section',
                icon: 'fas fa-test',
                color: '#007bff',
                playbooks: [],
                boxLinks: [],
                dashboards: []
            }
        };
        
        this.currentSection = null;
        this.init();
    }

    async init() {
        console.log('InformationHub init started');
        
        // Add a small delay to ensure Supabase client is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const authResult = await this.checkAuthentication();
        if (!authResult) {
            console.log('Authentication failed, stopping initialization');
            // If authentication failed, user will be redirected to auth.html
            return;
        }
        
        console.log('Authentication successful, continuing initialization');
        await this.loadData();
        this.bindEvents();
        // Start blank by default; no sample data seeding
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
        // Auto-refresh from Supabase database
        try { this.setupSupabaseAutoRefresh(); } catch (_) {}
        
        console.log('InformationHub init completed');
    }

    async checkAuthentication() {
        console.log('=== Starting authentication check ===');
        
        // Wait for Supabase client to be ready
        let retries = 0;
        const maxRetries = 50; // 5 seconds max wait
        
        while (retries < maxRetries && !window.supabaseClient) {
            console.log('Waiting for Supabase client...', retries + 1);
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (!window.supabaseClient) {
            console.error('Supabase client not available after waiting');
            console.log('Redirecting to auth due to missing Supabase client');
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 1000);
            return false;
        }
        
        console.log('Supabase client is ready, checking authentication...');
        
        // Get current user from Supabase auth only
        try {
            // Use getSession with brief retries to allow session restoration
            let user = null, error = null;
            try {
                const { data: s1, error: e1 } = await window.supabaseClient.auth.getSession();
                user = s1 && s1.session && s1.session.user ? s1.session.user : null;
                error = e1 || null;
            } catch (_) {}
            if (!user) {
                let tries = 0;
                while (tries < 30 && !user) { // ~3s
                    await new Promise(r => setTimeout(r, 100));
                    try {
                        const { data: s2 } = await window.supabaseClient.auth.getSession();
                        user = s2 && s2.session && s2.session.user ? s2.session.user : null;
                    } catch (_) {}
                    tries++;
                }
            }
            console.log('Auth check result:', { user: user ? user.email : 'null', error: error ? error.message : 'none' });
            
            if (error) {
                console.error('Auth error:', error);
                console.log('Redirecting to auth due to auth error');
                setTimeout(() => {
                    window.location.href = 'auth.html';
                }, 1000);
                return false;
            }
            
            if (!user) {
                console.log('No authenticated user found');
                console.log('Redirecting to auth due to no user');
                setTimeout(() => {
                    window.location.href = 'auth.html';
                }, 1000);
                return false;
            }
            
            console.log('✅ User authenticated successfully:', user.email);
            
            // Try to get user profile from database, but don't fail if it doesn't exist
            try {
                const { data: profile, error: profileError } = await window.supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                if (profileError) {
                    console.warn('Profile not found, creating default user:', profileError.message);
                    // Create a basic user object if profile doesn't exist
                    this.currentUser = {
                        id: user.id,
                        username: user.email,
                        email: user.email,
                        role: undefined,
                        permissions: undefined
                    };
                } else {
                    console.log('Profile found:', profile);
                    this.currentUser = {
                        id: user.id,
                        username: profile.username || user.email,
                        email: user.email,
                        name: profile.name,
                        role: profile.role,
                        permissions: profile.permissions
                    };
                }
            } catch (profileError) {
                console.warn('Error fetching profile, using default user:', profileError);
                // Create a basic user object if profile fetch fails
                this.currentUser = {
                    id: user.id,
                    username: user.email,
                    email: user.email,
                    role: undefined,
                    permissions: undefined
                };
            }
            
            console.log('Current user set:', this.currentUser);
            return true;
            
        } catch (error) {
            console.error('Authentication check failed:', error);
            window.location.href = 'auth.html';
            return false;
        }
    }

    updateUserInterface() {
        if (!this.currentUser) return;

        // Update user info in header (guard if elements not yet in DOM)
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = this.currentUser.username;
        const userRoleEl = document.getElementById('userRole');
        if (userRoleEl) userRoleEl.textContent = this.currentUser.role;

        // Show/hide admin panel button (role-based OR permission flag)
        const adminBtn = document.getElementById('adminPanelBtn');
        if (adminBtn) {
            const role = String(this.currentUser.role || '').toLowerCase();
            const canManage = !!(this.currentUser.permissions && this.currentUser.permissions.canManageUsers);
            adminBtn.style.display = (role === 'admin' || canManage) ? 'inline-flex' : 'none';
        }

        // Show/hide export button for admins/managers only
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            const role = (this.currentUser.role || '').toLowerCase();
            if (role === 'admin' || role === 'editor') {
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

        // Update hub cards with access restrictions immediately
        this.updateHubCardsAccess();
        try { if (typeof updateMainHubSections === 'function') updateMainHubSections(); } catch (_) {}
    }

    updateHubCardsAccess() {
        const hubCards = document.querySelectorAll('.hub-card');
        hubCards.forEach(card => {
            const sectionId = card.onclick.toString().match(/navigateToSection\('([^']+)'\)/)[1];
            // For now, allow access to all sections - remove restrictions
            // const allowed = (this.currentUser && this.currentUser.permissions && Array.isArray(this.currentUser.permissions.sections)) ? this.currentUser.permissions.sections : [];
            // if (!allowed.includes(sectionId)) {
            //     card.classList.add('restricted');
            //     card.onclick = () => {
            //         this.showMessage('You do not have access to this section', 'error');
            //     };
            // }
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

    setupGitHubAutoRefresh() {
        if (this._ghHubTimer) try { clearInterval(this._ghHubTimer); } catch(_) {}
        const refresh = async () => {
            try {
                if (document.hidden) return;
                // If admin panel export tab is open, refresh the dropdowns
                try { if (document.getElementById('adminPanelModal')?.style.display === 'block') await this.loadExportOptions(); } catch(_) {}
                // Optionally refresh visible hub cards if they depend on sectionOrder names (left local/local)
                try { if (typeof updateMainHubSections === 'function') updateMainHubSections(); } catch(_) {}
                // Data is automatically synced to Supabase database
                // No manual sync needed
            } catch (_) {}
        };
        setTimeout(refresh, 2000);
        this._ghHubTimer = setInterval(refresh, 60000);
        window.addEventListener('beforeunload', () => { try { clearInterval(this._ghHubTimer); } catch(_) {} });
        document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => refresh().catch(()=>{}), 250); });
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
    async navigateToSection(sectionId) {
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

        // Build URL with ephemeral auth tokens to avoid storage
        let at = '', rt = '';
        try {
            if (window.supabaseClient && window.supabaseClient.auth) {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                at = session && session.access_token ? encodeURIComponent(session.access_token) : '';
                rt = session && session.refresh_token ? encodeURIComponent(session.refresh_token) : '';
            }
        } catch (_) {}
        const q = [`section=${encodeURIComponent(sectionId)}`];
        if (at) q.push(`access_token=${at}`, `token_type=bearer`);
        if (rt) q.push(`refresh_token=${rt}`);
        const targetUrl = `section.html?${q.join('&')}`;

        // Navigate to a dedicated section page with a smooth transition
        const go = () => { window.location.href = targetUrl; };
        try {
            if (document.startViewTransition) {
                document.startViewTransition(() => go());
            } else {
                const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                if (!prefersReduced) {
                    document.body.classList.add('fade-out');
                    setTimeout(go, 150);
                } else {
                    go();
                }
            }
        } catch (_) { go(); }
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
                    <span>Added: ${formatUserTZ(resource.createdAt, true)}</span>
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

        // Create new message (fixed position so it's above overlays/modals)
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        try {
            messageDiv.style.position = 'fixed';
            messageDiv.style.top = '12px';
            messageDiv.style.left = '50%';
            messageDiv.style.transform = 'translateX(-50%)';
            messageDiv.style.zIndex = '10006';
            messageDiv.style.padding = '10px 14px';
            messageDiv.style.borderRadius = '8px';
            messageDiv.style.background = type === 'error' ? '#fff5f5' : (type === 'success' ? '#edfdf2' : '#f6f9ff');
            messageDiv.style.border = '1px solid ' + (type === 'error' ? '#ffd6d6' : (type === 'success' ? '#d1fadf' : '#dbe7ff'));
            messageDiv.style.color = type === 'error' ? '#8a1f1f' : (type === 'success' ? '#034d2a' : '#1b3a6b');
            messageDiv.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
        } catch (_) {}
        document.body.appendChild(messageDiv);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            try { messageDiv.remove(); } catch(_) {}
        }, 3000);
    }

    // Data Management
    saveData() {
        // Data is automatically saved to Supabase database
        // No manual save needed
    }

    async loadData() {
        // Load sections from Supabase
        try {
            if (window.hubDatabase && window.hubDatabaseReady) {
                const sections = await window.hubDatabase.getAllSections();
                if (sections && sections.length > 0) {
                    // Clear existing sections and load from Supabase
                    this.sections = {};
                    sections.forEach(section => {
                        this.sections[section.section_id] = {
                            name: section.name,
                            icon: section.icon,
                            color: section.color,
                            playbooks: [],
                            boxLinks: [],
                            dashboards: []
                        };
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load sections from Supabase:', error);
        }

        // No fallback needed - Supabase is the primary data source
    }

    // Quick Actions
    showAllSections() {
        alert('All sections view - This would show a comprehensive list of all resources across all sections.');
        try { this.logActivity('VIEW_ALL_SECTIONS', 'Viewed all sections'); } catch(_) {}
    }

    searchAcrossHub() {
        const searchTerm = prompt('Enter search term:');
        if (searchTerm) {
            alert(`Searching for "${searchTerm}" across all sections...`);
            try { this.logActivity('SEARCH', `Searched hub: ${String(searchTerm).slice(0,200)}`); } catch(_) {}
        }
    }

    showRecentActivity() {
        alert('Recent activity - This would show recently added or modified resources.');
        try { this.logActivity('VIEW_RECENT_ACTIVITY', 'Viewed recent activity'); } catch(_) {}
    }

    goBackToHub() {
        location.reload();
    }

    // Sample Data
    addSampleData() {
        // Start blank by default. Only seed example if no data anywhere.
        // Sample data is managed through Supabase database
        // Optional: Seed a tiny example dataset in the single example section if present
        if (this.sections['example']) {
            this.addSampleDataForSection('example');
            this.saveData();
        }
    }

    addSampleDataForSection(sectionId) {
        const section = this.sections[sectionId];
        // Do not seed any sample content
        section.playbooks = [];
        section.boxLinks = [];
        section.dashboards = [];
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

        document.getElementById('profileName').textContent = user.username || user.email;
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
        // Pre-populate export dropdowns when opening the panel
        try { this.loadExportOptions(); } catch (_) {}
        try { this.logActivity('OPEN_ADMIN_PANEL', 'Opened admin panel'); } catch(_) {}
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        try {
            if (String(modalId) === 'adminPanelModal') this.logActivity('CLOSE_ADMIN_PANEL', 'Closed admin panel');
        } catch(_) {}
    }

    switchAdminTab(tabName) {
        // Update tab appearance (avoid relying on implicit event)
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        try {
            const tabEl = document.querySelector(`.admin-tab[onclick="switchAdminTab('${tabName}')"]`);
            if (tabEl) tabEl.classList.add('active');
        } catch (_) {}

        // Show/hide content sections
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const target = document.getElementById(`${tabName}-tab`);
        if (target) target.classList.add('active');

        // Load specific tab content
        if (tabName === 'users') {
            this.loadUsersList();
        } else if (tabName === 'audit') {
            this.loadAuditLog();
        } else if (tabName === 'export') {
            this.loadExportOptions();
        }
        try { this.logActivity('SWITCH_ADMIN_TAB', `Switched to ${tabName}`); } catch(_) {}
    }

    async loadUsersList() {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;
        try {
            if (!window.supabaseClient) throw new Error('Supabase not initialized');
            const { data, error } = await window.supabaseClient
                .from('profiles')
                .select('id, username, role, name, email, permissions');
            if (error) throw error;
            const users = Array.isArray(data) ? data : [];
            usersList.innerHTML = users.map(user => `
                <div class="user-item">
                    <div class="user-details-info">
                        <div class="name">${this.escapeHtml(user.username || user.email || '')}</div>
                        <div class="role">${this.escapeHtml(user.role || '')}</div>
                        <div class="sections">Access: ${(user.permissions && Array.isArray(user.permissions.sections)) ? user.permissions.sections.length : 0} sections</div>
                    </div>
                    <div class="user-item-actions">
                        <button class="btn btn-secondary" onclick="editUser('${user.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteUser('${user.id}')" title="Disable">
                            <i class="fas fa-user-slash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            usersList.innerHTML = '<div class="user-item">Failed to load users from Supabase.</div>';
        }
    }

    async loadAuditLog() {
        const auditLog = document.getElementById('auditLog');
        if (!auditLog) return;
        auditLog.innerHTML = '<div style="padding:10px;color:#666;">Loading audit log…</div>';
        let offset = 0;
        const pageSize = 500; // larger page size and no hard cap
        const all = [];
        try {
            while (true) {
                const rows = (window.hubDatabase && window.hubDatabaseReady)
                    ? await hubDatabase.getActivities(pageSize, offset)
                    : [];
                if (!Array.isArray(rows) || rows.length === 0) break;
                all.push(...rows);
                if (rows.length < pageSize) break;
                offset += rows.length;
                // No hard cap; rely on pageSize and rows.length to terminate
            }
        } catch (_) {}

        // Direct Supabase fallback: if wrapper returns nothing but table has rows (RLS permitting)
        try {
            if ((all || []).length === 0 && window.supabaseClient) {
                let data = null, err = null;
                // Try order by timestamp
                try {
                    const r1 = await window.supabaseClient
                        .from('activities')
                        .select('*')
                        .order('timestamp', { ascending: false })
                        .limit(pageSize);
                    data = r1.data; err = r1.error;
                } catch (e1) { err = e1; }
                // Fallback order by created_at
                if (err) {
                    try {
                        const r2 = await window.supabaseClient
                            .from('activities')
                            .select('*')
                            .order('created_at', { ascending: false })
                            .limit(pageSize);
                        data = r2.data; err = r2.error;
                    } catch (e2) { err = e2; }
                }
                // Final fallback no order
                if (err) {
                    const r3 = await window.supabaseClient
                        .from('activities')
                        .select('*')
                        .limit(pageSize);
                    data = r3.data; err = r3.error;
                }
                if (!err && Array.isArray(data) && data.length > 0) {
                    // Resolve usernames
                    const ids = Array.from(new Set(data.map(r => r.user_id).filter(Boolean)));
                    let usersById = {};
                    if (ids.length > 0) {
                        try {
                            const pr = await window.supabaseClient
                                .from('profiles')
                                .select('id, username, email')
                                .in('id', ids);
                            (pr.data || []).forEach(p => { usersById[p.id] = p; });
                        } catch (_) {}
                    }
                    data.forEach(r => {
                        const meta = r.metadata || {};
                        const prof = r.user_id ? usersById[r.user_id] : null;
                        all.push({
                            ...r,
                            username: meta.username || (prof && (prof.username || prof.email)) || null,
                            description: meta.description || meta.title || null,
                            title: meta.title || null,
                            section: r.section_id || meta.section || null
                        });
                    });
                }
            }
        } catch (_) {}

        const esc = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; };
        // Populate filters
        try {
            const userSel = document.getElementById('auditUserFilter');
            const actionSel = document.getElementById('auditActionFilter');
            if (userSel) {
                const users = Array.from(new Set((all||[]).map(a => a.username).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b)));
                const current = userSel.value;
                userSel.innerHTML = '<option value="">All Users</option>' + users.map(u => `<option value="${u}">${u}</option>`).join('');
                if (current && users.includes(current)) userSel.value = current;
            }
            if (actionSel) {
                const actions = Array.from(new Set((all||[]).map(a => a.action).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b)));
                const preserved = actionSel.value;
                // Keep existing static options but try to select preserved value
                if (preserved && actions.includes(preserved)) actionSel.value = preserved;
            }
            if (userSel) userSel.onchange = () => this.renderFilteredAudit(all);
            if (actionSel) actionSel.onchange = () => this.renderFilteredAudit(all);
        } catch (_) {}

        const html = (all || []).map(a => {
            const who = esc(a.username || 'Unknown');
            const act = esc(a.action || 'EVENT');
            const desc = esc(a.description || a.title || '');
            const when = (() => {
                try {
                    const t = a.timestamp || a.created_at;
                    return formatUserTZ(t);
                } catch(_) { return ''; }
            })();
            const section = esc(a.section || a.section_id || '');
            return `<div class="audit-entry">
                <div class="audit-info">
                    <div class="audit-user">${who}</div>
                    <div class="audit-action">${act}${section ? ` · ${section}` : ''}</div>
                    <div class="audit-description">${desc}</div>
                </div>
                <div class="audit-time">${esc(when)}</div>
            </div>`;
        }).join('');
        if (html) {
            auditLog.innerHTML = html;
            return;
        }
        auditLog.innerHTML = '<div style="padding:10px;color:#666;">No audit entries. <button class="btn btn-secondary" id="auditDebugBtn" style="margin-left:8px;">Debug: Load Raw</button></div>';
        try {
            const btn = document.getElementById('auditDebugBtn');
            if (btn && window.supabaseClient) {
                btn.onclick = async () => {
                    btn.disabled = true; btn.textContent = 'Loading…';
                    try {
                        let data = null, err = null;
                        try {
                            const r1 = await window.supabaseClient.from('activities').select('*').order('timestamp', { ascending: false }).limit(50);
                            data = r1.data; err = r1.error;
                        } catch (e1) { err = e1; }
                        if (err) {
                            try {
                                const r2 = await window.supabaseClient.from('activities').select('*').order('created_at', { ascending: false }).limit(50);
                                data = r2.data; err = r2.error;
                            } catch (e2) { err = e2; }
                        }
                        if (err) {
                            const r3 = await window.supabaseClient.from('activities').select('*').limit(50);
                            data = r3.data; err = r3.error;
                        }
                        const pre = document.createElement('pre');
                        pre.style.background = '#f8f9fa';
                        pre.style.border = '1px solid #e9ecef';
                        pre.style.borderRadius = '8px';
                        pre.style.padding = '10px';
                        pre.style.whiteSpace = 'pre-wrap';
                        pre.textContent = JSON.stringify({ rows: data || [], hint: 'Raw dump to verify data/columns' }, null, 2);
                        auditLog.innerHTML = '';
                        auditLog.appendChild(pre);
                    } catch (_) {
                        auditLog.innerHTML = '<div style="padding:10px;color:#b00020;">Failed to load raw activities.</div>';
                    }
                };
            }
        } catch (_) {}
    }

    renderFilteredAudit(rows) {
        try {
            const auditLog = document.getElementById('auditLog');
            const userSel = document.getElementById('auditUserFilter');
            const actionSel = document.getElementById('auditActionFilter');
            if (!auditLog) return;
            const u = (userSel && userSel.value) ? String(userSel.value) : '';
            const act = (actionSel && actionSel.value) ? String(actionSel.value) : '';
            const esc = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; };
            const filtered = (rows || []).filter(r => (!u || String(r.username||'') === u) && (!act || String(r.action||'') === act));
            if (filtered.length === 0) { auditLog.innerHTML = '<div style="padding:10px;color:#666;">No entries match the selected filters.</div>'; return; }
            const html = filtered.map(a => {
                const who = esc(a.username || 'Unknown');
                const action = esc(a.action || 'EVENT');
                const desc = esc(a.description || a.title || '');
                const when = (() => { try { const t = a.timestamp || a.created_at; return formatUserTZ(t); } catch(_) { return ''; } })();
                const section = esc(a.section || a.section_id || '');
                return `<div class="audit-entry">
                    <div class="audit-info">
                        <div class="audit-user">${who}</div>
                        <div class="audit-action">${action}${section ? ` · ${section}` : ''}</div>
                        <div class="audit-description">${desc}</div>
                    </div>
                    <div class="audit-time">${esc(when)}</div>
                </div>`;
            }).join('');
            auditLog.innerHTML = html;
        } catch (_) {}
    }

    async addUser() {
        // Prefer in-app panel/modal if available
        try {
            if (typeof window.openAddUserModal === 'function') {
                return window.openAddUserModal();
            }
        } catch (_) {}
        try {
            const modal = document.getElementById('addUserModal');
            if (modal) {
                modal.style.display = 'block';
                return;
            }
        } catch (_) {}

        // Fallback to prompts only if panel is unavailable
        try {
            if (!window.supabaseClient) { this.showMessage('Supabase not initialized', 'error'); return; }
            const email = prompt('Enter email for the new user:');
            if (!email) return;
            const password = prompt('Enter temporary password:');
            if (!password) return;
            const name = prompt('Enter full name (optional):') || '';
            const roleInput = prompt('Enter role (admin/editor/viewer):', 'viewer') || 'viewer';
            const role = ['admin','editor','viewer'].includes(roleInput) ? roleInput : 'viewer';

            const { data: signUpData, error: signUpError } = await window.supabaseClient.auth.signUp({ email, password, options: { data: { name } } });
            if (signUpError) { this.showMessage('Sign up failed: ' + signUpError.message, 'error'); return; }
            const newUserId = signUpData.user ? signUpData.user.id : null;
            if (newUserId) {
                await window.supabaseClient.from('profiles').upsert({ id: newUserId, email, username: email, name, role });
            }
            this.showMessage('User invited/created. If email confirmation is required, ask them to verify.', 'success');
            await this.loadUsersList();
        } catch (e) {
            this.showMessage('Failed to add user', 'error');
        }
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
            'editor': {
                canManageUsers: false,
                canEditAllSections: false,
                canDeleteResources: true,
                canViewAuditLog: false,
                canManageRoles: false,
                sections: ['costing', 'supply-planning', 'operations', 'quality']
            },
            'viewer': {
                canManageUsers: false,
                canEditAllSections: false,
                canDeleteResources: false,
                canViewAuditLog: false,
                canManageRoles: false,
                canViewAllSections: true,
                sections: ['*'],
                editableSections: []
            }
        };
        return permissions[role] || permissions['viewer'];
    }

    async logActivity(action, description) {
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

        // Save activity to Supabase database
        if (window.hubDatabase && window.hubDatabaseReady) {
            await hubDatabase.saveActivity(activity);
        }
    }

    // Export Functions
    async loadExportOptions() {
        // Load users for export dropdown (Supabase profiles)
        const userSelect = document.getElementById('userExportSelect');
        if (userSelect) userSelect.innerHTML = '<option value="">Select User</option>';
        try {
            if (!window.supabaseClient) return;
            const { data, error } = await window.supabaseClient
                .from('profiles')
                .select('id, username, role');
            if (error) throw error;
            const users = Array.isArray(data) ? data : [];
            const me = this.currentUser;
            const myRole = String(me?.role || '').toLowerCase();
            const filtered = users.filter(u => {
                if (myRole === 'admin') return true;
                return String(u.id) === String(me?.userId || me?.id);
            });
            if (userSelect) {
                filtered.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.username || user.id} (${user.role || ''})`;
                    userSelect.appendChild(option);
                });
            }
        } catch (_) {}

        // Load sections for export dropdown (still using GitHub config for names)
        try {
            let sections = [];
            try {
                if (window.hubDatabase && window.hubDatabaseReady) {
                    sections = await hubDatabase.getAllSections();
                }
            } catch (_) { sections = []; }
            const list = (Array.isArray(sections) ? sections : [])
                .map(s => ({ id: s.section_id, sectionId: s.section_id, name: s.name || s.section_id }))
                .sort((a,b) => String(a.name).localeCompare(String(b.name)));
            const secSelect = document.getElementById('sectionExportSelect');
            if (secSelect) {
                secSelect.innerHTML = '<option value="">Select Section</option>';
                list.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.sectionId || s.id;
                    opt.textContent = s.name || s.sectionId || s.id;
                    secSelect.appendChild(opt);
                });
            }
        } catch (_) {}
    }

    // Expose for index.html to call directly
    static async loadExportOptions() {
        try { 
            const hub = new InformationHub();
            await hub.loadExportOptions(); 
        } catch (_) {}
    }
}

let userTimeZone = 'Asia/Shanghai';
try {
    // Prefer browser-reported zone; fallback to CST if unavailable
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && typeof tz === 'string') userTimeZone = tz;
} catch (_) {}
function formatUserTZ(value, dateOnly) {
    try {
        if (!value) return '';
        const opts = dateOnly
            ? { timeZone: userTimeZone, year: 'numeric', month: '2-digit', day: '2-digit' }
            : { timeZone: userTimeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        return new Intl.DateTimeFormat('zh-CN', opts).format(new Date(value));
    } catch (_) { return String(value || ''); }
}

// Global functions for index.html
window.editUser = async (userId) => {
    try {
        if (!window.supabaseClient) { alert('Supabase not initialized'); return; }
        const { data: prof, error } = await window.supabaseClient
            .from('profiles')
            .select('id, username, name, email, role, permissions')
            .eq('id', userId)
            .single();
        if (error) { alert('Failed to load user'); return; }
        // Prefer in-app panel/modal if available
        if (typeof window.showEditUserModal === 'function') {
            return window.showEditUserModal(prof);
        }
        // Fallback to prompts (admin/editor/viewer only)
        const name = prompt('Full name:', prof.name || '') ?? (prof.name || '');
        const roleInput = prompt('Role (admin/editor/viewer):', prof.role || '') || prof.role || '';
        const role = ['admin','editor','viewer'].includes(String(roleInput).toLowerCase()) ? String(roleInput).toLowerCase() : prof.role;
        const perms = prof.permissions || {};
        if (perms.disabled === true) {
            if (confirm('User is disabled. Re-enable this user?')) { delete perms.disabled; }
        }
        const { error: upErr } = await window.supabaseClient
            .from('profiles')
            .update({ name, role, permissions: perms })
            .eq('id', userId);
        if (upErr) { alert('Update failed: ' + upErr.message); return; }
        try { informationHub.showMessage('User updated', 'success'); } catch (_) {}
        try { await informationHub.loadUsersList(); } catch (_) {}
    } catch (e) {
        alert('Edit failed');
    }
};

// Lightweight in-app Edit User panel (used if index.html's implementation isn't available)
if (typeof window.showEditUserModal !== 'function') {
    window.showEditUserModal = function(user) {
        try {
            const existing = document.getElementById('editUserModal');
            if (existing) existing.remove();

            const me = (window.informationHub && informationHub.currentUser) ? informationHub.currentUser : null;
            const isAdmin = String(me?.role || '').toLowerCase() === 'admin';

            const modal = document.createElement('div');
            modal.id = 'editUserModal';
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content edit-user-modal" style="max-width:700px; width:95%;">
                    <div class="modal-header">
                        <h2 style="display:flex;align-items:center;gap:10px;">Edit User <span class="role-badge" style="font-size:12px;padding:4px 8px;border-radius:999px;background:#eef2ff;color:#3f51b5;border:1px solid #dce1ff;">${(user.role?String(user.role).toUpperCase():'').toUpperCase()}</span></h2>
                        <span class="close" onclick="(function(){ const m=document.getElementById('editUserModal'); if(m) m.remove(); })()">&times;</span>
                    </div>
                    <div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:flex-start;">
                        <div class="user-basic-info" style="display:flex;flex-direction:column;gap:10px;">
                            <div class="form-group">
                                <label>Username</label>
                                <input type="text" id="editUserName" value="${user.username || ''}" readonly>
                            </div>
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" id="editUserFullName" value="${user.name || ''}">
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="editUserEmail" value="${user.email || ''}">
                            </div>
                            <div class="form-group">
                                <label>Role</label>
                                <select id="editUserRole" ${isAdmin ? '' : 'disabled'}>
                                    <option value="admin" ${String(user.role||'').toLowerCase()==='admin'?'selected':''}>Admin</option>
                                    <option value="editor" ${String(user.role||'').toLowerCase()==='editor'?'selected':''}>Editor</option>
                                    <option value="viewer" ${String(user.role||'').toLowerCase()==='viewer'?'selected':''}>Viewer</option>
                                </select>
                                ${isAdmin ? '' : '<small style="color:#666;">Only admins can change roles</small>'}
                            </div>
                            <div class="form-group" style="display:flex;align-items:center;gap:8px;">
                                <input type="checkbox" id="editUserDisabled" ${(user.permissions && user.permissions.disabled) ? 'checked' : ''}>
                                <label for="editUserDisabled">Deactivated (prevent login)</label>
                            </div>
                        </div>
                        <div class="section-permissions-container" style="display:flex;flex-direction:column;gap:10px;">
                            <h3 style="margin:0;">Section Permissions</h3>
                            <div style="color:#666;">Use the dedicated permissions tab to manage sections.</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="window.saveUserEdits && window.saveUserEdits('${user.id}')">Save Changes</button>
                        <button class="btn btn-secondary" onclick="(function(){ const m=document.getElementById('editUserModal'); if(m) m.remove(); })()">Cancel</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
            try {
                const m = document.getElementById('editUserModal');
                if (m) {
                    m.style.display = 'block';
                    m.style.zIndex = '10005';
                    const content = m.querySelector('.modal-content');
                    if (content) content.style.zIndex = '10006';
                }
            } catch(_) {}

            window.saveUserEdits = async function(targetId) {
                try {
                    if (!window.supabaseClient) { alert('Supabase not initialized'); return; }
                    const fullName = (document.getElementById('editUserFullName')?.value || '').trim();
                    const email = (document.getElementById('editUserEmail')?.value || '').trim();
                    const roleSel = document.getElementById('editUserRole');
                    const role = (roleSel && !roleSel.disabled) ? roleSel.value : user.role;
                    const disabledCb = document.getElementById('editUserDisabled');
                    const perms = Object.assign({}, user.permissions || {});
                    perms.disabled = !!(disabledCb && disabledCb.checked);

                    const { error: upErr } = await window.supabaseClient
                        .from('profiles')
                        .update({ name: fullName, role, email, permissions: perms })
                        .eq('id', targetId);
                    if (upErr) { alert('Update failed: ' + upErr.message); return; }
                    try { informationHub.showMessage('User updated', 'success'); } catch (_) {}
                    try { await informationHub.loadUsersList(); } catch (_) {}
                    const m = document.getElementById('editUserModal'); if (m) m.remove();
                } catch (e) {
                    alert('Save failed');
                }
            };
        } catch (e) {
            alert('Unable to open edit panel');
        }
    };
}

window.deleteUser = async (userId) => {
    try {
        if (!confirm('Disable this user? They will keep their auth account but be marked disabled in profiles.')) return;
        if (!window.supabaseClient) { alert('Supabase not initialized'); return; }
        // Soft-disable: set permissions.disabled = true and clear sections
        const { data: prof, error } = await window.supabaseClient
            .from('profiles')
            .select('permissions')
            .eq('id', userId)
            .single();
        if (error) { alert('Failed to load user'); return; }
        const perms = Object.assign({}, prof?.permissions || {});
        perms.disabled = true;
        if (Array.isArray(perms.sections)) perms.sections = [];
        if (Array.isArray(perms.editableSections)) perms.editableSections = [];
        const { error: upErr } = await window.supabaseClient
            .from('profiles')
            .update({ permissions: perms })
            .eq('id', userId);
        if (upErr) { alert('Disable failed: ' + upErr.message); return; }
        try { informationHub.showMessage('User disabled', 'success'); } catch (_) {}
        try { await informationHub.loadUsersList(); } catch (_) {}
    } catch (e) {
        alert('Disable failed');
    }
};

// Global export functions
window.exportAllData = async () => {
    try {
        informationHub.showMessage('Preparing export...', 'success');

        // Primary path: Excel export via excelExporter
        try {
            if (window.excelExporter && typeof window.excelExporter.exportToExcel === 'function') {
                const result = await window.excelExporter.exportToExcel();
                if (result && result.success) {
                    informationHub.showMessage(`Export completed! File: ${result.fileName}`, 'success');
                    informationHub.logActivity('EXPORT', `Exported all data - ${result.fileName}`);
                    return;
                }
            }
        } catch (e) {
            // Fall through to JSON/CSV fallbacks
        }

        // Fallback 1: JSON backup from database (if available)
        try {
            if (window.hubDatabase && window.hubDatabaseReady && typeof hubDatabase.exportAllData === 'function') {
                const payload = await hubDatabase.exportAllData();
                const jsonName = `Information_Hub_Export_${new Date().toISOString().split('T')[0]}.json`;
                const blob = new Blob([JSON.stringify(payload || {}, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = jsonName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                informationHub.showMessage(`Downloaded JSON backup: ${jsonName}`, 'error');
                informationHub.logActivity('EXPORT', `Exported JSON backup - ${jsonName}`);
                return;
            }
        } catch (_) {
            // Continue to CSV fallback
        }

        // Fallback 2: CSV from localStorage (legacy)
        try {
            const data = [];
            const sections = ['costing', 'supply-planning', 'operations', 'quality', 'hr', 'it', 'sales', 'compliance'];
            sections.forEach(section => {
                const sectionData = localStorage.getItem(`section_${section}`);
                if (sectionData) {
                    const parsed = JSON.parse(sectionData);
                    ['playbooks', 'boxLinks', 'dashboards'].forEach(type => {
                        (parsed[type] || []).forEach(item => {
                            data.push({
                                'Section': section.replace('-', ' ').toUpperCase(),
                                'Type': type.replace('boxLinks', 'Box Links').replace(/([A-Z])/g, ' $1').trim(),
                                'Title': item.title,
                                'Description': item.description || '',
                                'URL': item.url,
                                'Tags': (item.tags || []).join(', '),
                'Created': formatCST(item.createdAt, true)
                            });
                        });
                    });
                }
            });
            if (data.length > 0) {
                const headers = Object.keys(data[0]);
                const csvContent = [
                    headers.join(','),
                    ...data.map(row => headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(','))
                ].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Information_Hub_Export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                informationHub.showMessage('Downloaded CSV fallback', 'error');
                return;
            }
        } catch (_) {}

        // If all paths fail, notify
        informationHub.showMessage('Export failed: No data source available', 'error');
    } catch (error) {
        informationHub.showMessage(`Export failed: ${error.message}`, 'error');
    }
};

window.exportSectionData = async function() {
    // Resolve section id from dropdown, or fallbacks (first option / hub cards)
    let sectionId = '';
    try { sectionId = document.getElementById('sectionExportSelect')?.value || ''; } catch (_) {}
    if (!sectionId) {
        try {
            const sel = document.getElementById('sectionExportSelect');
            if (sel && sel.options && sel.options.length > 1) sectionId = sel.options[1].value;
        } catch (_) {}
    }
    if (!sectionId) {
        try { sectionId = document.querySelector('.hub-card')?.getAttribute('data-section-id') || ''; } catch (_) {}
    }
    if (!sectionId) {
        alert('Please select a section');
        return;
    }
    try {
        const result = await excelExporter.exportSectionToExcel(sectionId);
        if (!result || result.success !== true) {
            alert('Export failed: ' + (result && result.error ? result.error : 'Unknown error'));
        } else {
            alert('Export completed: ' + result.fileName);
        }
    } catch (err) {
        console.error('Export error:', err);
        alert('Export failed: ' + (err && err.message ? err.message : String(err)));
    }
};

window.exportUserData = async () => {
    const userId = document.getElementById('userExportSelect').value;
    if (!userId) {
        informationHub.showMessage('Please select a user', 'error');
        return;
    }

    try {
        // Permission guard: admin -> any; manager -> only users; user -> self
        try {
            const me = informationHub.currentUser;
            const role = String(me?.role || '').toLowerCase();
            const targetId = parseInt(userId);
            if (role === 'manager') {
                // Get users from Supabase database
                const users = window.hubDatabase && window.hubDatabaseReady ? await hubDatabase.getAllUsers() : [];
                const target = users.find(u => u.id === targetId);
                const targetRole = String(target?.role || '').toLowerCase();
                if (targetRole !== 'user' && targetId !== me?.userId && targetId !== me?.id) {
                    informationHub.showMessage('Managers can export only their users or self', 'error');
                    return;
                }
            } else if (role !== 'admin') {
                if (targetId !== me?.userId && targetId !== me?.id) {
                    informationHub.showMessage('You can export only your own data', 'error');
                    return;
                }
            }
        } catch (_) {}
        informationHub.showMessage('Preparing user data export...', 'success');
        const result = await excelExporter.exportUserDataToExcel(parseInt(userId));
        if (result.success) {
            informationHub.showMessage(`User data export completed! File: ${result.fileName}`, 'success');
            informationHub.logActivity('EXPORT', `Exported user data - ${result.username}`);
        } else {
            informationHub.showMessage(`Export failed: ${result.error}`, 'error');
        }
    } catch (error) {
        informationHub.showMessage(`Export failed: ${error.message}`, 'error');
    }
};

window.exportAuditLog = async () => {
    try {
        informationHub.showMessage('Preparing audit log export...', 'success');
        // Paginate to fetch full history
        let activities = [];
        try {
            if (window.hubDatabase && window.hubDatabaseReady) {
                const page = 1000;
                let off = 0;
                while (true) {
                    const chunk = await hubDatabase.getActivities(page, off);
                    if (!Array.isArray(chunk) || chunk.length === 0) break;
                    activities.push(...chunk);
                    if (chunk.length < page) break;
                    off += chunk.length;
                }
            }
        } catch (_) {}
        // Fallback single call if above failed
        if (!Array.isArray(activities) || activities.length === 0) {
            try { activities = await hubDatabase.getActivities(); } catch (_) { activities = []; }
        }

        // Ensure XLSX is available (use the shared loader if present)
        try {
            if (window.excelExporter && typeof window.excelExporter.ensureXlsxLoaded === 'function') {
                await window.excelExporter.ensureXlsxLoaded();
            } else if (typeof XLSX === 'undefined') {
                // Minimal inline loader as a fallback
                const sources = [
                    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
                    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
                    'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
                ];
                let loaded = false;
                for (const src of sources) {
                    try {
                        await new Promise((resolve, reject) => {
                            const timer = setTimeout(() => reject(new Error('timeout')), 6000);
                            const script = document.createElement('script');
                            script.src = src;
                            script.async = true;
                            script.onload = () => { clearTimeout(timer); resolve(); };
                            script.onerror = () => { clearTimeout(timer); reject(new Error('failed')); };
                            document.head.appendChild(script);
                        });
                        if (typeof XLSX !== 'undefined') { loaded = true; break; }
                    } catch (_) { /* try next */ }
                }
                if (!loaded) throw new Error('Failed to load XLSX library');
            }
        } catch (e) {
            // If XLSX can't be loaded, fallback to JSON download of activities
            const jsonName = `Audit_Log_Backup_${new Date().toISOString().split('T')[0]}.json`;
            const blob = new Blob([JSON.stringify(activities || [], null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = jsonName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            informationHub.showMessage(`XLSX unavailable. Downloaded JSON backup: ${jsonName}`, 'error');
            return;
        }

        // Create workbook
        const workbook = XLSX.utils.book_new();
        const activityData = activities.map(activity => ({
            'ID': activity.id,
            'User ID': activity.userId,
            'Username': activity.username,
            'Action': activity.action,
            'Description': activity.description,
            'Timestamp': formatUserTZ(activity.timestamp),
            'IP Address': activity.ip || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(activityData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Log');

        const fileName = `Audit_Log_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        informationHub.showMessage(`Audit log export completed! File: ${fileName}`, 'success');
        informationHub.logActivity('EXPORT', 'Exported audit log');
    } catch (error) {
        informationHub.showMessage(`Export failed: ${error.message}`, 'error');
    }
};

// JSON Backup/Restore (raw)
window.backupJson = async () => {
    try {
        // Admin-only hint (non-blocking for download)
        try {
            const me = informationHub.currentUser;
            if (!(me && (String(me.role||'').toLowerCase()==='admin' || me.permissions?.canManageUsers))) {
                informationHub.showMessage('Tip: Admin should perform backups for completeness.', 'error');
            }
        } catch(_) {}

        // Supabase database backup
        let users = [], sections = [], sectionConfigs = {}, resources = {}, activities = [], views = [];
        if (window.hubDatabase && window.hubDatabaseReady) {
            try { users = await hubDatabase.getAllUsers(); } catch(_) {}
            try { sections = await hubDatabase.getAllSections(); } catch(_) {}
            try { activities = await hubDatabase.getActivities(); } catch(_) {}
            try { views = await hubDatabase.getAllViews(); } catch(_) {}
            // Per-section resources
            for (const s of (sections||[])) {
                const sid = String(s.section_id||s.id||'').trim(); if (!sid) continue;
                try { resources[sid] = await hubDatabase.getResourcesBySection(sid); } catch(_) { resources[sid] = []; }
            }
        }

        const payload = {
            exportDate: new Date().toISOString(),
            users, sections, sectionConfigs, resources, activities, views
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Information_Hub_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        informationHub.showMessage('Backup downloaded', 'success');
    } catch (error) {
        informationHub.showMessage(`Backup failed: ${error.message}`, 'error');
    }
};

window.restoreJson = async () => {
    try {
        // Admin-only guard
        const me = informationHub.currentUser;
        if (!(me && (String(me.role||'').toLowerCase()==='admin' || me.permissions?.canManageUsers))) {
            informationHub.showMessage('Only admin can restore data', 'error');
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async () => {
            const file = input.files && input.files[0];
            if (!file) return;
            const text = await file.text();
            const json = JSON.parse(text);
            if (!window.hubDatabase || !window.hubDatabaseReady) throw new Error('Supabase database unavailable');
            // Users
            try { if (Array.isArray(json.users)) for (const user of json.users) await hubDatabase.saveUser(user); } catch(_) {}
            // Sections
            try { if (Array.isArray(json.sections)) for (const section of json.sections) await hubDatabase.saveSection(section); } catch(_) {}
            // Resources (as map: { [sectionId]: [...] })
            try {
                const res = json.resources && typeof json.resources === 'object' ? json.resources : {};
                for (const sid of Object.keys(res)) {
                    const resources = Array.isArray(res[sid]) ? res[sid] : [];
                    for (const resource of resources) {
                        await hubDatabase.saveResource({...resource, sectionId: sid});
                    }
                }
            } catch(_) {}
            // Optional: audit + views
            try { if (Array.isArray(json.activities)) for (const activity of json.activities) await hubDatabase.saveActivity(activity); } catch(_) {}

            // Refresh UI
            try { updateMainHubSections(); } catch(_) {}
            informationHub.showMessage('Restore completed', 'success');
        };
        input.click();
    } catch (error) {
        informationHub.showMessage(`Restore failed: ${error.message}`, 'error');
    }
};

// Initialize the application (once) - wait for Supabase
let informationHub;
function initInformationHubOnce() {
	if (informationHub && informationHub instanceof InformationHub) return;
	
	// Show initialization progress
	showHubInitProgress('Starting hub initialization...', 5);
	
	// Wait for Supabase client to be ready
	const waitForSupabase = async () => {
		let retries = 0;
		const maxRetries = 100; // 10 seconds max wait
		
		while (retries < maxRetries && !window.supabaseClient) {
			console.log('Waiting for Supabase client...', retries + 1);
			showHubInitProgress(`Waiting for Supabase client... (${retries + 1}/${maxRetries})`, 10 + (retries * 0.8));
			await new Promise(resolve => setTimeout(resolve, 100));
			retries++;
		}
		
		if (!window.supabaseClient) {
			console.error('Supabase client not available after waiting');
			showHubInitProgress('❌ Supabase client not available. Retrying...', 100);
			setTimeout(() => {
				hideHubInitProgress();
				window.location.reload();
			}, 2000);
			return;
		}
		
		console.log('Supabase client ready, checking authentication...');
		showHubInitProgress('✅ Supabase ready, checking authentication...', 50);
		
		// Test authentication before initializing hub
		try {
			const { data: { user }, error } = await window.supabaseClient.auth.getUser();
			if (error || !user) {
				console.error('Authentication check failed:', error);
				// Retry briefly to allow session restoration
				let authRetries = 0;
				while (authRetries < 50) { // ~5s
					await new Promise(r => setTimeout(r, 100));
					const { data: { user: u2 } } = await window.supabaseClient.auth.getUser();
					if (u2) { break; }
					authRetries++;
				}
				const { data: { user: finalUser } } = await window.supabaseClient.auth.getUser();
				if (!finalUser) {
					showHubInitProgress('❌ Authentication failed', 100);
					setTimeout(() => {
						hideHubInitProgress();
						window.location.href = 'auth.html';
					}, 2000);
					return;
				}
			}
			
			console.log('Authentication verified, initializing InformationHub');
			showHubInitProgress('✅ Authentication verified, initializing hub...', 75);
			
			informationHub = new InformationHub();
			// Export for global access
			window.informationHub = informationHub;
			
			showHubInitProgress('✅ Hub initialized successfully!', 100);
			setTimeout(() => hideHubInitProgress(), 1500);
			
		} catch (error) {
			console.error('Error during authentication check:', error);
			showHubInitProgress('❌ Authentication error', 100);
			setTimeout(() => {
				hideHubInitProgress();
				window.location.reload();
			}, 2000);
		}
	};
	
	waitForSupabase();
}

// Function to show hub initialization progress
function showHubInitProgress(message, percentage) {
	// Remove existing progress
	const existingProgress = document.getElementById('hubInitProgress');
	if (existingProgress) {
		existingProgress.remove();
	}

	// Create progress container
	const progressDiv = document.createElement('div');
	progressDiv.id = 'hubInitProgress';
	progressDiv.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		z-index: 9999;
		color: white;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
	`;

	progressDiv.innerHTML = `
		<div style="text-align: center; max-width: 400px; padding: 20px;">
			<div style="margin-bottom: 20px;">
				<div style="border: 4px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top: 4px solid #3498db; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
			</div>
			<h3 style="margin: 0 0 10px 0; font-size: 18px;">${message}</h3>
			<div style="background: rgba(255, 255, 255, 0.2); border-radius: 10px; height: 8px; margin: 10px 0; overflow: hidden;">
				<div style="background: linear-gradient(90deg, #3498db, #2ecc71); height: 100%; width: ${percentage}%; transition: width 0.3s ease; border-radius: 10px;"></div>
			</div>
			<p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.8;">${percentage}% Complete</p>
		</div>
	`;

	document.body.appendChild(progressDiv);
}

// Function to hide hub initialization progress
function hideHubInitProgress() {
	const progressDiv = document.getElementById('hubInitProgress');
	if (progressDiv) {
		progressDiv.remove();
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initInformationHubOnce);
} else {
	initInformationHubOnce();
}
