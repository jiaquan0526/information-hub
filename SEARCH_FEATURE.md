# Global Resource Search Feature

## Overview
A comprehensive search system that allows users to search across all resources (any resource type, not just playbooks, box-links, or dashboards) with keyword highlighting and filtering capabilities.

## Features

### 🔍 Search Capabilities
- **Full-text search** across:
  - Title (primary)
  - Description/Intro (primary)
  - URL (primary)
  - Tags
  - Category
  
### 🎯 Filtering
- **Section Filter**: Filter resources by specific sections
- **Type Filter**: Filter by resource type (playbooks, dashboards, box-links, custom types, etc.)
- Filters dynamically populate based on user's accessible content

### 🔐 Permission-Aware
- Respects user permissions at the section level
- Users only see resources from sections they have access to:
  - **Admins**: See all resources across all sections
  - **Users with `canViewAllSections`**: See all resources
  - **Regular users**: Only see resources from their assigned sections
- Section and type filters only show options the user can access

### ✨ User Experience
- **Keyword highlighting**: Matching text is highlighted in yellow
- **Real-time results**: Updates as you type
- **Result count**: Shows number of matching resources
- **Dropdown results panel**: Clean, organized display
- **Click to open**: Click any result to open its URL in a new tab
- **Clear button**: Quickly reset search and filters
- **Auto-close**: Results panel closes when clicking outside

### 📋 Result Display
Each search result shows:
1. **Title** (with keyword highlighting)
2. **Description** (truncated to 150 chars, with highlighting)
3. **URL** (clickable link, truncated to 60 chars)
4. **Metadata badges**:
   - Section name with icon
   - Resource type
   - Category (if available)

## User Interface

### Location
The search bar is positioned at the **top of the page**, between the header (with info bar) and the section cards grid.

### Layout
```
┌─────────────────────────────────────────┐
│ [🔍] Search all resources...       [✕]  │
├─────────────────────────────────────────┤
│ [All Sections ▼] [All Types ▼] X results│
└─────────────────────────────────────────┘
        ↓ (when searching)
┌─────────────────────────────────────────┐
│ Search Results                           │
├─────────────────────────────────────────┤
│ ▶ Resource Title                        │
│   Description text with highlighted...  │
│   🔗 https://example.com/resource       │
│   [Section] [Type] [Category]           │
├─────────────────────────────────────────┤
│ ▶ Another Resource                      │
│   ...                                   │
└─────────────────────────────────────────┘
```

## Technical Implementation

### Files Modified
1. **index.html** - Added search bar HTML
2. **styles.css** - Added comprehensive search styling
3. **hub-script.js** - Added `GlobalResourceSearch` class

### Key Classes/Functions

#### `GlobalResourceSearch`
Main search class with methods:
- `init()` - Initialize search components
- `loadResources()` - Load resources with permission filtering
- `getCurrentUserWithPermissions()` - Get current user's role and permissions
- `getAllowedSections()` - Determine which sections user can access
- `handleSearch()` - Process search query and filters
- `displayResults()` - Render search results
- `refresh()` - Reload resources after changes

### Permission Logic
```javascript
// Admin or special permissions = see all
if (role === 'admin' || permissions.canViewAllSections || sections.includes('*')) {
    return all resources;
}

// Regular user = only assigned sections
return resources.filter(r => userSections.includes(r.section_id));
```

## Usage

### For End Users
1. Type keywords in the search box
2. Optionally select section/type filters
3. Click any result to open its URL
4. Click ✕ to clear search

### For Developers
Refresh search after adding/editing resources:
```javascript
// After adding or modifying resources
if (window.globalResourceSearch) {
    await window.globalResourceSearch.refresh();
}
```

## Performance
- **Limit**: Results limited to 50 items for performance
- **Lazy loading**: Search initializes after page load (2 second delay)
- **Permission caching**: User permissions loaded once per session
- **Efficient filtering**: Uses Supabase query filtering when possible

## Accessibility
- Keyboard navigation support
- ARIA labels on interactive elements
- High contrast highlighting
- Clear visual feedback
- Responsive design for mobile devices

## Mobile Responsive
- Stacked filter layout on small screens
- Touch-friendly buttons and result items
- Optimized result panel height (400px on mobile)
- Full-width search input

## Future Enhancements
Potential improvements:
- [ ] Fuzzy search (typo tolerance)
- [ ] Search history
- [ ] Keyboard shortcuts (Ctrl+K to focus)
- [ ] Export search results
- [ ] Advanced filters (date range, creator, etc.)
- [ ] Save favorite searches
- [ ] Search analytics

## Troubleshooting

### Search not showing results
1. Check browser console for errors
2. Verify user has section permissions
3. Ensure resources exist in database
4. Check Supabase connection

### Filters not populating
1. Verify sections are loaded
2. Check user permissions
3. Ensure resources have proper section_id

### Permissions not working
1. Verify user profile has correct permissions object
2. Check role assignment
3. Ensure sections array is populated

## Support
For issues or questions, check:
- Browser console logs (prefixed with `[GlobalSearch]`)
- User permissions in admin panel
- Section visibility settings

