// Database System for Information Hub
class HubDatabase {
    constructor() {
        this.dbName = 'InformationHubDB';
        this.dbVersion = 2;
        this.db = null;
        this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createObjectStores(db);
            };
        });
    }

    createObjectStores(db) {
        // Users store
        if (!db.objectStoreNames.contains('users')) {
            const usersStore = db.createObjectStore('users', { keyPath: 'id' });
            usersStore.createIndex('username', 'username', { unique: true });
            usersStore.createIndex('role', 'role', { unique: false });
        }

        // Sections store
        if (!db.objectStoreNames.contains('sections')) {
            const sectionsStore = db.createObjectStore('sections', { keyPath: 'id' });
            sectionsStore.createIndex('sectionId', 'sectionId', { unique: true });
        }

        // Resources store (playbooks, box links, dashboards)
        if (!db.objectStoreNames.contains('resources')) {
            const resourcesStore = db.createObjectStore('resources', { keyPath: 'id' });
            resourcesStore.createIndex('sectionId', 'sectionId', { unique: false });
            resourcesStore.createIndex('type', 'type', { unique: false });
            resourcesStore.createIndex('userId', 'userId', { unique: false });
            resourcesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Activities store (audit log)
        if (!db.objectStoreNames.contains('activities')) {
            const activitiesStore = db.createObjectStore('activities', { keyPath: 'id' });
            activitiesStore.createIndex('userId', 'userId', { unique: false });
            activitiesStore.createIndex('action', 'action', { unique: false });
            activitiesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Views store (aggregated per user/resource usage)
        if (!db.objectStoreNames.contains('views')) {
            const viewsStore = db.createObjectStore('views', { keyPath: 'id' });
            viewsStore.createIndex('userId', 'userId', { unique: false });
            viewsStore.createIndex('resourceId', 'resourceId', { unique: false });
            viewsStore.createIndex('lastViewedAt', 'lastViewedAt', { unique: false });
        }
    }

    // User Management
    async saveUser(user) {
        const transaction = this.db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        return new Promise((resolve, reject) => {
            const request = store.put(user);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUser(id) {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllUsers() {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteUser(id) {
        const transaction = this.db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Section Management
    async saveSection(section) {
        const transaction = this.db.transaction(['sections'], 'readwrite');
        const store = transaction.objectStore('sections');
        return new Promise((resolve, reject) => {
            const request = store.put(section);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getSection(sectionId) {
        const transaction = this.db.transaction(['sections'], 'readonly');
        const store = transaction.objectStore('sections');
        return new Promise((resolve, reject) => {
            const request = store.get(sectionId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllSections() {
        const transaction = this.db.transaction(['sections'], 'readonly');
        const store = transaction.objectStore('sections');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Resource Management
    async saveResource(resource) {
        const transaction = this.db.transaction(['resources'], 'readwrite');
        const store = transaction.objectStore('resources');
        return new Promise((resolve, reject) => {
            const request = store.put(resource);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getResource(id) {
        const transaction = this.db.transaction(['resources'], 'readonly');
        const store = transaction.objectStore('resources');
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getResourcesBySection(sectionId) {
        const transaction = this.db.transaction(['resources'], 'readonly');
        const store = transaction.objectStore('resources');
        const index = store.index('sectionId');
        return new Promise((resolve, reject) => {
            const request = index.getAll(sectionId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getResourcesByType(sectionId, type) {
        const transaction = this.db.transaction(['resources'], 'readonly');
        const store = transaction.objectStore('resources');
        const index = store.index('sectionId');
        return new Promise((resolve, reject) => {
            const request = index.getAll(sectionId);
            request.onsuccess = () => {
                const results = request.result.filter(resource => resource.type === type);
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteResource(id) {
        const transaction = this.db.transaction(['resources'], 'readwrite');
        const store = transaction.objectStore('resources');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllResources() {
        const transaction = this.db.transaction(['resources'], 'readonly');
        const store = transaction.objectStore('resources');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Activity Management
    async saveActivity(activity) {
        const transaction = this.db.transaction(['activities'], 'readwrite');
        const store = transaction.objectStore('activities');
        return new Promise((resolve, reject) => {
            const request = store.put(activity);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getActivities(limit = 1000) {
        const transaction = this.db.transaction(['activities'], 'readonly');
        const store = transaction.objectStore('activities');
        const index = store.index('timestamp');
        return new Promise((resolve, reject) => {
            const request = index.getAll();
            request.onsuccess = () => {
                const results = request.result
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, limit);
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Data Migration from localStorage
    async migrateFromLocalStorage() {
        try {
            // Migrate users
            const users = JSON.parse(localStorage.getItem('hubUsers') || '[]');
            for (const user of users) {
                await this.saveUser(user);
            }

            // Migrate sections
            const sections = JSON.parse(localStorage.getItem('informationHub') || '{}');
            for (const [sectionId, sectionData] of Object.entries(sections)) {
                await this.saveSection({
                    id: sectionId,
                    sectionId: sectionId,
                    name: sectionData.name,
                    icon: sectionData.icon,
                    color: sectionData.color,
                    data: sectionData
                });
            }

            // Migrate resources
            for (const [sectionId, sectionData] of Object.entries(sections)) {
                const resourceTypes = ['playbooks', 'boxLinks', 'dashboards'];
                for (const type of resourceTypes) {
                    if (sectionData[type]) {
                        for (const resource of sectionData[type]) {
                            await this.saveResource({
                                ...resource,
                                sectionId: sectionId,
                                type: type,
                                userId: 1 // Default to admin user
                            });
                        }
                    }
                }
            }

            // Migrate activities
            const activities = JSON.parse(localStorage.getItem('hubActivities') || '[]');
            for (const activity of activities) {
                await this.saveActivity(activity);
            }

            console.log('Data migration completed successfully');
            return true;
        } catch (error) {
            console.error('Data migration failed:', error);
            return false;
        }
    }

    // Export all data
    async exportAllData() {
        try {
            const [users, sections, resources, activities, views] = await Promise.all([
                this.getAllUsers(),
                this.getAllSections(),
                this.getAllResources(),
                this.getActivities(),
                this.getAllViews()
            ]);

            // Merge in any users that exist only in localStorage (fallback)
            let mergedUsers = Array.isArray(users) ? [...users] : [];
            try {
                const lsUsers = JSON.parse(localStorage.getItem('hubUsers') || '[]');
                const byId = new Map(mergedUsers.map(u => [u.id, u]));
                lsUsers.forEach(u => {
                    if (!byId.has(u.id)) {
                        byId.set(u.id, u);
                        // Best-effort: persist into DB for future consistency
                        try { this.saveUser(u); } catch(_) {}
                    }
                });
                mergedUsers = Array.from(byId.values());
            } catch (_) {}

            return {
                users: mergedUsers,
                sections,
                resources,
                activities,
                views,
                exportDate: new Date().toISOString(),
                totalRecords: {
                    users: mergedUsers.length,
                    sections: sections.length,
                    resources: resources.length,
                    activities: activities.length,
                    views: views.length
                }
            };
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }

    // Clear all data
    async clearAllData() {
        const stores = ['users', 'sections', 'resources', 'activities'];
        if (this.db.objectStoreNames.contains('views')) stores.push('views');
        const promises = stores.map(storeName => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            return new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });

        await Promise.all(promises);
        console.log('All data cleared successfully');
    }

    // Views (usage) aggregation
    async recordView(userId, resourceId) {
        const id = `${userId || 'anon'}:${resourceId}`;
        const now = new Date().toISOString();
        const transaction = this.db.transaction(['views'], 'readwrite');
        const store = transaction.objectStore('views');
        return new Promise((resolve, reject) => {
            const getReq = store.get(id);
            getReq.onsuccess = () => {
                const existing = getReq.result;
                const updated = existing ? {
                    ...existing,
                    count: (existing.count || 0) + 1,
                    lastViewedAt: now
                } : {
                    id,
                    userId: userId || null,
                    resourceId,
                    count: 1,
                    firstViewedAt: now,
                    lastViewedAt: now
                };
                const putReq = store.put(updated);
                putReq.onsuccess = () => resolve(updated);
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    }

    async getAllViews() {
        if (!this.db.objectStoreNames.contains('views')) return [];
        const transaction = this.db.transaction(['views'], 'readonly');
        const store = transaction.objectStore('views');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Export raw JSON including localStorage config (backup)
    async exportRawState() {
        const data = await this.exportAllData();
        let local = {};
        try {
            local = {
                sectionOrder: JSON.parse(localStorage.getItem('sectionOrder') || 'null'),
                hubUsers: JSON.parse(localStorage.getItem('hubUsers') || 'null'),
                informationHub: JSON.parse(localStorage.getItem('informationHub') || 'null'),
                hubActivities: JSON.parse(localStorage.getItem('hubActivities') || 'null')
            };
        } catch (_) {}
        return { ...data, localStorage: local };
    }

    async importRawState(json) {
        // Clear DB stores
        await this.clearAllData();
        // Restore DB stores
        const users = json.users || [];
        for (const u of users) await this.saveUser(u);
        const sections = json.sections || [];
        for (const s of sections) await this.saveSection(s);
        const resources = json.resources || [];
        for (const r of resources) await this.saveResource(r);
        const activities = json.activities || [];
        for (const a of activities) await this.saveActivity(a);
        const views = json.views || [];
        if (this.db.objectStoreNames.contains('views')) {
            const tx = this.db.transaction(['views'], 'readwrite');
            const store = tx.objectStore('views');
            await Promise.all(views.map(v => new Promise((resolve, reject) => {
                const req = store.put(v);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            })));
        }
        // Restore localStorage config
        if (json.localStorage) {
            try { if (json.localStorage.sectionOrder) localStorage.setItem('sectionOrder', JSON.stringify(json.localStorage.sectionOrder)); } catch(_){}
            try { if (json.localStorage.hubUsers) localStorage.setItem('hubUsers', JSON.stringify(json.localStorage.hubUsers)); } catch(_){}
            try { if (json.localStorage.informationHub) localStorage.setItem('informationHub', JSON.stringify(json.localStorage.informationHub)); } catch(_){}
            try { if (json.localStorage.hubActivities) localStorage.setItem('hubActivities', JSON.stringify(json.localStorage.hubActivities)); } catch(_){}
        }
        return true;
    }
}

// Initialize database
let hubDatabase;
document.addEventListener('DOMContentLoaded', async () => {
    hubDatabase = new HubDatabase();
    await hubDatabase.init();
    
    // Check if migration is needed
    const migrationDone = localStorage.getItem('dbMigrationDone');
    if (!migrationDone) {
        await hubDatabase.migrateFromLocalStorage();
        localStorage.setItem('dbMigrationDone', 'true');
    }
    
    // Make globally accessible AFTER init + migration
    window.hubDatabase = hubDatabase;
    window.hubDatabaseReady = true;
    document.dispatchEvent(new Event('hubdb-ready'));
});

// Backward compatibility flag
window.hubDatabaseReady = false;

