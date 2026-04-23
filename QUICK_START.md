# Quick Start Guide - Olympics Dashboard with Dynamic Filtering

## Prerequisites

- Node.js 14+ and npm
- MongoDB running and populated with Olympics data
- Backend running with the import script executed

## Setup Steps

### 1. Backend Setup (if not already running)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Ensure MongoDB is running
# Run the import script if data hasn't been imported
node scripts/importOlympicsData.js

# Start the server
npm start
```

The backend should now be running on `http://localhost:5000`

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend/myapp

# Install dependencies
npm install

# Create .env.local file (if not exists)
# File content:
# VITE_API_BASE_URL=http://localhost:5000

# Start the development server
npm run dev
```

The frontend will automatically open at `http://localhost:5173`

## What You'll See

### Dashboard Header
- Title: "Olympics Data Visualization Dashboard"
- Quick stats showing total records, unique athletes, and countries

### Statistics Panel
- Four stat cards with key metrics
- Medal breakdown showing Gold, Silver, Bronze, None counts
- Top 5 countries by participation
- Top 5 sports by participation

### Left Sidebar - Filters
- **Search Athletes**: Type to search by name (case-insensitive)
- **Country**: Dropdown with all countries
- **Medal Type**: Dropdown to filter by medal type
- **Sport**: Dropdown with all sports
- **Year**: Dropdown with all Olympic years
- **Reset Filters**: Button to clear all selections

### Main Area - Athletes Table
- Displays up to 25 filtered athletes
- Columns: Name, Country, Sport, Event, Medal, Year, Season, Age
- Medal badges with color coding
- Shows total count of matching records
- Real-time updates as filters change

## How Filtering Works

1. **Select a filter** (e.g., choose "USA" from Country dropdown)
2. **Wait 300ms** - the dashboard automatically fetches new data
3. **See results update** - the table shows only matching athletes
4. **Combine filters** - select multiple filters for more specific results
5. **Reset** - click "Reset Filters" to see all data again

## Example Workflows

### Find all Gold medalists
1. Select Medal Type: "Gold"
2. See only athletes who won Gold medals

### Find USA swimmers
1. Select Country: "USA"
2. Select Sport: "Swimming"
3. See only USA swimmers

### Find athletes from a specific year
1. Select Year: "2020"
2. See only athletes from Tokyo Olympics

### Search for specific athlete
1. Type name in "Search Athletes" field
2. See matching athletes across all Olympics

## File Structure Created

```
frontend/src/
├── components/
│   ├── Dashboard.js            ← Main filtering logic
│   ├── FilterPanel.js          ← Filter controls
│   ├── AthletesTable.js        ← Results table
│   └── StatisticsPanel.js      ← Stats display
├── services/
│   └── api.js                  ← Backend API client
├── styles/
│   ├── Dashboard.css
│   ├── FilterPanel.css
│   ├── AthletesTable.css
│   └── StatisticsPanel.css
├── App.js                      ← Updated to use Dashboard
└── .env.local                  ← API URL configuration
```

## Key Features Implemented

✅ **Real-time Filtering**
- Changes apply automatically after typing/selecting
- 300ms debounce prevents excessive API calls
- Smooth loading indicator during updates

✅ **Multiple Filter Options**
- Search by athlete name
- Filter by country
- Filter by medal type
- Filter by sport
- Filter by Olympic year

✅ **Interactive Data Display**
- Responsive table showing up to 25 results
- Medal badges with color coding
- Shows total matching records
- Empty state message when no results

✅ **Dashboard Statistics**
- Total records and athletes
- Countries represented
- Sports covered
- Medal breakdown
- Top countries and sports lists

✅ **User-Friendly UI**
- Clean, modern design
- Responsive layout (desktop, tablet, mobile)
- Smooth animations and transitions
- Loading states and error messages

## API Integration

The frontend connects to these backend endpoints:

- `GET /summary` - Get dashboard statistics
- `GET /athletes?limit=25&...filters` - Get filtered athletes
- `GET /regions` - Get all countries

## Troubleshooting

### "Cannot connect to API" error?
- ✓ Check backend is running: `npm start` in backend folder
- ✓ Check port 5000 is not blocked
- ✓ Verify `.env.local` API URL is correct

### No data showing?
- ✓ Check MongoDB is running and populated
- ✓ Verify import script was executed successfully
- ✓ Check browser console for errors

### Filters not updating?
- ✓ Wait 300ms after making changes (debounce delay)
- ✓ Check network tab to see API requests
- ✓ Verify backend is responding with data

### Styling looks wrong?
- ✓ Clear browser cache
- ✓ Restart development server
- ✓ Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Performance Tips

- First load: ~1-2 seconds (fetches summary data)
- Filter updates: ~300-500ms total (300ms debounce + API)
- Table renders 25 rows smoothly
- Animations are GPU-accelerated

## Next Steps

After confirming everything works:
1. Try different filter combinations
2. Test on different screen sizes
3. Export functionality could be added
4. Advanced filtering could be enhanced
5. Performance optimizations can be made

## Production Deployment

To deploy to production:

1. Update `.env.local` with production API URL
2. Build frontend: `npm run build`
3. Deploy to hosting service (Netlify, Vercel, etc.)
4. Ensure backend API is accessible from production domain
5. Update CORS settings in backend if needed

## Support

For issues or questions:
1. Check `FILTERING_IMPLEMENTATION.md` for detailed documentation
2. Review browser console for error messages
3. Check backend logs for API issues
4. Verify database connectivity

Enjoy your Olympics data visualization dashboard! 🏅

