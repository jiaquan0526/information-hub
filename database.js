// Database System for Information Hub - Supabase Implementation
class HubDatabase {
    constructor() {
        this.supabase = null;
        this.init();
    }

    async init() {
        try {
            // Ensure Supabase client is available
            if (!window.supabaseClient) {
                console.error('Supabase client not initialized');
                return false;
            }
            this.supabase = window.supabaseClient;
            console.log('Supabase database initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Supabase database:', error);
            return false;
        }
    }

    // Helper method to get current user ID
    getCurrentUserId() {
        const session = localStorage.getItem('hubSession');
        if (session) {
            const sessionData = JSON.parse(session);
            return sessionData.userId;
        }
        return null;
    }

    // User Management
    async saveUser(user) {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    username: user.username,
                    role: user.role || 'viewer',
                    name: user.name,
                    email: user.email,
                    permissions: user.permissions || {}
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving user:', error);
            throw error;
        }
    }

    async getUser(id) {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    async getAllUsers() {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }

    async deleteUser(id) {
        try {
            const { error } = await this.supabase
                .from('profiles')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    // Section Management
    async saveSection(section) {
        try {
            const { data, error } = await this.supabase
                .from('sections')
                .upsert({
                    section_id: section.sectionId || section.id,
                    name: section.name,
                    icon: section.icon,
                    color: section.color,
                    config: section.config || {},
                    data: section.data || {}
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving section:', error);
            throw error;
        }
    }

    async getSection(sectionId) {
        try {
            const { data, error } = await this.supabase
                .from('sections')
                .select('*')
                .eq('section_id', sectionId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting section:', error);
            return null;
        }
    }

    async getAllSections() {
        try {
            const { data, error } = await this.supabase
                .from('sections')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting all sections:', error);
            return [];
        }
    }

    // Section configuration helpers
    async saveSectionConfig(sectionId, config) {
        try {
            const { data, error } = await this.supabase
                .from('sections')
                .update({ config: config || {} })
                .eq('section_id', sectionId);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving section config:', error);
            throw error;
        }
    }

    async getSectionConfig(sectionId) {
        try {
            const section = await this.getSection(sectionId);
            return section ? section.config : null;
        } catch (error) {
            console.error('Error getting section config:', error);
            return null;
        }
    }

    // Resource Management
    async saveResource(resource) {
        try {
            const { data, error } = await this.supabase
                .from('resources')
                .upsert({
                    id: resource.id,
                    section_id: resource.sectionId,
                    type: resource.type,
                    title: resource.title,
                    url: resource.url,
                    description: resource.description,
                    tags: resource.tags || [],
                    extra: resource.extra || {},
                    created_by: resource.userId || this.getCurrentUserId()
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving resource:', error);
            throw error;
        }
    }

    async getResource(id) {
        try {
            const { data, error } = await this.supabase
                .from('resources')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting resource:', error);
            return null;
        }
    }

    async getResourcesBySection(sectionId) {
        try {
            const { data, error } = await this.supabase
                .from('resources')
                .select('*')
                .eq('section_id', sectionId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting resources by section:', error);
            return [];
        }
    }

    async getResourcesByType(sectionId, type) {
        try {
            const { data, error } = await this.supabase
                .from('resources')
                .select('*')
                .eq('section_id', sectionId)
                .eq('type', type)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting resources by type:', error);
            return [];
        }
    }

    async deleteResource(id) {
        try {
            const { error } = await this.supabase
                .from('resources')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting resource:', error);
            throw error;
        }
    }

    async getAllResources() {
        try {
            const { data, error } = await this.supabase
                .from('resources')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting all resources:', error);
            return [];
        }
    }

    // Activity Management
    async saveActivity(activity) {
        try {
            const { data, error } = await this.supabase
                .from('activities')
                .insert({
                    user_id: activity.userId || this.getCurrentUserId(),
                    action: activity.action,
                    resource_id: activity.resourceId,
                    section_id: activity.sectionId,
                    metadata: activity.metadata || {}
                });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving activity:', error);
            throw error;
        }
    }

    async getActivities(limit = 1000) {
        try {
            const { data, error } = await this.supabase
                .from('activities')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting activities:', error);
            return [];
        }
    }

    // Views Management
    async recordView(userId, resourceId) {
        try {
            // Use the RPC function for safe increment
            const { error } = await this.supabase
                .rpc('increment_view', {
                    p_user_id: userId,
                    p_resource_id: resourceId
                });
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error recording view:', error);
            throw error;
        }
    }

    async getAllViews() {
        try {
            const { data, error } = await this.supabase
                .from('views')
                .select('*')
                .order('last_viewed_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting all views:', error);
            return [];
        }
    }

    // Data Migration from IndexedDB
    async migrateFromLocalStorage() {
        try {
            console.log('Starting migration from localStorage to Supabase...');
            
            // Check if migration already completed
            const migrationDone = localStorage.getItem('supabaseMigrationDone');
            if (migrationDone) {
                console.log('Migration already completed');
                return true;
            }

            // Migrate users
            const users = JSON.parse(localStorage.getItem('hubUsers') || '[]');
            for (const user of users) {
                await this.saveUser(user);
            }

            // Migrate sections
            const sections = JSON.parse(localStorage.getItem('informationHub') || '{}');
            for (const [sectionId, sectionData] of Object.entries(sections)) {
                await this.saveSection({
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

            // Mark migration as complete
            localStorage.setItem('supabaseMigrationDone', 'true');
            console.log('Migration completed successfully');
            return true;
        } catch (error) {
            console.error('Migration failed:', error);
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

            return {
                users,
                sections,
                resources,
                activities,
                views,
                exportDate: new Date().toISOString(),
                totalRecords: {
                    users: users.length,
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

    // Clear all data (admin only)
    async clearAllData() {
        try {
            const userId = this.getCurrentUserId();
            if (!userId) throw new Error('Not authenticated');

            // Check if user is admin
            const user = await this.getUser(userId);
            if (!user || user.role !== 'admin') {
                throw new Error('Only admins can clear all data');
            }

            // Delete in reverse order of dependencies
            await this.supabase.from('views').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await this.supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await this.supabase.from('resources').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await this.supabase.from('sections').delete().neq('section_id', '');
            // Note: Don't delete profiles as they're linked to auth.users

            console.log('All data cleared successfully');
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    }

    // Raw state export (for backup)
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

    // Import raw state (for restore)
    async importRawState(json) {
        try {
            // Clear existing data
            await this.clearAllData();

            // Restore data
            if (json.users && Array.isArray(json.users)) {
                for (const user of json.users) {
                    await this.saveUser(user);
                }
            }

            if (json.sections && Array.isArray(json.sections)) {
                for (const section of json.sections) {
                    await this.saveSection(section);
                }
            }

            if (json.resources && Array.isArray(json.resources)) {
                for (const resource of json.resources) {
                    await this.saveResource(resource);
                }
            }

            if (json.activities && Array.isArray(json.activities)) {
                for (const activity of json.activities) {
                    await this.saveActivity(activity);
                }
            }

            // Restore localStorage config
            if (json.localStorage) {
                try { 
                    if (json.localStorage.sectionOrder) 
                        localStorage.setItem('sectionOrder', JSON.stringify(json.localStorage.sectionOrder)); 
                } catch(_){}
                try { 
                    if (json.localStorage.hubUsers) 
                        localStorage.setItem('hubUsers', JSON.stringify(json.localStorage.hubUsers)); 
                } catch(_){}
                try { 
                    if (json.localStorage.informationHub) 
                        localStorage.setItem('informationHub', JSON.stringify(json.localStorage.informationHub)); 
                } catch(_){}
                try { 
                    if (json.localStorage.hubActivities) 
                        localStorage.setItem('hubActivities', JSON.stringify(json.localStorage.hubActivities)); 
                } catch(_){}
            }

            return true;
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    }
}

// Initialize database
let hubDatabase;
document.addEventListener('DOMContentLoaded', async () => {
    hubDatabase = new HubDatabase();
    await hubDatabase.init();
    
    // Check if migration is needed
    const migrationDone = localStorage.getItem('supabaseMigrationDone');
    if (!migrationDone) {
        await hubDatabase.migrateFromLocalStorage();
    }
    
    // Make globally accessible
    window.hubDatabase = hubDatabase;
    window.hubDatabaseReady = true;
    document.dispatchEvent(new Event('hubdb-ready'));
});

// Backward compatibility flag
window.hubDatabaseReady = false;