// Section Page JavaScript - Handles individual section functionality
class SectionManager {
    constructor() {
        this.currentUser = this.getCurrentUser();
        this.currentSection = this.getCurrentSectionFromURL();
        this.currentTab = 'playbooks';
        this.init();
    }

    getCurrentUser() {
        const session = localStorage.getItem('hubSession');
        if (session) {
            return JSON.parse(session);
        }
        return null;
    }

    init() {
        if (!this.validateSession()) {
            return;
        }
        this.checkAccess();
        // Section session start
        this.sectionSessionStartMs = Date.now();
        this.loadSectionData();
        this.bindEvents();
        // Show content early to avoid spinner stuck on minor errors
        const loadingEl = document.getElementById('loadingScreen');
        const contentEl = document.getElementById('mainContent');
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
        try {
            this.renderCurrentTab();
        } catch (e) {
            console.error('Error rendering tab:', e);
        }
        // usage logging for resource clicks
        this.bindResourceClickLogging();
        this.setupSectionSessionLogging();
    }

    checkAccess() {
        if (!this.currentUser) {
            window.location.href = 'auth.html';
            return;
        }

        // Admins or users with global edit can always view sections
        if (this.currentUser.role === 'admin' || this.currentUser.permissions?.canEditAllSections) {
            return;
        }

        if (!this.currentUser.permissions.sections.includes(this.currentSection)) {
            alert('You do not have access to this section');
            window.location.href = 'index.html';
            return;
        }
    }

    loadSectionData() {
        // Load section information: prefer dynamic config from sectionOrder
        let sectionConfig = null;
        try {
            const savedOrder = localStorage.getItem('sectionOrder');
            if (savedOrder) {
                const parsed = JSON.parse(savedOrder);
                sectionConfig = parsed.find(s => s.id === this.currentSection) || null;
            }
        } catch (_) {}

        if (!sectionConfig) {
            const defaults = {
                'costing': { name: 'Costing', icon: 'fas fa-calculator', intro: 'Guides and tools for cost analysis, budgeting, and ROI planning.' },
                'supply-planning': { name: 'Supply Planning', icon: 'fas fa-truck', intro: 'Demand forecasting, inventory optimization, and supplier planning resources.' },
                'operations': { name: 'Operations', icon: 'fas fa-cogs', intro: 'Process improvement, SOPs, production metrics, and maintenance guidance.' },
                'quality': { name: 'Quality Management', icon: 'fas fa-check-circle', intro: 'Quality management practices, control procedures, and compliance standards.' },
                'hr': { name: 'Human Resources', icon: 'fas fa-users', intro: 'People operations policies, templates, onboarding, and workforce resources.' },
                'it': { name: 'IT & Technology', icon: 'fas fa-laptop-code', intro: 'IT systems, tooling, security, and operational best practices.' },
                'sales': { name: 'Sales & Marketing', icon: 'fas fa-chart-line', intro: 'Sales playbooks, marketing assets, and performance dashboards.' },
                'compliance': { name: 'Compliance & Legal', icon: 'fas fa-gavel', intro: 'Policies, legal, and regulatory guidance with reusable templates.' }
            };
            sectionConfig = defaults[this.currentSection] || { name: this.currentSection, icon: 'fas fa-th-large', intro: '' };
        }

        const nameEl = document.getElementById('sectionName');
        const iconEl = document.getElementById('sectionIcon');
        if (nameEl) nameEl.textContent = sectionConfig.name || this.currentSection;
        if (iconEl) {
            if (sectionConfig.image) {
                try {
                    iconEl.outerHTML = `<img id="sectionIcon" src="${sectionConfig.image}" style="width:22px;height:22px;object-fit:contain;margin-right:8px;" />`;
                } catch (_) {
                    iconEl.className = this.normalizeIconClass(sectionConfig.icon || 'fa-solid fa-table-cells-large');
                }
            } else {
                iconEl.className = this.normalizeIconClass(sectionConfig.icon || 'fa-solid fa-table-cells-large');
            }
        }
        document.title = `${sectionConfig.name || this.currentSection} - Information Hub`;

        // Intro text
        const introEl = document.getElementById('sectionIntro');
        if (introEl) {
            const intro = (sectionConfig.intro || '').trim();
            introEl.textContent = intro;
            introEl.style.display = intro ? 'block' : 'none';
        }
    }

    // Normalize FA icon class (simple copy from index page)
    normalizeIconClass(cls) {
        if (!cls || typeof cls !== 'string') return 'fa-solid fa-table-cells-large';
        let c = cls.trim();
        if (/\bfa-(solid|regular|light|thin|duotone|brands)\b/.test(c)) return c;
        c = c.replace(/\bfas\b/, 'fa-solid').replace(/\bfar\b/, 'fa-regular').replace(/\bfab\b/, 'fa-brands');
        if (!/\bfa-\w+\b/.test(c) || !/\bfa-\w+\b.*\bfa-/.test('fa ' + c)) {
            if (!/\bfa-(solid|regular|brands)\b/.test(c)) {
                c = 'fa-solid ' + c;
            }
        }
        return c;
    }

    // Add session validation on page load
    validateSession() {
        const session = localStorage.getItem('hubSession');
        if (!session) {
            window.location.href = 'auth.html';
            return false;
        }
        
        try {
            const sessionData = JSON.parse(session);
            // Check if session is still valid (you can add expiration logic here)
            return true;
        } catch (e) {
            localStorage.removeItem('hubSession');
            window.location.href = 'auth.html';
            return false;
        }
    }

    getCurrentSectionFromURL() {
        // Extract section from URL or use stored section
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('section') || localStorage.getItem('currentSection') || 'costing';
    }

    bindEvents() {
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
        
        // Edit and delete resources
        window.editResource = (type, id) => this.editResource(type, id);
        window.deleteResource = (type, id) => this.deleteResource(type, id);
        
        // Back to hub
        window.goBackToHub = () => this.goBackToHub();
    }

    setupSectionSessionLogging() {
        const logClose = () => {
            if (this._sectionSessionLogged) return;
            this._sectionSessionLogged = true;
            const durationMs = Date.now() - (this.sectionSessionStartMs || Date.now());
            try {
                if (window.hubDatabase && hubDatabase.saveActivity && this.currentUser) {
                    hubDatabase.saveActivity({
                        id: Date.now().toString(),
                        userId: this.currentUser.id,
                        username: this.currentUser.username,
                        action: 'CLOSE_SECTION',
                        description: `Closed section ${this.currentSection} after ${Math.round(durationMs/1000)}s`,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (_) {}
        };
        window.addEventListener('beforeunload', logClose);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) logClose();
        });
        // Log open
        try {
            if (window.hubDatabase && hubDatabase.saveActivity && this.currentUser) {
                hubDatabase.saveActivity({
                    id: Date.now().toString(),
                    userId: this.currentUser.id,
                    username: this.currentUser.username,
                    action: 'OPEN_SECTION',
                    description: `Opened section ${this.currentSection}`,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (_) {}
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab appearance
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const ev = (typeof event !== 'undefined' ? event : window.event);
        if (ev && ev.target) {
            ev.target.classList.add('active');
        } else {
            const activeTab = document.querySelector(`.nav-tab[onclick*="${tabName}"]`);
            if (activeTab) activeTab.classList.add('active');
        }

        // Show/hide content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${tabName}-section`).classList.add('active');

        // Render the appropriate content
        this.renderCurrentTab();

        // Log tab switch as activity
        try {
            if (window.hubDatabase && hubDatabase.saveActivity && this.currentUser) {
                hubDatabase.saveActivity({
                    id: Date.now().toString(),
                    userId: this.currentUser.id,
                    username: this.currentUser.username,
                    action: 'SWITCH_SECTION_TAB',
                    description: `Switched to tab ${tabName} in section ${this.currentSection}`,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (_) {}
    }

    renderCurrentTab() {
        this.renderResources(this.currentTab);
    }

    async renderResources(type) {
        const gridId = `${type.replace('-', '-')}-grid`;
        const grid = document.getElementById(gridId);
        const emptyState = document.getElementById('emptyState');
        const addBtn = document.querySelector(`#${type}-section .add-resource-btn`);
        
        if (!grid) return;

        // Show/hide add button based on permissions
        if (addBtn) {
            addBtn.style.display = this.canEditResource() ? 'inline-flex' : 'none';
        }

        const resources = await this.getResources(type);
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

    async getResources(type) {
        const storageType = this.mapToStorageType(type);
        let dbResources = [];
        try {
            if (window.hubDatabase && hubDatabase.getResourcesByType) {
                dbResources = await hubDatabase.getResourcesByType(this.currentSection, storageType) || [];
            }
        } catch (error) {
            console.warn('DB not ready, using localStorage fallback');
        }

        // LocalStorage fallback/merge from both per-section and legacy informationHub
        const sectionData = JSON.parse(localStorage.getItem(`section_${this.currentSection}`) || '{"playbooks":[],"boxLinks":[],"dashboards":[]}');
        const lsSection = (sectionData[storageType] || []).map(r => ({ ...r, type: storageType, sectionId: this.currentSection }));

        const hubData = JSON.parse(localStorage.getItem('informationHub') || '{}');
        const hubSection = hubData[this.currentSection] || { playbooks: [], boxLinks: [], dashboards: [] };
        const lsHub = (hubSection[storageType] || []).map(r => ({ ...r, type: storageType, sectionId: this.currentSection }));

        const lsResources = [...lsHub, ...lsSection];

        // Merge by id, prefer DB version
        const byId = new Map();
        lsResources.forEach(r => byId.set(r.id, r));
        dbResources.forEach(r => byId.set(r.id, r));
        return Array.from(byId.values());
    }

    async getSectionData() {
        try {
            const section = await hubDatabase.getSection(this.currentSection);
            return section ? section.data : { playbooks: [], boxLinks: [], dashboards: [] };
        } catch (error) {
            console.error('Error loading section data:', error);
            return { playbooks: [], boxLinks: [], dashboards: [] };
        }
    }

    createResourceCard(resource, type) {
        const storageType = this.mapToStorageType(type);
        const label = storageType === 'playbooks' ? 'PLAYBOOK' : storageType === 'boxLinks' ? 'BOX LINK' : 'DASHBOARD';
        const iconClass = storageType === 'playbooks' ? 'fas fa-book' : storageType === 'boxLinks' ? 'fas fa-link' : 'fas fa-chart-bar';

        const canEdit = this.canEditResource() && (this.isAdmin() || this.isResourceOwner(resource));
        const canDelete = this.currentUser && this.currentUser.permissions.canDeleteResources && (this.isAdmin() || this.isResourceOwner(resource)) && this.canEditResource();

        return `
            <div class="resource-card" data-id="${resource.id}">
                <div class="resource-header">
                    <div>
                        <h3 class="resource-title">${this.escapeHtml(resource.title)}</h3>
                    </div>
                    <div class="resource-type">${label}</div>
                </div>
                
                ${resource.description ? `<p class="resource-description">${this.escapeHtml(resource.description)}</p>` : ''}
                
                <a href="${resource.url}" target="_blank" rel="noopener noreferrer" class="resource-url">
                    <i class="${iconClass}"></i> ${this.escapeHtml(resource.url)}
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
                        ${canEdit ? `
                            <button class="action-btn edit-btn" onclick="editResource('${type}', '${resource.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="action-btn delete-btn" onclick="deleteResource('${type}', '${resource.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Hook clicks to record usage
    bindResourceClickLogging() {
        document.body.addEventListener('click', async (e) => {
            const anchor = e.target.closest('a.resource-url');
            if (!anchor) return;
            const card = anchor.closest('.resource-card');
            if (!card) return;
            const resourceId = card.getAttribute('data-id');
            try {
                if (window.hubDatabase && hubDatabase.recordView) {
                    await hubDatabase.recordView(this.currentUser?.id || null, resourceId);
                }
                if (window.hubDatabase && hubDatabase.saveActivity && this.currentUser) {
                    await hubDatabase.saveActivity({
                        id: Date.now().toString(),
                        userId: this.currentUser.id,
                        username: this.currentUser.username,
                        action: 'VIEW_RESOURCE',
                        description: `Viewed resource ${resourceId} in section ${this.currentSection}`,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (_) {}
        });
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
        this.renderCurrentTab();
    }

    // Resource Management
    addResource(type) {
        if (!this.canEditResource()) {
            this.showMessage('You do not have permission to add resources', 'error');
            return;
        }

        const modal = this.createResourceModal(type);
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    canEditResource() {
        if (!this.currentUser) return false;
        return this.currentUser.permissions.canEditAllSections || 
               this.currentUser.permissions.editableSections.includes(this.currentSection);
    }

    canDeleteResource() {
        if (!this.currentUser) return false;
        return this.currentUser.permissions.canDeleteResources && this.canEditResource();
    }

    isResourceOwner(resource) {
        if (!this.currentUser || !resource) return false;
        return String(resource.userId || '') === String(this.currentUser.id || '');
    }

    isAdmin() {
        if (!this.currentUser) return false;
        return this.currentUser.role === 'admin' || this.currentUser.permissions.canEditAllSections === true;
    }
    
    createResourceModal(type) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add New ${type.replace('-', ' ').toUpperCase()}</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <form id="resourceForm">
                    <div class="form-group">
                        <label for="resourceTitle">Title *</label>
                        <input type="text" id="resourceTitle" name="title" required>
                    </div>
                    <div class="form-group">
                        <label for="resourceDescription">Description</label>
                        <textarea id="resourceDescription" name="description" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="resourceUrl">URL *</label>
                        <input type="url" id="resourceUrl" name="url" required>
                    </div>
                    <div class="form-group">
                        <label for="resourceCategory">Category</label>
                        <select id="resourceCategory" name="category">
                            <option value="process">Process</option>
                            <option value="procedure">Procedure</option>
                            <option value="guide">Guide</option>
                            <option value="template">Template</option>
                            <option value="checklist">Checklist</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="resourceTags">Tags (comma-separated)</label>
                        <input type="text" id="resourceTags" name="tags" placeholder="e.g., analysis, framework, financial">
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="this.closest('.modal').remove()" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Resource</button>
                    </div>
                </form>
            </div>
        `;

        // Handle form submission
        const form = modal.querySelector('#resourceForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveResource(type, form);
            modal.remove();
        });

        return modal;
    }

    async saveResource(type, form) {
        const formData = new FormData(form);
        const resource = {
            id: Date.now().toString(),
            title: formData.get('title'),
            description: formData.get('description') || '',
            url: formData.get('url'),
            category: formData.get('category'),
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            createdAt: new Date().toISOString()
        };

        // Validate URL
        if (!this.isValidUrl(resource.url)) {
            this.showMessage('Please enter a valid URL', 'error');
            return;
        }

        await this.addResourceToSection(type, resource);
        this.renderCurrentTab();
        this.showMessage(`${type.replace('-', ' ')} added successfully!`, 'success');
    }

    async addResourceToSection(type, resource) {
        try {
            // Get existing section data
            const sectionData = JSON.parse(localStorage.getItem(`section_${this.currentSection}`) || '{"playbooks":[],"boxLinks":[],"dashboards":[]}');
            
            // Add the new resource to the appropriate array
            const resourceType = this.mapToStorageType(type);
            if (!sectionData[resourceType]) {
                sectionData[resourceType] = [];
            }
            sectionData[resourceType].push(resource);
            
            // Save back to localStorage
            localStorage.setItem(`section_${this.currentSection}`, JSON.stringify(sectionData));
            
            // Also save to the main hub format for compatibility
            const hubData = JSON.parse(localStorage.getItem('informationHub') || '{}');
            if (!hubData[this.currentSection]) {
                hubData[this.currentSection] = { playbooks: [], boxLinks: [], dashboards: [] };
            }
            if (!hubData[this.currentSection][resourceType]) {
                hubData[this.currentSection][resourceType] = [];
            }
            hubData[this.currentSection][resourceType].push(resource);
            localStorage.setItem('informationHub', JSON.stringify(hubData));
            
            // Persist to IndexedDB so it shows up in queries
            if (window.hubDatabase && hubDatabase.saveResource) {
                await hubDatabase.saveResource({
                    ...resource,
                    sectionId: this.currentSection,
                    type: resourceType,
                    userId: this.currentUser?.id || 0
                });
            }
            
            console.log('Resource saved successfully');
        } catch (error) {
            console.error('Error saving resource:', error);
            this.showMessage('Error saving resource', 'error');
        }
    }

    async editResource(type, id) {
        if (!this.canEditResource()) {
            this.showMessage('You do not have permission to edit resources', 'error');
            return;
        }

        const resources = await this.getResources(type);
        const resource = resources.find(r => r.id === id);
        if (!resource) return;

        if (!this.isAdmin() && !this.isResourceOwner(resource)) {
            this.showMessage('You can only edit resources assigned to you', 'error');
            return;
        }

        const modal = this.createEditModal(type, resource);
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    createEditModal(type, resource) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit ${type.replace('-', ' ').toUpperCase()}</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <form id="editResourceForm">
                    <div class="form-group">
                        <label for="editResourceTitle">Title *</label>
                        <input type="text" id="editResourceTitle" name="title" value="${this.escapeHtml(resource.title)}" required>
                    </div>
                    <div class="form-group">
                        <label for="editResourceDescription">Description</label>
                        <textarea id="editResourceDescription" name="description" rows="3">${this.escapeHtml(resource.description)}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editResourceUrl">URL *</label>
                        <input type="url" id="editResourceUrl" name="url" value="${this.escapeHtml(resource.url)}" required>
                    </div>
                    <div class="form-group">
                        <label for="editResourceCategory">Category</label>
                        <select id="editResourceCategory" name="category">
                            <option value="process" ${resource.category === 'process' ? 'selected' : ''}>Process</option>
                            <option value="procedure" ${resource.category === 'procedure' ? 'selected' : ''}>Procedure</option>
                            <option value="guide" ${resource.category === 'guide' ? 'selected' : ''}>Guide</option>
                            <option value="template" ${resource.category === 'template' ? 'selected' : ''}>Template</option>
                            <option value="checklist" ${resource.category === 'checklist' ? 'selected' : ''}>Checklist</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editResourceTags">Tags (comma-separated)</label>
                        <input type="text" id="editResourceTags" name="tags" value="${this.escapeHtml(resource.tags.join(', '))}" placeholder="e.g., analysis, framework, financial">
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="this.closest('.modal').remove()" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Update Resource</button>
                    </div>
                </form>
            </div>
        `;

        // Handle form submission
        const form = modal.querySelector('#editResourceForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateResource(type, id, form);
            modal.remove();
        });

        return modal;
    }

    async updateResource(type, id, form) {
        const formData = new FormData(form);
        const existingResources = await this.getResources(type);
        const original = existingResources.find(r => r.id === id) || {};
        const updatedResource = {
            id: id,
            title: formData.get('title'),
            description: formData.get('description') || '',
            url: formData.get('url'),
            category: formData.get('category'),
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            createdAt: original.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Validate URL
        if (!this.isValidUrl(updatedResource.url)) {
            this.showMessage('Please enter a valid URL', 'error');
            return;
        }

        await this.updateResourceInSection(type, id, updatedResource);
        this.renderCurrentTab();
        this.showMessage(`${type.replace('-', ' ')} updated successfully!`, 'success');
    }

    async updateResourceInSection(type, id, updatedResource) {
        try {
            // Get existing section data
            const sectionData = JSON.parse(localStorage.getItem(`section_${this.currentSection}`) || '{"playbooks":[],"boxLinks":[],"dashboards":[]}');
            const resourceType = this.mapToStorageType(type);
            
            // Find and update the resource
            if (sectionData[resourceType]) {
                const index = sectionData[resourceType].findIndex(r => r.id === id);
                if (index !== -1) {
                    sectionData[resourceType][index] = updatedResource;
                }
            }
            
            // Save back to localStorage
            localStorage.setItem(`section_${this.currentSection}`, JSON.stringify(sectionData));
            
            // Also update in the main hub format
            const hubData = JSON.parse(localStorage.getItem('informationHub') || '{}');
            if (hubData[this.currentSection] && hubData[this.currentSection][resourceType]) {
                const hubIndex = hubData[this.currentSection][resourceType].findIndex(r => r.id === id);
                if (hubIndex !== -1) {
                    hubData[this.currentSection][resourceType][hubIndex] = updatedResource;
                }
            }
            localStorage.setItem('informationHub', JSON.stringify(hubData));
            
            // Persist update to IndexedDB
            if (window.hubDatabase && hubDatabase.saveResource) {
                await hubDatabase.saveResource({
                    ...updatedResource,
                    sectionId: this.currentSection,
                    type: resourceType,
                    userId: this.currentUser?.id || 0
                });
            }
            
            console.log('Resource updated successfully');
        } catch (error) {
            console.error('Error updating resource:', error);
            this.showMessage('Error updating resource', 'error');
        }
    }

    async deleteResource(type, id) {
        if (!this.canDeleteResource()) {
            this.showMessage('You do not have permission to delete resources', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this resource?')) return;

        const resources = await this.getResources(type);
        const resource = resources.find(r => r.id === id);
        if (!this.isAdmin() && !this.isResourceOwner(resource)) {
            this.showMessage('You can only delete resources assigned to you', 'error');
            return;
        }

        await this.removeResourceFromSection(type, id);
        this.renderCurrentTab();
        this.showMessage(`${type.replace('-', ' ')} deleted successfully!`, 'success');
    }

    async removeResourceFromSection(type, id) {
        try {
            // Get existing section data
            const sectionData = JSON.parse(localStorage.getItem(`section_${this.currentSection}`) || '{"playbooks":[],"boxLinks":[],"dashboards":[]}');
            const resourceType = this.mapToStorageType(type);
            
            // Remove the resource
            if (sectionData[resourceType]) {
                sectionData[resourceType] = sectionData[resourceType].filter(r => r.id !== id);
            }
            
            // Save back to localStorage
            localStorage.setItem(`section_${this.currentSection}`, JSON.stringify(sectionData));
            
            // Also remove from the main hub format
            const hubData = JSON.parse(localStorage.getItem('informationHub') || '{}');
            if (hubData[this.currentSection] && hubData[this.currentSection][resourceType]) {
                hubData[this.currentSection][resourceType] = hubData[this.currentSection][resourceType].filter(r => r.id !== id);
            }
            localStorage.setItem('informationHub', JSON.stringify(hubData));
            
            // Remove from IndexedDB
            if (window.hubDatabase && hubDatabase.deleteResource) {
                await hubDatabase.deleteResource(id);
            }
            
            console.log('Resource deleted successfully');
        } catch (error) {
            console.error('Error deleting resource:', error);
            this.showMessage('Error deleting resource', 'error');
        }
    }

    // Utility Functions
    mapToStorageType(type) {
        const raw = String(type || '').toLowerCase();
        if (raw.includes('playbook')) return 'playbooks';
        if (raw.includes('box')) return 'boxLinks';
        if (raw.includes('dash')) return 'dashboards';
        if (raw === 'playbooks' || raw === 'boxlinks' || raw === 'dashboards') {
            if (raw === 'boxlinks') return 'boxLinks';
            return raw;
        }
        return 'playbooks';
    }
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

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

    goBackToHub() {
        // Update the main hub statistics before going back
        if (window.parent && window.parent.updateSectionStats) {
            window.parent.updateSectionStats();
        }
        window.location.href = 'index.html';
    }
}

// Initialize section manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SectionManager();
});
