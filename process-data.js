#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Function to read JSON file safely
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

// Function to format date as DD-MM-YYYY
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Function to extract event ID from session filename
function extractEventIdFromFilename(filename) {
  const match = filename.match(/event_(\d+)_sessions\.json/);
  return match ? parseInt(match[1]) : null;
}

// Function to find event data by ID
function findEventById(eventId, eventsData) {
  for (const eventFile of eventsData) {
    const event = eventFile.find((e) => e.id === eventId);
    if (event) return event;
  }
  return null;
}

// Main processing function
function processSessionData() {
  console.log("Processing session data...");

  // Read all event files
  const eventsDir = "./events";
  const eventFiles = fs
    .readdirSync(eventsDir)
    .filter((file) => file.endsWith(".json"));
  const eventsData = [];

  console.log(`Loading ${eventFiles.length} event files...`);
  for (const file of eventFiles) {
    const eventData = readJsonFile(path.join(eventsDir, file));
    if (eventData) {
      eventsData.push(eventData);
    }
  }

  // Read all session files
  const sessionsDir = "./sessions";
  const sessionFiles = fs
    .readdirSync(sessionsDir)
    .filter((file) => file.endsWith(".json"));

  console.log(`Processing ${sessionFiles.length} session files...`);

  const processedSessions = [];

  for (const file of sessionFiles) {
    const eventId = extractEventIdFromFilename(file);
    if (!eventId) {
      console.warn(`Could not extract event ID from ${file}`);
      continue;
    }

    const sessionData = readJsonFile(path.join(sessionsDir, file));
    if (!sessionData || !Array.isArray(sessionData)) {
      console.warn(`Invalid session data in ${file}`);
      continue;
    }

    // Find corresponding event data
    const eventData = findEventById(eventId, eventsData);
    const location = eventData?.chapter?.name || "Unknown Location";

    // Process each session in the file
    for (const session of sessionData) {
      if (session.name && session.start_time) {
        processedSessions.push({
          id: session.id,
          date: formatDate(session.start_time),
          sessionTopic: session.name,
          location: location,
          eventId: eventId,
          startTime: session.start_time,
          endTime: session.end_time,
          description: session.description || "",
          presentationUrl: session.presentation_url || "",
          videoUrl: session.video_url || "",
          tags: session.tags || [],
          sessionType: session.session_type || "",
        });
      }
    }
  }

  // Sort by date (newest first)
  processedSessions.sort(
    (a, b) => new Date(b.startTime) - new Date(a.startTime)
  );

  console.log(`Processed ${processedSessions.length} sessions`);

  // Ensure public directory exists
  const publicDir = "./public";
  const dataDir = "./public/data";
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  // Write processed data to file
  const outputPath = "./public/data/sessions-data.json";
  fs.writeFileSync(outputPath, JSON.stringify(processedSessions, null, 2));

  console.log(`Data written to ${outputPath}`);

  // Generate summary statistics
  const locationStats = {};
  const yearStats = {};

  processedSessions.forEach((session) => {
    // Location stats
    locationStats[session.location] =
      (locationStats[session.location] || 0) + 1;

    // Year stats
    const year = new Date(session.startTime).getFullYear();
    yearStats[year] = (yearStats[year] || 0) + 1;
  });

  console.log("\nSummary Statistics:");
  console.log("Sessions by Location:", locationStats);
  console.log("Sessions by Year:", yearStats);

  return processedSessions;
}

// Run the processing
if (require.main === module) {
  processSessionData();
}

module.exports = { processSessionData };
