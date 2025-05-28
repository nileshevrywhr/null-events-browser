#!/usr/bin/env node

/**
 * Build script for Netlify deployment
 * This script prepares the application for static hosting
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting build for deployment...');

// Ensure public directory exists
if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
}

// Ensure public/data directory exists
if (!fs.existsSync('public/data')) {
    fs.mkdirSync('public/data', { recursive: true });
}

// Check if we have session data to process
const hasSessionData = fs.existsSync('sessions') && 
    fs.readdirSync('sessions').filter(f => f.endsWith('.json')).length > 0;

const hasEventData = fs.existsSync('events') && 
    fs.readdirSync('events').filter(f => f.endsWith('.json')).length > 0;

if (hasSessionData && hasEventData) {
    console.log('📊 Processing existing session and event data...');
    try {
        // Run the data processing script
        require('./process-data.js');
        console.log('✅ Data processing completed successfully');
    } catch (error) {
        console.error('❌ Error processing data:', error.message);
        console.log('⚠️  Continuing with deployment without processed data');
    }
} else {
    console.log('📝 No session/event data found - creating placeholder data file');
    
    // Create a minimal data file for the demo
    const placeholderData = [
        {
            id: 1,
            date: "01-01-2024",
            sessionTopic: "Welcome to Null Events Session Browser",
            location: "Demo",
            eventId: 1,
            startTime: "2024-01-01T10:00:00.000Z",
            endTime: "2024-01-01T11:00:00.000Z",
            description: "This is a demo session. Use the data fetching scripts to populate with real data from null.community API.",
            presentationUrl: "",
            videoUrl: "",
            tags: ["demo"],
            sessionType: "Demo"
        }
    ];
    
    fs.writeFileSync('public/data/sessions-data.json', JSON.stringify(placeholderData, null, 2));
    console.log('✅ Created placeholder data file');
}

// Create a deployment info file
const deploymentInfo = {
    buildTime: new Date().toISOString(),
    version: require('./package.json').version,
    environment: 'production',
    hasRealData: hasSessionData && hasEventData,
    dataFiles: {
        events: hasEventData ? fs.readdirSync('events').filter(f => f.endsWith('.json')).length : 0,
        sessions: hasSessionData ? fs.readdirSync('sessions').filter(f => f.endsWith('.json')).length : 0
    }
};

fs.writeFileSync('public/data/deployment-info.json', JSON.stringify(deploymentInfo, null, 2));

// Ensure all required files exist
const requiredFiles = [
    'public/index.html',
    'public/css/styles.css',
    'public/js/app.js',
    'public/data/sessions-data.json'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
        console.error(`❌ Required file missing: ${file}`);
        allFilesExist = false;
    }
});

if (allFilesExist) {
    console.log('✅ All required files present');
    console.log('🎉 Build completed successfully!');
    console.log('\n📋 Deployment Summary:');
    console.log(`   Build time: ${deploymentInfo.buildTime}`);
    console.log(`   Has real data: ${deploymentInfo.hasRealData ? 'Yes' : 'No (using placeholder)'}`);
    console.log(`   Event files: ${deploymentInfo.dataFiles.events}`);
    console.log(`   Session files: ${deploymentInfo.dataFiles.sessions}`);
    console.log('\n🌐 Ready for Netlify deployment!');
} else {
    console.error('❌ Build failed - missing required files');
    process.exit(1);
}
