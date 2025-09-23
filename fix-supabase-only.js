// Script to fix all localStorage references to use Supabase only
const fs = require('fs');

// Read the index.html file
let content = fs.readFileSync('index.html', 'utf8');

// List of functions that should use Supabase instead of localStorage
const functionsToFix = [
    'getAllAvailableSections',
    'getAssignableSectionsForCurrentUser', 
    'getSectionDisplayNames',
    'syncSectionOrder',
    'updateMainHubSections'
];

// Replace localStorage.getItem('sectionOrder') with database calls
content = content.replace(
    /localStorage\.getItem\('sectionOrder'\)/g,
    'await hubDatabase.getAllSections()'
);

// Replace localStorage.setItem('sectionOrder') with database calls
content = content.replace(
    /localStorage\.setItem\('sectionOrder'/g,
    '// NO localStorage - use Supabase only'
);

// Remove localStorage initialization
content = content.replace(
    /if \(!localStorage\.getItem\('sectionOrder'\)\) \{[\s\S]*?localStorage\.setItem\('sectionOrder'[^}]*\}/g,
    '// NO localStorage initialization - use Supabase only'
);

// Replace fallback sections with database error
content = content.replace(
    /visibleSections = \['costing', 'supply-planning', 'operations', 'quality', 'hr', 'it', 'sales', 'compliance'\];/g,
    'console.error("CRITICAL: Database failed - no fallback sections"); return;'
);

// Write the fixed content back
fs.writeFileSync('index.html', content);

console.log('Fixed localStorage references to use Supabase only');
