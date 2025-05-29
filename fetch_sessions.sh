#!/bin/bash

# Enhanced script to fetch all events and their sessions
# This script will:
# 1. Fetch all events from the null.community API
# 2. Extract event IDs from the response
# 3. Fetch sessions for each event
# 4. Store them in the same format as the current system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create necessary directories
print_status "Creating directories..."
mkdir -p sessions
mkdir -p events
mkdir -p temp


# Step 0: verify API endpoint is correct and actively available
API_URL="https://api.null.community/events"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL")

if [ "$RESPONSE" -ne 200 ]; then
  echo "[ERROR] API returned HTTP status code $RESPONSE"
  exit 1
fi

# Step 1: Fetch all events from the API
print_status "Fetching all events from null.community API..."
if curl -X GET "https://null.community:443/api-v2/events" \
     -H "accept: application/json" \
     -o "temp/all_events.json" \
     -s --fail --retry 3 --retry-delay 2; then
    # Success case
    print_status "Successfully downloaded events data"
else
    print_error "Failed to fetch events from API (HTTP error ${?})"
    print_warning "API might be temporarily unavailable or endpoint has changed"
    exit 1
fi

# Check if the response is valid JSON and not empty
if ! jq empty temp/all_events.json 2>/dev/null; then
    print_error "Invalid JSON response from events API"
    exit 1
fi

# Count total events
total_events=$(jq length temp/all_events.json)
print_success "Fetched $total_events events from API"

# Step 2: Extract event IDs and organize events into files (similar to current structure)
print_status "Organizing events into files..."

# Create event files with max 100 events each (matching current structure)
events_per_file=100
file_counter=0
event_counter=0

# Process events in batches
while [ $event_counter -lt "$total_events" ]; do
    start_index="$event_counter"
    end_index=$((event_counter + events_per_file - 1))

    if [ "$end_index" -ge "$total_events" ]; then
        end_index=$((total_events - 1))
    fi

    # Get the first event ID for this batch to name the file
    first_event_id=$(jq -r ".[$start_index].id" temp/all_events.json)

    # Extract events for this batch
    jq ".[$start_index:$((end_index + 1))]" temp/all_events.json > "events/event${first_event_id}.json"

    batch_size=$((end_index - start_index + 1))
    print_status "Created events/event${first_event_id}.json with $batch_size events"

    event_counter=$((end_index + 1))
    file_counter=$((file_counter + 1))
done

print_success "Organized $total_events events into $file_counter files"

# Step 3: Extract all event IDs for session fetching
print_status "Extracting event IDs..."
jq -r '.[].id' temp/all_events.json > temp/event_ids.txt
total_ids=$(wc -l < temp/event_ids.txt)
print_success "Extracted $total_ids event IDs"

# Step 4: Fetch sessions for each event
print_status "Starting session fetching for $total_ids events..."
counter=0
success_count=0
error_count=0
empty_count=0

while IFS= read -r event_id; do
    counter=$((counter + 1))

    # Progress indicator
    if [ $((counter % 50)) -eq 0 ] || [ "$counter" -eq "$total_ids" ]; then
        print_status "Progress: $counter/$total_ids events processed"
    fi

    # Fetch event sessions using the correct endpoint
    session_file="sessions/event_${event_id}_sessions.json"

    # Try the event_sessions endpoint with retries
    if curl -X GET "https://null.community:443/api-v2/events/$event_id/event_sessions" \
            -H "accept: application/json" \
            -o "$session_file" \
            -s --fail --retry 2 --retry-delay 1 2>/dev/null; then

        # Check if the response is valid JSON
        if jq empty "$session_file" 2>/dev/null; then
            # Check if sessions array is empty
            session_count=$(jq length "$session_file" 2>/dev/null || echo "0")

            if [ "$session_count" -eq 0 ]; then
                empty_count=$((empty_count + 1))
                # Keep the empty file for consistency
                echo "[]" > "$session_file"
            else
                success_count=$((success_count + 1))
            fi
        else
            # Invalid JSON, create empty sessions file
            echo "[]" > "$session_file"
            empty_count=$((empty_count + 1))
        fi
    else
        # API call failed, create empty sessions file
        echo "[]" > "$session_file"
        error_count=$((error_count + 1))
    fi

    # Small delay to be respectful to the API
    sleep 0.1
done < temp/event_ids.txt

# Step 5: Summary and cleanup
print_success "Session fetching completed!"
print_status "Summary:"
print_status "  Total events processed: $total_ids"
print_status "  Events with sessions: $success_count"
print_status "  Events with no sessions: $empty_count"
print_status "  Events with API errors: $error_count"

# Clean up temporary files
print_status "Cleaning up temporary files..."
rm -rf temp/

print_success "All done! Events stored in 'events/' directory, sessions stored in 'sessions/' directory"
print_status "You can now run 'npm run build' to process the data for the web interface"
