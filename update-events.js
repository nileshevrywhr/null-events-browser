const fs = require("fs");
const path = require("path");
const https = require("https");

class EventUpdater {
  constructor() {
    this.eventsDir = "./events";
    this.sessionsDir = "./sessions";
    this.apiUrl = "https://null.community:443/api-v2/events";
    this.maxEventsPerFile = 100;
    this.newEventsFound = [];
    this.newSessionsFound = [];
  }

  async fetchUpcomingEvents() {
    return new Promise((resolve, reject) => {
      console.log("🔍 Fetching upcoming events from null.community API...");

      const request = https.get(this.apiUrl, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            const events = JSON.parse(data);
            console.log(`✅ Fetched ${events.length} upcoming events from API`);
            resolve(events);
          } catch (error) {
            reject(new Error(`Failed to parse API response: ${error.message}`));
          }
        });
      });

      request.on("error", (error) => {
        reject(new Error(`API request failed: ${error.message}`));
      });

      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error("API request timeout"));
      });
    });
  }

  getExistingEventIds() {
    const eventIds = new Set();

    // Read all event files
    const eventFiles = fs
      .readdirSync(this.eventsDir)
      .filter((file) => file.startsWith("event") && file.endsWith(".json"));

    eventFiles.forEach((file) => {
      try {
        const filePath = path.join(this.eventsDir, file);
        const events = JSON.parse(fs.readFileSync(filePath, "utf8"));
        events.forEach((event) => eventIds.add(event.id));
      } catch (error) {
        console.warn(`⚠️  Warning: Could not read ${file}: ${error.message}`);
      }
    });

    console.log(`📊 Found ${eventIds.size} existing events in local files`);
    return eventIds;
  }

  findLatestEventFile() {
    const eventFiles = fs
      .readdirSync(this.eventsDir)
      .filter((file) => file.startsWith("event") && file.endsWith(".json"))
      .map((file) => {
        const match = file.match(/event(\d+)\.json/);
        return match ? { file, startId: parseInt(match[1]) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.startId - a.startId);

    return eventFiles.length > 0 ? eventFiles[0] : null;
  }

  async updateEventFiles(newEvents) {
    if (newEvents.length === 0) {
      console.log("✅ No new events to add");
      return;
    }

    console.log(`📝 Processing ${newEvents.length} new events...`);

    const latestFile = this.findLatestEventFile();
    let currentFile = latestFile
      ? path.join(this.eventsDir, latestFile.file)
      : null;
    let currentEvents = [];

    if (currentFile && fs.existsSync(currentFile)) {
      currentEvents = JSON.parse(fs.readFileSync(currentFile, "utf8"));
      console.log(
        `📂 Latest file: ${latestFile.file} with ${currentEvents.length} events`
      );
    }

    // Sort new events by ID to maintain order
    newEvents.sort((a, b) => a.id - b.id);

    for (const event of newEvents) {
      if (currentEvents.length < this.maxEventsPerFile) {
        // Add to current file
        currentEvents.push(event);
        console.log(
          `➕ Added event ${event.id} to ${path.basename(currentFile)}`
        );
      } else {
        // Save current file and create new one
        if (currentFile) {
          fs.writeFileSync(currentFile, JSON.stringify(currentEvents, null, 4));
          console.log(
            `💾 Saved ${path.basename(currentFile)} with ${
              currentEvents.length
            } events`
          );
        }

        // Create new file
        const newFileName = `event${event.id}.json`;
        currentFile = path.join(this.eventsDir, newFileName);
        currentEvents = [event];
        console.log(`📁 Created new file: ${newFileName}`);
      }
    }

    // Save the final file
    if (currentFile && currentEvents.length > 0) {
      fs.writeFileSync(currentFile, JSON.stringify(currentEvents, null, 4));
      console.log(
        `💾 Saved ${path.basename(currentFile)} with ${
          currentEvents.length
        } events`
      );
    }

    this.newEventsFound = newEvents;
  }

  async fetchEventSessions(eventId) {
    const sessionUrl = `https://null.community:443/api-v2/events/${eventId}/event_sessions`;

    return new Promise((resolve, reject) => {
      const request = https.get(sessionUrl, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            const sessions = JSON.parse(data);
            resolve(sessions);
          } catch (error) {
            console.warn(
              `⚠️  Could not parse sessions for event ${eventId}: ${error.message}`
            );
            resolve([]);
          }
        });
      });

      request.on("error", (error) => {
        console.warn(
          `⚠️  Could not fetch sessions for event ${eventId}: ${error.message}`
        );
        resolve([]);
      });

      request.setTimeout(5000, () => {
        request.destroy();
        console.warn(`⚠️  Timeout fetching sessions for event ${eventId}`);
        resolve([]);
      });
    });
  }

  async updateSessionFiles(newEvents) {
    console.log("🎯 Fetching sessions for new events...");

    for (const event of newEvents) {
      const sessions = await this.fetchEventSessions(event.id);

      if (sessions.length > 0) {
        const sessionFileName = `event_${event.id}_sessions.json`;
        const sessionFilePath = path.join(this.sessionsDir, sessionFileName);

        fs.writeFileSync(sessionFilePath, JSON.stringify(sessions, null, 4));
        console.log(
          `💾 Saved ${sessions.length} sessions for event ${event.id}`
        );
        this.newSessionsFound.push(...sessions);
      } else {
        console.log(`📭 No sessions found for event ${event.id}`);
      }

      // Add small delay to avoid overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  generateUpdateSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      newEvents: this.newEventsFound.length,
      newSessions: this.newSessionsFound.length,
      events: this.newEventsFound.map((e) => ({
        id: e.id,
        name: e.name,
        chapter: e.chapter.name,
        startTime: e.start_time,
      })),
      sessions: this.newSessionsFound.map((s) => ({
        id: s.id,
        name: s.name,
        eventId: s.event_id,
      })),
    };

    fs.writeFileSync(
      "./public/data/update-summary.json",
      JSON.stringify(summary, null, 2)
    );
    return summary;
  }

  findMissingSessionFiles() {
    const missingSessionEvents = [];

    // Read all event files to get all event IDs
    const eventFiles = fs
      .readdirSync(this.eventsDir)
      .filter((file) => file.startsWith("event") && file.endsWith(".json"));

    eventFiles.forEach((file) => {
      try {
        const filePath = path.join(this.eventsDir, file);
        const events = JSON.parse(fs.readFileSync(filePath, "utf8"));

        events.forEach((event) => {
          const sessionFileName = `event_${event.id}_sessions.json`;
          const sessionFilePath = path.join(this.sessionsDir, sessionFileName);

          if (!fs.existsSync(sessionFilePath)) {
            missingSessionEvents.push(event);
          }
        });
      } catch (error) {
        console.warn(`⚠️  Warning: Could not read ${file}: ${error.message}`);
      }
    });

    return missingSessionEvents;
  }

  async fetchMissingSessions() {
    const missingEvents = this.findMissingSessionFiles();

    if (missingEvents.length === 0) {
      console.log("✅ All events have corresponding session files");
      return { foundMissing: false, processed: 0 };
    }

    console.log(
      `🔍 Found ${missingEvents.length} events without session files:`
    );
    missingEvents.forEach((event) => {
      console.log(
        `   • Event ${event.id}: ${event.name} (${event.chapter.name})`
      );
    });
    console.log("");

    console.log("📥 Fetching missing sessions...");
    const initialSessionCount = this.newSessionsFound.length;
    await this.updateSessionFiles(missingEvents);
    const sessionsAdded = this.newSessionsFound.length - initialSessionCount;

    return {
      foundMissing: true,
      processed: missingEvents.length,
      sessionsAdded,
    };
  }

  async run() {
    try {
      console.log("🚀 Starting event update process...\n");

      // Fetch upcoming events from API
      const upcomingEvents = await this.fetchUpcomingEvents();

      // Get existing event IDs
      const existingIds = this.getExistingEventIds();

      // Filter for new events
      const newEvents = upcomingEvents.filter(
        (event) => !existingIds.has(event.id)
      );

      // Update event files for new events
      if (newEvents.length > 0) {
        console.log(`🆕 Found ${newEvents.length} new events:`);
        newEvents.forEach((event) => {
          console.log(
            `   • Event ${event.id}: ${event.name} (${event.chapter.name})`
          );
        });
        console.log("");

        await this.updateEventFiles(newEvents);
        await this.updateSessionFiles(newEvents);
      } else {
        console.log("✅ No new events found. All events are up to date!");
      }

      // Check for and fetch missing session files
      await this.fetchMissingSessions();

      // Generate summary
      const summary = this.generateUpdateSummary();

      console.log("\n🎉 Update completed successfully!");
      console.log(
        `📊 Summary: ${summary.newEvents} new events, ${summary.newSessions} new sessions`
      );

      return summary;
    } catch (error) {
      console.error("❌ Error during update process:", error.message);
      throw error;
    }
  }
}

// Run the updater if called directly
if (require.main === module) {
  const updater = new EventUpdater();
  updater
    .run()
    .then((summary) => {
      // Always run data processing to ensure frontend is up to date
      console.log(
        "\n🔄 Running data processing to update the web interface..."
      );
      require("./process-data.js");

      if (summary.newEvents > 0 || summary.newSessions > 0) {
        console.log(
          `✨ Found ${summary.newEvents} new events and ${summary.newSessions} new sessions!`
        );
      } else {
        console.log("✅ Data processing completed - frontend is up to date!");
      }

      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Update failed:", error.message);
      process.exit(1);
    });
}

module.exports = EventUpdater;
