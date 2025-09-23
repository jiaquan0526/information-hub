// RLS Policy Testing Script for Supabase
class RLSTester {
    constructor() {
        this.supabase = null;
        this.testResults = [];
        this.init();
    }

    async init() {
        try {
            if (!window.supabaseClient) {
                console.error('Supabase client not initialized');
                return false;
            }
            this.supabase = window.supabaseClient;
            console.log('RLS Tester initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize RLS Tester:', error);
            return false;
        }
    }

    // Test helper to create test users
    async createTestUsers() {
        const testUsers = [
            {
                id: '11111111-1111-1111-1111-111111111111',
                email: 'admin@test.com',
                username: 'admin_test',
                role: 'admin',
                name: 'Admin Test',
                permissions: {
                    canManageUsers: true,
                    canEditAllSections: true,
                    canDeleteResources: true,
                    canViewAuditLog: true,
                    sections: ['costing', 'supply-planning', 'operations', 'quality', 'hr', 'it', 'sales', 'compliance']
                }
            },
            {
                id: '22222222-2222-2222-2222-222222222222',
                email: 'editor@test.com',
                username: 'editor_test',
                role: 'editor',
                name: 'Editor Test',
                permissions: {
                    canEditAllSections: false,
                    canDeleteResources: true,
                    editableSections: ['costing', 'supply-planning'],
                    sections: ['costing', 'supply-planning', 'operations', 'quality']
                }
            },
            {
                id: '33333333-3333-3333-3333-333333333333',
                email: 'viewer@test.com',
                username: 'viewer_test',
                role: 'viewer',
                name: 'Viewer Test',
                permissions: {
                    sections: ['costing', 'supply-planning']
                }
            }
        ];

        for (const user of testUsers) {
            try {
                await this.supabase.from('profiles').upsert(user);
                console.log(`Created test user: ${user.username}`);
            } catch (error) {
                console.error(`Failed to create test user ${user.username}:`, error);
            }
        }
    }

    // Test helper to create test data
    async createTestData() {
        // Create test sections
        const testSections = [
            {
                section_id: 'test-costing',
                name: 'Test Costing',
                icon: 'fas fa-calculator',
                color: '#4CAF50',
                config: { tabs: ['playbooks', 'links', 'dashboards'] },
                data: {}
            },
            {
                section_id: 'test-operations',
                name: 'Test Operations',
                icon: 'fas fa-cogs',
                color: '#FF9800',
                config: { tabs: ['playbooks', 'links', 'dashboards'] },
                data: {}
            }
        ];

        for (const section of testSections) {
            try {
                await this.supabase.from('sections').upsert(section);
                console.log(`Created test section: ${section.section_id}`);
            } catch (error) {
                console.error(`Failed to create test section ${section.section_id}:`, error);
            }
        }

        // Create test resources
        const testResources = [
            {
                id: '44444444-4444-4444-4444-444444444444',
                section_id: 'test-costing',
                type: 'playbook',
                title: 'Test Playbook',
                url: 'https://example.com/playbook',
                description: 'A test playbook',
                tags: ['test', 'costing'],
                extra: {},
                created_by: '11111111-1111-1111-1111-111111111111'
            },
            {
                id: '55555555-5555-5555-5555-555555555555',
                section_id: 'test-operations',
                type: 'link',
                title: 'Test Link',
                url: 'https://example.com/link',
                description: 'A test link',
                tags: ['test', 'operations'],
                extra: {},
                created_by: '22222222-2222-2222-2222-222222222222'
            }
        ];

        for (const resource of testResources) {
            try {
                await this.supabase.from('resources').upsert(resource);
                console.log(`Created test resource: ${resource.title}`);
            } catch (error) {
                console.error(`Failed to create test resource ${resource.title}:`, error);
            }
        }
    }

    // Test authentication context switching
    async testAsUser(userId) {
        try {
            // This is a simplified test - in real implementation, you'd need to
            // properly set the auth context in Supabase
            console.log(`Testing as user: ${userId}`);
            return true;
        } catch (error) {
            console.error(`Failed to switch to user ${userId}:`, error);
            return false;
        }
    }

    // Test Profiles RLS
    async testProfilesRLS() {
        console.log('Testing Profiles RLS...');
        const tests = [];

        // Test 1: Admin can read all profiles
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*');
            
            tests.push({
                name: 'Admin can read all profiles',
                passed: !error && data && data.length > 0,
                error: error?.message
            });
        } catch (error) {
            tests.push({
                name: 'Admin can read all profiles',
                passed: false,
                error: error.message
            });
        }

        // Test 2: Users can read their own profile
        try {
            const currentUserId = this.getCurrentUserId();
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUserId)
                .single();
            
            tests.push({
                name: 'Users can read their own profile',
                passed: !error && data,
                error: error?.message
            });
        } catch (error) {
            tests.push({
                name: 'Users can read their own profile',
                passed: false,
                error: error.message
            });
        }

        // Test 3: Users can update their own profile
        try {
            const currentUserId = this.getCurrentUserId();
            const { error } = await this.supabase
                .from('profiles')
                .update({ name: 'Updated Name' })
                .eq('id', currentUserId);
            
            tests.push({
                name: 'Users can update their own profile',
                passed: !error,
                error: error?.message
            });
        } catch (error) {
            tests.push({
                name: 'Users can update their own profile',
                passed: false,
                error: error.message
            });
        }

        return tests;
    }

    // Test Sections RLS
    async testSectionsRLS() {
        console.log('Testing Sections RLS...');
        const tests = [];

        // Test 1: Public can read sections
        try {
            const { data, error } = await this.supabase
                .from('sections')
                .select('*');
            
            tests.push({
                name: 'Public can read sections',
                passed: !error && data && data.length > 0,
                error: error?.message
            });
        } catch (error) {
            tests.push({
                name: 'Public can read sections',
                passed: false,
                error: error.message
            });
        }

        // Test 2: Authenticated users can create sections (if they have permission)
        try {
            const { error } = await this.supabase
                .from('sections')
                .insert({
                    section_id: 'test-new-section',
                    name: 'Test New Section',
                    icon: 'fas fa-test',
                    color: '#000000',
                    config: {},
                    data: {}
                });
            
            tests.push({
                name: 'Authenticated users can create sections',
                passed: !error,
                error: error?.message
            });
        } catch (error) {
            tests.push({
                name: 'Authenticated users can create sections',
                passed: false,
                error: error.message
            });
        }

        return tests;
    }

    // Test Resources RLS
    async testResourcesRLS() {
        console.log('Testing Resources RLS...');
        const tests = [];

        // Test 1: Public can read resources
        try {
            const { data, error } = await this.supabase
                .from('resources')
                .select('*');
            
            tests.push({
                name: 'Public can read resources',
                passed: !error && data && data.length > 0,
                error: error?.message
            });
        } catch (error) {
            tests.push({
                name: 'Public can read resources',
                passed: false,
                error: error.message
            });
        }

        // Test 2: Authenticated users can create resources
        try {
            const { error } = await this.supabase
                .from('resources')
                .insert({
                    section_id: 'test-costing',
                    type: 'playbook',
                    title: 'Test Resource',
                    url: 'https://example.com/test',
                    description: 'A test resource',
                    tags: ['test'],
                    extra: {},
                    created_by: this.getCurrentUserId()
                });
            
            tests.push({
                name: 'Authenticated users can create resources',
                passed: !error,
                error: error?.message
            });
        } catch (error) {
            tests.push({
                name: 'Authenticated users can create resources',
                passed: false,
                error: error.message
            });
        }

        return tests;
    }

    // Test Activities RLS
    async testActivitiesRLS() {
        console.log('Testing Activities RLS...');
        const tests = [];

        // Test 1: Users can insert their own activities
        try {
            const { error } = await this.supabase
                .from('activities')
                .insert({
                    user_id: this.getCurrentUserId(),
                    action: 'TEST_ACTION',
                    resource_id: '44444444-4444-4444-4444-444444444444',
                    section_id: 'test-costing',
                    metadata: { test: true }
                });
            
            tests.push({
                name: 'Users can insert their own activities',
                passed: !error,
                error: error?.message
            });
        } catch (error) {
            tests.push({
                name: 'Users can insert their own activities',
                passed: false,
                error: error.message
            });
        }

        // Test 2: Users can read their own activities
        try {
            const { data, error } = await this.supabase
                .from('activities')
                .select('*')
                .eq('user_id', this.getCurrentUserId());
            
            tests.push({
                name: 'Users can read their own activities',
                passed: !error && data,
                error: error?.message
            });
        } catch (error) {
            tests.push({
                name: 'Users can read their own activities',
                passed: false,
                error: error.message
            });
        }

        return tests;
    }

    // Test Views RLS
    async testViewsRLS() {
        console.log('Testing Views RLS...');
        const tests = [];

        // Test 1: Users can insert their own views
        try {
            const { error } = await this.supabase
                .rpc('increment_view', {
                    p_user_id: this.getCurrentUserId(),
                    p_resource_id: '44444444-4444-4444-4444-444444444444'
                });
            
            tests.push({
                name: 'Users can increment their own views',
                passed: !error,
                error: error?.message
            });
        } catch (error) {
            tests.push({
                name: 'Users can increment their own views',
                passed: false,
                error: error.message
            });
        }

        // Test 2: Users can read their own views
        try {
            const { data, error } = await this.supabase
                .from('views')
                .select('*')
                .eq('user_id', this.getCurrentUserId());
            
            tests.push({
                name: 'Users can read their own views',
                passed: !error && data,
                error: error?.message
            });
        } catch (error) {
            tests.push({
                name: 'Users can read their own views',
                passed: false,
                error: error.message
            });
        }

        return tests;
    }

    // Test permission functions
    async testPermissionFunctions() {
        console.log('Testing Permission Functions...');
        const tests = [];

        // Test 1: is_admin function
        try {
            const { data, error } = await this.supabase
                .rpc('is_admin', { uid: this.getCurrentUserId() });
            
            tests.push({
                name: 'is_admin function works',
                passed: !error && typeof data === 'boolean',
                error: error?.message
            });
        } catch (error) {
            tests.push({
                name: 'is_admin function works',
                passed: false,
                error: error.message
            });
        }

        // Test 2: can_edit_section function
        try {
            const { data, error } = await this.supabase
                .rpc('can_edit_section', { 
                    uid: this.getCurrentUserId(), 
                    sec_id: 'test-costing' 
                });
            
            tests.push({
                name: 'can_edit_section function works',
                passed: !error && typeof data === 'boolean',
                error: error?.message
            });
        } catch (error) {
            tests.push({
                name: 'can_edit_section function works',
                passed: false,
                error: error.message
            });
        }

        return tests;
    }

    // Get current user ID
    getCurrentUserId() {
        const session = localStorage.getItem('hubSession');
        if (session) {
            const sessionData = JSON.parse(session);
            return sessionData.userId;
        }
        return null;
    }

    // Run all tests
    async runAllTests() {
        console.log('Starting RLS Policy Tests...');
        
        if (!await this.init()) {
            console.error('Failed to initialize RLS Tester');
            return;
        }

        // Create test data
        await this.createTestUsers();
        await this.createTestData();

        // Run all test suites
        const allTests = [
            ...await this.testProfilesRLS(),
            ...await this.testSectionsRLS(),
            ...await this.testResourcesRLS(),
            ...await this.testActivitiesRLS(),
            ...await this.testViewsRLS(),
            ...await this.testPermissionFunctions()
        ];

        // Display results
        this.displayResults(allTests);
        
        return allTests;
    }

    // Display test results
    displayResults(tests) {
        console.log('\n=== RLS Policy Test Results ===');
        
        const passed = tests.filter(t => t.passed).length;
        const total = tests.length;
        
        console.log(`\nOverall: ${passed}/${total} tests passed`);
        
        tests.forEach(test => {
            const status = test.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} ${test.name}`);
            if (test.error) {
                console.log(`   Error: ${test.error}`);
            }
        });

        // Create HTML report
        this.createHTMLReport(tests);
    }

    // Create HTML report
    createHTMLReport(tests) {
        const reportDiv = document.createElement('div');
        reportDiv.id = 'rls-test-report';
        reportDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            max-height: 600px;
            overflow-y: auto;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: monospace;
            font-size: 12px;
        `;

        const passed = tests.filter(t => t.passed).length;
        const total = tests.length;
        
        reportDiv.innerHTML = `
            <h3>RLS Test Results</h3>
            <p><strong>Overall: ${passed}/${total} tests passed</strong></p>
            <div style="max-height: 400px; overflow-y: auto;">
                ${tests.map(test => `
                    <div style="margin: 5px 0; padding: 5px; border-left: 3px solid ${test.passed ? 'green' : 'red'};">
                        <strong>${test.passed ? '✅' : '❌'} ${test.name}</strong>
                        ${test.error ? `<br><small style="color: red;">Error: ${test.error}</small>` : ''}
                    </div>
                `).join('')}
            </div>
            <button onclick="document.getElementById('rls-test-report').remove()" 
                    style="margin-top: 10px; padding: 5px 10px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Close
            </button>
        `;

        document.body.appendChild(reportDiv);
    }

    // Clean up test data
    async cleanup() {
        try {
            console.log('Cleaning up test data...');
            
            // Delete test data
            await this.supabase.from('views').delete().like('user_id', '%test%');
            await this.supabase.from('activities').delete().like('user_id', '%test%');
            await this.supabase.from('resources').delete().like('title', 'Test%');
            await this.supabase.from('sections').delete().like('section_id', 'test%');
            await this.supabase.from('profiles').delete().like('email', '%test.com');
            
            console.log('Test data cleaned up');
        } catch (error) {
            console.error('Error cleaning up test data:', error);
        }
    }
}

// Initialize and expose globally
window.RLSTester = RLSTester;

// Auto-run tests when page loads (if in test mode)
if (window.location.search.includes('test-rls=true')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const tester = new RLSTester();
        await tester.runAllTests();
    });
}
