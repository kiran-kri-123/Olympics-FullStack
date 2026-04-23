# Testing Guide - Olympics Dashboard

## Test Environment Setup

### Prerequisites
- Backend running on http://localhost:5000
- Frontend running on http://localhost:5173
- MongoDB populated with Olympics data
- Browser DevTools open (F12)

## Unit Testing Scenarios

### 1. FilterPanel Component Tests

#### Test 1.1: Filter Input Changes
```
Given: FilterPanel component is rendered
When: User types in search box "Michael"
Then: onChange callback is called with {search: "Michael"}
```

#### Test 1.2: Dropdown Selection
```
Given: FilterPanel with country dropdown populated
When: User selects "USA"
Then: onChange callback is called with {country: "USA"}
```

#### Test 1.3: Reset Button
```
Given: FilterPanel with multiple filters selected
When: User clicks "Reset Filters"
Then: All filters reset to empty strings
And: onChange callback is called with empty object
```

#### Test 1.4: Disabled State During Loading
```
Given: FilterPanel with loading={true}
When: Component renders
Then: All inputs and buttons are disabled
And: Loading indicator is visible
```

### 2. AthletesTable Component Tests

#### Test 2.1: Table Rendering
```
Given: AthletesTable with athlete records
When: Component renders
Then: Table displays correct number of rows
And: All columns are populated with data
```

#### Test 2.2: Medal Color Coding
```
Given: AthletesTable with various medals
When: Component renders
Then: Gold medals show yellow badge
And: Silver medals show gray badge
And: Bronze medals show bronze badge
And: No medals show gray badge
```

#### Test 2.3: Loading State
```
Given: AthletesTable with loading={true}
When: Component renders
Then: Loading message appears
And: Animated dots appear
```

#### Test 2.4: Error State
```
Given: AthletesTable with error="Connection failed"
When: Component renders
Then: Error message is displayed
```

#### Test 2.5: Empty State
```
Given: AthletesTable with empty athletes array
When: Component renders
Then: "No athletes found" message appears
```

### 3. Dashboard Component Tests

#### Test 3.1: Initial Data Load
```
Given: Dashboard component mounts
When: Component initializes
Then: API calls getAthletes and getSummary
And: Filter options are populated
And: Initial data is displayed
```

#### Test 3.2: Filter Changes Trigger Updates
```
Given: Dashboard with initial data loaded
When: User changes country filter to "USA"
And: 300ms debounce timer completes
Then: getAthletes called with {country: "USA"}
And: Table updates with filtered data
```

#### Test 3.3: Multiple Filter Combinations
```
Given: Dashboard with no filters applied
When: User selects Country="USA", Medal="Gold", Sport="Swimming"
And: 300ms debounce completes
Then: getAthletes called with all three filters
And: Table shows only USA swimming gold medalists
```

#### Test 3.4: Reset Filters
```
Given: Dashboard with filters applied
When: User clicks Reset Filters
Then: All filters clear
And: Table reverts to showing all athletes
```

### 4. API Service Tests

#### Test 4.1: getAthletes Success
```
Given: API service initialized
When: getAthletes({country: "USA"}) is called
Then: HTTP GET request sent to /athletes?country=USA
And: Response parsed correctly
And: Returns {total, records} object
```

#### Test 4.2: getAthletes Error
```
Given: API service initialized
When: getAthletes() called and API returns 500
Then: Error is thrown
And: Error message is propagated
```

#### Test 4.3: getSummary Success
```
Given: API service initialized
When: getSummary() is called
Then: HTTP GET request sent to /summary
And: Returns summary object with statistics
```

#### Test 4.4: Query Parameter Serialization
```
Given: API service with filters
When: getAthletes({search:"John", medal:"Gold", year:"2020"})
Then: URL includes all query parameters
And: Parameters are properly encoded
```

## Integration Testing

### Test 5.1: Complete Filter Workflow
```
Scenario: Filter USA swimmers
1. Open dashboard
2. Select Country: "USA"
   ✓ Dropdown updates
   ✓ Loading indicator shows
   ✓ Table updates after 300ms
3. Select Sport: "Swimming"
   ✓ Dropdown updates
   ✓ Loading indicator shows
   ✓ Table updates with swimming athletes only
4. Click Reset Filters
   ✓ Filters clear
   ✓ Table shows all athletes again
```

### Test 5.2: Search Functionality
```
Scenario: Search for athlete by name
1. Type "Michael" in search box
2. Wait 300ms
   ✓ Table updates with matching athletes
3. Clear search
   ✓ All athletes appear again
```

### Test 5.3: Data Consistency
```
Scenario: Verify data accuracy
1. Filter Country: "USA"
   ✓ Total count matches backend
   ✓ All records show region="USA"
2. Filter Medal: "Gold"
   ✓ All records show medal="Gold"
3. Filter Year: "2020"
   ✓ All records show year=2020
```

## Performance Testing

### Test 6.1: Initial Load Performance
```
Measurement: Time to display initial data
Expected: < 2 seconds from page load
Steps:
1. Clear browser cache
2. Hard refresh page (Ctrl+Shift+R)
3. Measure time until Dashboard fully renders
Expected: Summary data + Athletes table visible
```

### Test 6.2: Filter Response Time
```
Measurement: Time from filter change to table update
Expected: < 500ms (300ms debounce + API + render)
Steps:
1. Change filter
2. Note time
3. Wait for table to update
Verify: All 25 rows render smoothly without jank
```

### Test 6.3: Debounce Effectiveness
```
Measurement: Number of API calls during rapid filtering
Setup: Rapid filter changes (10 changes in 2 seconds)
Expected: Only 2-3 API calls made (not 10)
Steps:
1. Open Network tab in DevTools
2. Make rapid filter changes
3. Count GET requests to /athletes
Expected: ~2-3 requests despite 10 changes
```

### Test 6.4: Animation Smoothness
```
Measurement: Animation frame rate
Expected: 60fps during transitions
Steps:
1. Open DevTools Performance tab
2. Record while applying filters
3. Check animation smoothness
Verify: No dropped frames, smooth animations
```

## Responsive Design Testing

### Test 7.1: Desktop (1920x1080)
```
Visual Checks:
✓ Sidebar visible on left
✓ Table takes full width
✓ All columns visible
✓ No horizontal scrolling needed
✓ Stats panel fully visible
✓ Hover effects work
✓ Dropdown menus position correctly
```

### Test 7.2: Tablet (768x1024)
```
Visual Checks:
✓ Single column layout
✓ Sidebar stacks above table
✓ Touch targets >= 48px
✓ Text readable without zoom
✓ Dropdowns open correctly
✓ Table horizontal scroll works
✓ No overlapping elements
```

### Test 7.3: Mobile (375x667)
```
Visual Checks:
✓ Sidebar stacks above content
✓ Table scrollable horizontally
✓ Filters accessible
✓ Buttons easy to tap (>48px)
✓ Text sizes readable
✓ No overflow
✓ Smooth scrolling
```

## Browser Compatibility Testing

### Test 8.1: Chrome
```
✓ All features work
✓ Gradients render correctly
✓ Animations smooth
✓ Console no errors
```

### Test 8.2: Firefox
```
✓ All features work
✓ Custom scrollbar visible
✓ Animations smooth
✓ Console no errors
```

### Test 8.3: Safari
```
✓ All features work
✓ Flexbox layout correct
✓ Gradients render correctly
✓ Console no errors
```

### Test 8.4: Edge
```
✓ All features work
✓ Grid layout correct
✓ Animations smooth
✓ Console no errors
```

## Error Scenario Testing

### Test 9.1: Backend Connection Error
```
Steps:
1. Stop backend server
2. Refresh frontend
3. Try to use filters
Expected:
✓ Error message shown
✓ App doesn't crash
✓ Can try again when backend returns
```

### Test 9.2: Invalid Filter Value
```
Steps:
1. Enter invalid filter value
2. Try to submit
Expected:
✓ Backend ignores invalid value
✓ Graceful degradation
✓ No error to user if valid fallback
```

### Test 9.3: Empty Results
```
Steps:
1. Apply filters that match no records
2. Observe result
Expected:
✓ "No athletes found" message
✓ Table doesn't show
✓ Count shows 0
✓ No loading spinner stuck
```

### Test 9.4: Slow Network
```
Steps:
1. Throttle network to 3G in DevTools
2. Apply filter
Expected:
✓ Loading indicator appears
✓ Data eventually loads
✓ No double-loading
✓ Smooth experience
```

## User Acceptance Testing

### Test 10.1: Can User Filter by Country?
```
✓ User can select country from dropdown
✓ Results update showing only that country
✓ Count accurately reflects filtered data
✓ User can select different country
✓ Results update correctly
✓ User can reset to see all countries
```

### Test 10.2: Can User Filter by Medal?
```
✓ User can select Gold
✓ Results show only Gold medalists
✓ User can select Silver
✓ Results update to Silver medalists
✓ User can select "All Medals"
✓ Results show all athletes
```

### Test 10.3: Can User Filter by Sport?
```
✓ User can select sport from dropdown
✓ Results show only that sport
✓ Can combine with country filter
✓ Results show country + sport combo
✓ Can reset sport filter
```

### Test 10.4: Can User Search for Athlete?
```
✓ User can type name in search
✓ Results show matching athletes
✓ Case-insensitive search works
✓ Partial name matches work
✓ User can clear search
✓ Results reset
```

### Test 10.5: Is Data Accurate?
```
✓ Total count is correct
✓ Filtered counts are accurate
✓ Athlete information is complete
✓ Medals display correctly
✓ Countries match filter selection
✓ Years match selection
```

## Manual Test Checklist

```
[ ] Dashboard loads without errors
[ ] Summary statistics display
[ ] Filter panel visible
[ ] Athletes table visible
[ ] Search box works
[ ] Country dropdown works
[ ] Medal dropdown works
[ ] Sport dropdown works
[ ] Year dropdown works
[ ] Reset button works
[ ] Filters update table in real-time
[ ] Loading indicator appears during fetch
[ ] Error messages display properly
[ ] Empty state message shows when no results
[ ] Table displays correct data
[ ] Medal badges have correct colors
[ ] Responsive design works on mobile
[ ] Responsive design works on tablet
[ ] Responsive design works on desktop
[ ] Animations are smooth
[ ] Hover effects work
[ ] Focus indicators visible for accessibility
[ ] All links/buttons functional
[ ] No console errors
[ ] Network requests are reasonable
[ ] Performance is acceptable
```

## Automation Test Framework Setup (Optional)

### Recommended Tools
- Jest for unit tests
- React Testing Library for component tests
- Cypress for E2E tests
- Lighthouse for performance testing

### Example Test (Jest + React Testing Library)

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from '../components/Dashboard';

test('filters athletes by country', async () => {
  render(<Dashboard />);
  
  // Wait for initial load
  await waitFor(() => {
    expect(screen.getByText(/Total Records/i)).toBeInTheDocument();
  });
  
  // Select country
  const countrySelect = screen.getByLabelText(/Country/i);
  fireEvent.change(countrySelect, { target: { value: 'USA' } });
  
  // Wait for filter to apply
  await waitFor(() => {
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });
  
  // Verify results
  expect(screen.getByText(/USA/)).toBeInTheDocument();
});
```

## Test Results Report Template

```
Date: [Date]
Tester: [Name]
Environment: [Browser/OS]

Component Testing:
- FilterPanel: PASS/FAIL
- AthletesTable: PASS/FAIL
- Dashboard: PASS/FAIL
- StatisticsPanel: PASS/FAIL

Integration Testing:
- Complete workflow: PASS/FAIL
- Filter combinations: PASS/FAIL
- Reset functionality: PASS/FAIL

Performance:
- Initial load: [Time] ms - PASS/FAIL
- Filter response: [Time] ms - PASS/FAIL
- Animation smoothness: PASS/FAIL

Responsive Design:
- Desktop: PASS/FAIL
- Tablet: PASS/FAIL
- Mobile: PASS/FAIL

Browser Compatibility:
- Chrome: PASS/FAIL
- Firefox: PASS/FAIL
- Safari: PASS/FAIL
- Edge: PASS/FAIL

Issues Found:
[List any issues]

Overall Result: PASS/FAIL
```

## Continuous Testing Strategy

1. **Manual Testing**: Before each release
2. **Automated Unit Tests**: On code commit
3. **Automated Integration Tests**: On PR creation
4. **Performance Tests**: Weekly
5. **Accessibility Tests**: Monthly
6. **Cross-browser Tests**: Monthly

## Success Criteria

All tests must pass:
- ✅ No console errors
- ✅ All filters functional
- ✅ Data displays correctly
- ✅ Performance acceptable
- ✅ Responsive on all devices
- ✅ Works in all browsers
- ✅ Error handling works
- ✅ User can complete all workflows

