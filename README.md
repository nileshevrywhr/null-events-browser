# Null Events Session Browser
[![Netlify Status](https://api.netlify.com/api/v1/badges/1dc58584-49eb-4fd9-ab22-000711a61402/deploy-status)](https://app.netlify.com/projects/monumental-kitsune-afa20d/deploys)

A responsive web interface to browse and search through null security community session data. This application provides an intuitive way to explore sessions from various null community events across different locations and time periods.

## Features

### 📱 Responsive Design

- **Mobile-first approach**: Optimized for mobile devices with touch-friendly interfaces
- **Adaptive layouts**: Seamlessly works on phones, tablets, and desktop computers
- **Horizontal scroll**: Table scrolls horizontally on mobile with visual indicators
- **Touch gestures**: Swipe navigation for mobile table browsing

### 🔍 Advanced Filtering & Search

- **Text search**: Search through session names and descriptions
- **Location filter**: Filter by event location/chapter
- **Year filter**: Filter by event year
- **Date range**: Filter by specific date ranges
- **Real-time filtering**: Instant results as you type

### 📊 Data Management

- **Sorting**: Click column headers to sort by date, session topic, or location
- **Pagination**: Navigate through large datasets with page controls
- **Export**: Download filtered results as CSV files
- **Statistics**: View session counts by location and year

### ♿ Accessibility

- **ARIA labels**: Screen reader compatible
- **Keyboard navigation**: Full keyboard support
- **High contrast**: Supports high contrast mode
- **Reduced motion**: Respects user motion preferences

## Technology Stack

### Frontend

- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Modern styling with Flexbox/Grid layouts
- **Vanilla JavaScript**: No heavy frameworks, fast loading
- **Progressive Enhancement**: Works without JavaScript (basic functionality)

### Data Processing

- **Node.js**: Server-side data processing
- **JSON**: Structured data format for fast loading
- **File-based**: No database required, works with static hosting

## Project Structure

```
/
├── public/                 # Web application files
│   ├── index.html         # Main HTML file
│   ├── css/
│   │   └── styles.css     # Responsive CSS styles
│   ├── js/
│   │   └── app.js         # JavaScript application logic
│   └── data/
│       └── sessions-data.json  # Processed session data
├── events/                # Event data files
├── sessions/              # Session data files
├── process-data.js        # Data processing script
├── package.json          # Node.js dependencies
└── README.md             # This file
```

## Data Structure

### Event Data

Events are stored in `/events/` directory and contain:

- Event ID, name, and description
- Location information (chapter name)
- Start and end times
- Event type (Meet, Humla, Bachaav, etc.)

### Session Data

Sessions are stored in `/sessions/` directory as `event_{id}_sessions.json` and contain:

- Session ID, name, and description
- Start and end times
- Presentation and video URLs
- Tags and session types

### Data Relationship

The application links sessions to events using the event ID embedded in session filenames, allowing it to retrieve location information from the corresponding event data.

## Setup and Installation

### Prerequisites

- Node.js 14.0.0 or higher
- npm (comes with Node.js)

### Installation Steps

1. **Clone or download the project**

   ```bash
   cd null_events_v2
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Process the data**

   ```bash
   npm run build
   ```

4. **Start the development server**

   ```bash
   npm run serve
   ```

5. **Open in browser**
   Navigate to `http://localhost:8080`

### Available Scripts

- `npm run build` - Process session data and generate JSON
- `npm run update` - Fetch new events from null.community API and update local files
- `npm run fetch-all` - Fetch ALL events and sessions from scratch (complete refresh)
- `npm run full-refresh` - Fetch all data and rebuild (complete reset)
- `npm run api` - Start API server on port 3001 for manual updates
- `npm run serve` - Start HTTP server on port 8080
- `npm run dev` - Build data and start server
- `npm run dev-full` - Build data, start API server, and start web server
- `npm run sync` - Update from API, process data, and display summary
- `npm start` - Alias for dev command

### Automatic Updates

The system can automatically fetch new events and sessions from the null.community API:

#### **Update Process**

1. **Fetch upcoming events** from `https://null.community:443/api-v2/events`
2. **Compare with existing data** to identify new events
3. **Smart file management**:
   - Append to latest event file if it has < 100 events
   - Create new event file if current file is full
   - Follow existing naming convention (`event{firstId}.json`)
4. **Fetch sessions** for each new event from the API
5. **Create session files** following the pattern `event_{id}_sessions.json`
6. **Generate update summary** for the web interface
7. **Display notification banner** when new content is available

#### **Update Commands**

```bash
# Check for and download new events/sessions
npm run update

# Full sync: update + rebuild data + show summary
npm run sync
```

#### **Notification System**

- **Bright banner** appears when new events/sessions are detected
- **Auto-dismisses** after 10 seconds
- **Remembers user interaction** to avoid showing the same update repeatedly
- **Detailed messaging** shows count of new events and sessions
- **Mobile-optimized** design with touch-friendly controls

#### **Manual Update Button**

- **Located next to search bar** for easy access
- **Real-time updates** when API server is running
- **Fallback mode** when API server is not available
- **Visual feedback** with loading states and toast notifications
- **Smart detection** of new content with automatic page refresh
- **Mobile-responsive** design with touch-friendly interactions

#### **Complete Data Refresh (fetch_sessions.sh)**

For a complete refresh of all data from scratch:

```bash
npm run fetch-all      # Fetch ALL events and sessions
npm run full-refresh   # Fetch all + rebuild frontend
```

**What the script does:**

1. **Fetches ALL events** from `https://null.community:443/api-v2/events`
2. **Organizes events** into files with max 100 events each (matching current structure)
3. **Extracts event IDs** from the response
4. **Fetches sessions** for each event using `/events/{id}/event_sessions`
5. **Stores sessions** in `sessions/event_{id}_sessions.json` format
6. **Handles errors gracefully** - creates empty files for events without sessions
7. **Provides detailed progress** with colored output and statistics

**Use cases:**

- 🔄 **Complete data refresh** when starting from scratch
- 🧹 **Clean slate setup** for new installations
- 🔍 **Debugging data issues** by re-fetching everything
- 📊 **Bulk data collection** for analysis or backup

#### **Comparison: Complete vs Incremental Updates**

| Feature             | Complete Refresh (`fetch-all`)  | Incremental Update (`update`) |
| ------------------- | ------------------------------- | ----------------------------- |
| **Data Source**     | Fetches ALL events from API     | Fetches only upcoming events  |
| **Speed**           | Slower (processes all events)   | Faster (only new events)      |
| **Use Case**        | Initial setup, complete refresh | Regular maintenance           |
| **Data Coverage**   | 100% of all events/sessions     | Only new/upcoming content     |
| **File Management** | Recreates all files             | Appends to existing files     |
| **API Calls**       | ~1000+ calls (all events)       | ~10-50 calls (new events)     |
| **Time Required**   | 5-15 minutes                    | 30-60 seconds                 |
| **When to Use**     | First time, data corruption     | Daily/weekly updates          |

#### **Incremental Update Flow (update-events.js)**

For regular updates of new content only:

1. **Manual Trigger**: User clicks update button in interface
2. **API Call**: Frontend calls `POST /api/update` endpoint
3. **Backend Process**: API server runs `update-events.js` script
4. **Data Fetching**: Script fetches new events and sessions from null.community
5. **File Updates**: New data is saved to JSON files
6. **Data Processing**: `process-data.js` rebuilds the frontend data
7. **User Feedback**: Success/failure message shown to user
8. **Auto Refresh**: Page reloads if new content was found

## Usage

### Browsing Sessions

1. Open the application in your web browser
2. Browse the table of sessions with Date, Session Topic, and Location columns
3. Use the search box to find specific sessions
4. Apply filters to narrow down results
5. Click column headers to sort data
6. Use pagination to navigate through results

### Filtering Data

- **Search**: Type in the search box to filter by session name or description
- **Location**: Select a specific location from the dropdown
- **Year**: Filter by a specific year
- **Date Range**: Set start and end dates for custom ranges
- **Clear Filters**: Reset all filters with the "Clear Filters" button

### Exporting Data

- Click "Export CSV" to download the current filtered results
- The CSV file includes all visible columns and filtered data
- File is named with the current date for easy organization

## Mobile Optimization

### Design Principles

- **Touch-first**: Large tap targets and touch-friendly interactions
- **Content priority**: Most important information visible first
- **Performance**: Optimized for slower mobile connections
- **Offline-ready**: Works with cached data

### Mobile Features

- Horizontal scrolling table with visual indicators
- Stacked filter layout for easier mobile interaction
- Optimized typography for small screens
- Touch-friendly pagination controls

## Browser Support

- **Modern browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile browsers**: iOS Safari, Chrome Mobile, Samsung Internet
- **Accessibility**: Screen readers and assistive technologies
- **Progressive enhancement**: Basic functionality without JavaScript

## Performance

### Optimization Techniques

- **Lazy loading**: Data loaded asynchronously
- **Pagination**: Large datasets split into manageable chunks
- **Debounced search**: Reduces API calls during typing
- **Efficient rendering**: Virtual scrolling for large tables
- **Caching**: Browser caching for static assets

### Load Times

- Initial page load: < 2 seconds
- Data processing: < 5 seconds for full dataset
- Filter operations: < 100ms response time
- Mobile performance: Optimized for 3G connections

## Contributing

### Development Workflow

1. Make changes to source files
2. Run `npm run build` to process data
3. Test changes with `npm run serve`
4. Ensure responsive design works on all screen sizes
5. Test accessibility features

### Code Style

- Use semantic HTML elements
- Follow BEM CSS methodology
- Write accessible JavaScript
- Include ARIA labels for dynamic content
- Test with keyboard navigation

## License

MIT License - Feel free to use and modify for your projects.

## Support

For issues or questions:

1. Check the browser console for error messages
2. Ensure all data files are present and valid JSON
3. Verify Node.js version compatibility
4. Test with different browsers and devices
