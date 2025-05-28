class SessionBrowser {
  constructor() {
    this.sessions = [];
    this.filteredSessions = [];
    this.currentPage = 1;
    this.itemsPerPage = 50;
    this.currentSort = { field: "date", direction: "desc" };

    this.initializeElements();
    this.bindEvents();
    this.loadData();
  }

  initializeElements() {
    // Filter elements
    this.searchInput = document.getElementById("search");
    this.locationFilter = document.getElementById("location-filter");
    this.yearFilter = document.getElementById("year-filter");
    this.resourcesFilter = document.getElementById("resources-filter");
    this.dateFromInput = document.getElementById("date-from");
    this.dateToInput = document.getElementById("date-to");
    this.clearFiltersBtn = document.getElementById("clear-filters");
    this.exportCsvBtn = document.getElementById("export-csv");
    this.toggleAdvancedBtn = document.getElementById("toggle-advanced");
    this.resetAdvancedBtn = document.getElementById("reset-advanced");
    this.advancedFiltersEl = document.getElementById("advanced-filters");

    // Update banner elements
    this.updateBanner = document.getElementById("update-banner");
    this.updateMessage = document.getElementById("update-message");
    this.dismissBannerBtn = document.getElementById("dismiss-banner");
    this.manualUpdateBtn = document.getElementById("manual-update");

    // Table elements
    this.tableBody = document.getElementById("sessions-tbody");
    this.sortableHeaders = document.querySelectorAll(".sortable");

    // State elements
    this.loadingEl = document.getElementById("loading");
    this.emptyStateEl = document.getElementById("empty-state");
    this.errorStateEl = document.getElementById("error-state");

    // Results elements
    this.resultsCount = document.getElementById("results-count");
    this.totalCount = document.getElementById("total-count");

    // Pagination elements
    this.paginationEl = document.getElementById("pagination");
    this.paginationInfo = document.getElementById("pagination-info");
    this.prevPageBtn = document.getElementById("prev-page");
    this.nextPageBtn = document.getElementById("next-page");
    this.paginationPages = document.getElementById("pagination-pages");
  }

  bindEvents() {
    // Filter events
    this.searchInput.addEventListener(
      "input",
      this.debounce(() => this.applyFilters(), 300)
    );
    this.locationFilter.addEventListener("change", () => this.applyFilters());
    this.yearFilter.addEventListener("change", () => this.applyFilters());
    this.resourcesFilter.addEventListener("change", () => this.applyFilters());
    this.dateFromInput.addEventListener("change", () => this.applyFilters());
    this.dateToInput.addEventListener("change", () => this.applyFilters());
    this.clearFiltersBtn.addEventListener("click", () => this.clearFilters());
    this.exportCsvBtn.addEventListener("click", () => this.exportToCsv());
    this.toggleAdvancedBtn.addEventListener("click", () =>
      this.toggleAdvancedFilters()
    );
    this.resetAdvancedBtn.addEventListener("click", () =>
      this.resetAdvancedFilters()
    );
    this.dismissBannerBtn.addEventListener("click", () =>
      this.dismissUpdateBanner()
    );
    this.manualUpdateBtn.addEventListener("click", () =>
      this.triggerManualUpdate()
    );

    // Sort events
    this.sortableHeaders.forEach((header) => {
      const sortBtn = header.querySelector(".sort-btn");
      sortBtn.addEventListener("click", () =>
        this.handleSort(header.dataset.sort)
      );
    });

    // Pagination events
    this.prevPageBtn.addEventListener("click", () =>
      this.goToPage(this.currentPage - 1)
    );
    this.nextPageBtn.addEventListener("click", () =>
      this.goToPage(this.currentPage + 1)
    );

    // Reset and retry events
    document
      .getElementById("reset-filters")
      ?.addEventListener("click", () => this.clearFilters());
    document
      .getElementById("retry-load")
      ?.addEventListener("click", () => this.loadData());
  }

  async loadData() {
    try {
      this.showLoading();
      const response = await fetch("data/sessions-data.json");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.sessions = await response.json();
      this.filteredSessions = [...this.sessions];

      this.populateFilters();
      this.applySorting();
      this.updateDisplay();
      this.checkForUpdates();
      this.hideLoading();
    } catch (error) {
      console.error("Error loading session data:", error);
      this.showError();
    }
  }

  populateFilters() {
    // Populate location filter
    const locations = [...new Set(this.sessions.map((s) => s.location))].sort();
    this.locationFilter.innerHTML = '<option value="">All Locations</option>';
    locations.forEach((location) => {
      const option = document.createElement("option");
      option.value = location;
      option.textContent = location;
      this.locationFilter.appendChild(option);
    });

    // Populate year filter
    const years = [
      ...new Set(this.sessions.map((s) => new Date(s.startTime).getFullYear())),
    ].sort((a, b) => b - a);
    this.yearFilter.innerHTML = '<option value="">All Years</option>';
    years.forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      this.yearFilter.appendChild(option);
    });
  }

  applyFilters() {
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    const selectedLocation = this.locationFilter.value;
    const selectedYear = this.yearFilter.value;
    const selectedResources = this.resourcesFilter.value;
    const dateFrom = this.dateFromInput.value;
    const dateTo = this.dateToInput.value;

    this.filteredSessions = this.sessions.filter((session) => {
      // Search filter
      if (
        searchTerm &&
        !session.sessionTopic.toLowerCase().includes(searchTerm) &&
        !session.description.toLowerCase().includes(searchTerm)
      ) {
        return false;
      }

      // Location filter
      if (selectedLocation && session.location !== selectedLocation) {
        return false;
      }

      // Year filter
      if (
        selectedYear &&
        new Date(session.startTime).getFullYear().toString() !== selectedYear
      ) {
        return false;
      }

      // Resources filter
      if (selectedResources) {
        const hasPresentation =
          session.presentationUrl && session.presentationUrl.trim() !== "";
        const hasVideo = session.videoUrl && session.videoUrl.trim() !== "";

        switch (selectedResources) {
          case "presentation":
            if (!hasPresentation) return false;
            break;
          case "video":
            if (!hasVideo) return false;
            break;
          case "both":
            if (!hasPresentation || !hasVideo) return false;
            break;
          case "any":
            if (!hasPresentation && !hasVideo) return false;
            break;
          case "none":
            if (hasPresentation || hasVideo) return false;
            break;
        }
      }

      // Date range filter
      const sessionDate = new Date(session.startTime)
        .toISOString()
        .split("T")[0];
      if (dateFrom && sessionDate < dateFrom) {
        return false;
      }
      if (dateTo && sessionDate > dateTo) {
        return false;
      }

      return true;
    });

    this.currentPage = 1;
    this.applySorting();
    this.updateDisplay();
  }

  applySorting() {
    this.filteredSessions.sort((a, b) => {
      let aValue = a[this.currentSort.field];
      let bValue = b[this.currentSort.field];

      // Handle date sorting
      if (this.currentSort.field === "date") {
        aValue = new Date(a.startTime);
        bValue = new Date(b.startTime);
      }

      // Handle string sorting
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      let result = 0;
      if (aValue < bValue) result = -1;
      if (aValue > bValue) result = 1;

      return this.currentSort.direction === "desc" ? -result : result;
    });
  }

  handleSort(field) {
    if (this.currentSort.field === field) {
      this.currentSort.direction =
        this.currentSort.direction === "asc" ? "desc" : "asc";
    } else {
      this.currentSort.field = field;
      this.currentSort.direction = "asc";
    }

    this.updateSortHeaders();
    this.applySorting();
    this.updateDisplay();
  }

  updateSortHeaders() {
    this.sortableHeaders.forEach((header) => {
      if (header.dataset.sort === this.currentSort.field) {
        header.setAttribute(
          "aria-sort",
          this.currentSort.direction === "asc" ? "ascending" : "descending"
        );
      } else {
        header.setAttribute("aria-sort", "none");
      }
    });
  }

  updateDisplay() {
    this.updateResultsCount();
    this.renderTable();
    this.updatePagination();

    // Show/hide empty state
    if (this.filteredSessions.length === 0) {
      this.showEmptyState();
    } else {
      this.hideEmptyState();
    }
  }

  updateResultsCount() {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(
      this.currentPage * this.itemsPerPage,
      this.filteredSessions.length
    );

    this.resultsCount.textContent =
      this.filteredSessions.length === 0
        ? "No sessions found"
        : `Showing ${start}-${end} of ${this.filteredSessions.length} sessions`;

    this.totalCount.textContent = `Total: ${this.sessions.length} sessions`;
  }

  renderTable() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    const pageData = this.filteredSessions.slice(start, end);

    this.tableBody.innerHTML = "";

    pageData.forEach((session, index) => {
      const row = document.createElement("tr");
      const sessionId = `session-${start + index}`;

      row.innerHTML = `
                <td>${session.date}</td>
                <td>
                    <strong>${this.escapeHtml(session.sessionTopic)}</strong>
                    ${this.renderDescription(session, sessionId)}
                </td>
                <td>${this.escapeHtml(session.location)}</td>
                <td>${this.renderResourcesColumn(session)}</td>
            `;
      this.tableBody.appendChild(row);
    });

    // Add click event listeners for expandable descriptions
    this.addDescriptionToggleListeners();
  }

  renderDescription(session, sessionId) {
    if (!session.description || session.description.trim() === "") {
      return "";
    }

    const description = session.description.trim();
    const truncatedLength = 100;

    if (description.length <= truncatedLength) {
      return `<br><small class="text-muted">${this.escapeHtml(
        description
      )}</small>`;
    }

    const truncated = description.substring(0, truncatedLength);

    return `
            <br>
            <div class="description-container">
                <small class="text-muted description-text" id="${sessionId}-desc">
                    <span class="description-truncated">${this.escapeHtml(
                      truncated
                    )}...</span>
                    <span class="description-full" style="display: none;">${this.escapeHtml(
                      description
                    )}</span>
                </small>
                <button type="button" class="description-toggle" data-target="${sessionId}-desc" title="Click to expand description">
                    <span class="toggle-text">Show more</span>
                    <span class="toggle-icon">▼</span>
                </button>
            </div>
        `;
  }

  addDescriptionToggleListeners() {
    const toggleButtons = this.tableBody.querySelectorAll(
      ".description-toggle"
    );
    toggleButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDescription(button);
      });
    });
  }

  toggleDescription(button) {
    const targetId = button.getAttribute("data-target");
    const descriptionEl = document.getElementById(targetId);
    const truncatedEl = descriptionEl.querySelector(".description-truncated");
    const fullEl = descriptionEl.querySelector(".description-full");
    const toggleText = button.querySelector(".toggle-text");
    const toggleIcon = button.querySelector(".toggle-icon");

    const isExpanded = fullEl.style.display !== "none";

    if (isExpanded) {
      // Collapse
      fullEl.style.display = "none";
      truncatedEl.style.display = "inline";
      toggleText.textContent = "Show more";
      toggleIcon.textContent = "▼";
      button.setAttribute("title", "Click to expand description");
    } else {
      // Expand
      truncatedEl.style.display = "none";
      fullEl.style.display = "inline";
      toggleText.textContent = "Show less";
      toggleIcon.textContent = "▲";
      button.setAttribute("title", "Click to collapse description");
    }
  }

  renderResourcesColumn(session) {
    const hasPresentationUrl =
      session.presentationUrl && session.presentationUrl.trim() !== "";
    const hasVideoUrl = session.videoUrl && session.videoUrl.trim() !== "";

    const presentationIcon = hasPresentationUrl
      ? `<a href="${this.escapeHtml(
          session.presentationUrl
        )}" target="_blank" rel="noopener noreferrer" class="resource-link presentation" title="View Presentation">📄</a>`
      : `<span class="resource-link presentation disabled" title="No presentation available">📄</span>`;

    const videoIcon = hasVideoUrl
      ? `<a href="${this.escapeHtml(
          session.videoUrl
        )}" target="_blank" rel="noopener noreferrer" class="resource-link video" title="Watch Video">🎥</a>`
      : `<span class="resource-link video disabled" title="No video available">🎥</span>`;

    return `
            <div class="resources">
                ${presentationIcon}
                <div class="resource-separator"></div>
                ${videoIcon}
            </div>
        `;
  }

  updatePagination() {
    const totalPages = Math.ceil(
      this.filteredSessions.length / this.itemsPerPage
    );

    // Update pagination info
    this.paginationInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;

    // Update navigation buttons
    this.prevPageBtn.disabled = this.currentPage <= 1;
    this.nextPageBtn.disabled = this.currentPage >= totalPages;

    // Generate page numbers
    this.generatePageNumbers(totalPages);

    // Show/hide pagination
    this.paginationEl.style.display = totalPages <= 1 ? "none" : "flex";
  }

  generatePageNumbers(totalPages) {
    this.paginationPages.innerHTML = "";

    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `pagination__page ${
        i === this.currentPage ? "active" : ""
      }`;
      pageBtn.textContent = i;
      pageBtn.addEventListener("click", () => this.goToPage(i));
      this.paginationPages.appendChild(pageBtn);
    }
  }

  goToPage(page) {
    const totalPages = Math.ceil(
      this.filteredSessions.length / this.itemsPerPage
    );
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      this.updateDisplay();

      // Scroll to top of table
      document
        .querySelector(".table-section")
        .scrollIntoView({ behavior: "smooth" });
    }
  }

  toggleAdvancedFilters() {
    const isExpanded =
      this.toggleAdvancedBtn.getAttribute("aria-expanded") === "true";
    const newState = !isExpanded;

    this.toggleAdvancedBtn.setAttribute("aria-expanded", newState.toString());
    this.advancedFiltersEl.setAttribute("aria-hidden", (!newState).toString());

    const toggleText = this.toggleAdvancedBtn.querySelector(".toggle-text");
    toggleText.textContent = newState ? "Fewer Filters" : "More Filters";
  }

  resetAdvancedFilters() {
    this.yearFilter.value = "";
    this.resourcesFilter.value = "";
    this.dateFromInput.value = "";
    this.dateToInput.value = "";
    this.applyFilters();
  }

  clearFilters() {
    this.searchInput.value = "";
    this.locationFilter.value = "";
    this.yearFilter.value = "";
    this.resourcesFilter.value = "";
    this.dateFromInput.value = "";
    this.dateToInput.value = "";
    this.applyFilters();
  }

  exportToCsv() {
    const headers = [
      "Date",
      "Session Topic",
      "Location",
      "Description",
      "Presentation URL",
      "Video URL",
    ];
    const csvContent = [
      headers.join(","),
      ...this.filteredSessions.map((session) =>
        [
          session.date,
          `"${session.sessionTopic.replace(/"/g, '""')}"`,
          `"${session.location.replace(/"/g, '""')}"`,
          `"${(session.description || "").replace(/"/g, '""')}"`,
          `"${(session.presentationUrl || "").replace(/"/g, '""')}"`,
          `"${(session.videoUrl || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `null-sessions-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Utility methods
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  showLoading() {
    this.loadingEl.setAttribute("aria-hidden", "false");
    this.emptyStateEl.setAttribute("aria-hidden", "true");
    this.errorStateEl.setAttribute("aria-hidden", "true");
  }

  hideLoading() {
    this.loadingEl.setAttribute("aria-hidden", "true");
  }

  showEmptyState() {
    this.emptyStateEl.setAttribute("aria-hidden", "false");
    this.errorStateEl.setAttribute("aria-hidden", "true");
  }

  hideEmptyState() {
    this.emptyStateEl.setAttribute("aria-hidden", "true");
  }

  showError() {
    this.loadingEl.setAttribute("aria-hidden", "true");
    this.emptyStateEl.setAttribute("aria-hidden", "true");
    this.errorStateEl.setAttribute("aria-hidden", "false");
  }

  async checkForUpdates() {
    try {
      const response = await fetch("data/update-summary.json");
      if (response.ok) {
        const updateSummary = await response.json();
        const lastCheck = localStorage.getItem("lastUpdateCheck");
        const updateTime = new Date(updateSummary.timestamp).getTime();

        // Show banner if there are new updates and user hasn't seen them
        if (
          (updateSummary.newEvents > 0 || updateSummary.newSessions > 0) &&
          (!lastCheck || updateTime > parseInt(lastCheck))
        ) {
          this.showUpdateBanner(updateSummary);
        }
      }
    } catch (error) {
      // Silently fail - update summary might not exist yet
      console.debug("No update summary found");
    }
  }

  showUpdateBanner(updateSummary) {
    const { newEvents, newSessions } = updateSummary;
    let message = "";

    if (newEvents > 0 && newSessions > 0) {
      message = `${newEvents} new event${
        newEvents > 1 ? "s" : ""
      } and ${newSessions} new session${
        newSessions > 1 ? "s" : ""
      } have been added!`;
    } else if (newEvents > 0) {
      message = `${newEvents} new event${newEvents > 1 ? "s" : ""} ${
        newEvents > 1 ? "have" : "has"
      } been added!`;
    } else if (newSessions > 0) {
      message = `${newSessions} new session${newSessions > 1 ? "s" : ""} ${
        newSessions > 1 ? "have" : "has"
      } been added!`;
    }

    this.updateMessage.textContent = message;
    this.updateBanner.setAttribute("aria-hidden", "false");

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (this.updateBanner.getAttribute("aria-hidden") === "false") {
        this.dismissUpdateBanner();
      }
    }, 10000);
  }

  dismissUpdateBanner() {
    this.updateBanner.setAttribute("aria-hidden", "true");
    // Remember that user has seen this update
    localStorage.setItem("lastUpdateCheck", Date.now().toString());
  }

  async triggerManualUpdate() {
    // Disable button and show loading state
    this.manualUpdateBtn.disabled = true;
    this.manualUpdateBtn.classList.add("updating");
    this.manualUpdateBtn.querySelector(".update-text").textContent =
      "Updating...";

    try {
      console.log("🔄 Manual update triggered by user");

      // Show a temporary message
      this.showTemporaryMessage("Checking for updates...", "info");

      // Try to call the API server first, fallback to summary check
      let updateResult = null;

      try {
        // Call the API server to trigger a real update
        const apiResponse = await fetch("http://localhost:3001/api/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (apiResponse.ok) {
          updateResult = await apiResponse.json();
          console.log("✅ API update completed:", updateResult);

          if (updateResult.success) {
            const summary = updateResult.summary;

            if (summary.newEvents > 0 || summary.newSessions > 0) {
              this.showUpdateBanner(summary);
              this.showTemporaryMessage(
                `Found ${summary.newEvents} new events and ${summary.newSessions} new sessions!`,
                "success"
              );

              // Reload the page to show new data
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              this.showTemporaryMessage(
                "Update completed! No new content found.",
                "success"
              );
            }
          } else {
            throw new Error(updateResult.message || "API update failed");
          }
        } else {
          throw new Error(`API server responded with ${apiResponse.status}`);
        }
      } catch (apiError) {
        console.warn(
          "API server not available, falling back to summary check:",
          apiError.message
        );

        // Fallback: just check the existing summary file
        const response = await fetch("data/update-summary.json");

        if (response.ok) {
          const updateSummary = await response.json();
          const lastCheck = localStorage.getItem("lastUpdateCheck");
          const updateTime = new Date(updateSummary.timestamp).getTime();

          // Check if there are updates the user hasn't seen
          if (
            (updateSummary.newEvents > 0 || updateSummary.newSessions > 0) &&
            (!lastCheck || updateTime > parseInt(lastCheck))
          ) {
            this.showUpdateBanner(updateSummary);
            this.showTemporaryMessage(
              "New content found! Check the banner above.",
              "success"
            );
          } else {
            this.showTemporaryMessage(
              "No new updates available. Data is up to date!",
              "info"
            );
          }
        } else {
          this.showTemporaryMessage(
            "API server not running. Start it with: node api-server.js",
            "info"
          );
        }
      }
    } catch (error) {
      console.error("Manual update failed:", error);
      this.showTemporaryMessage(
        "Update check failed. Please try again later.",
        "error"
      );
    } finally {
      // Reset button state
      setTimeout(() => {
        this.manualUpdateBtn.disabled = false;
        this.manualUpdateBtn.classList.remove("updating");
        this.manualUpdateBtn.querySelector(".update-text").textContent =
          "Update";
      }, 1000);
    }
  }

  showTemporaryMessage(message, type = "info") {
    // Create or update a temporary message element
    let messageEl = document.getElementById("temp-message");

    if (!messageEl) {
      messageEl = document.createElement("div");
      messageEl.id = "temp-message";
      messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        transform: translateX(100%);
      `;
      document.body.appendChild(messageEl);
    }

    // Set message and style based on type
    messageEl.textContent = message;

    const colors = {
      info: "linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",
      success: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
      error: "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
    };

    messageEl.style.background = colors[type] || colors.info;

    // Animate in
    setTimeout(() => {
      messageEl.style.transform = "translateX(0)";
    }, 100);

    // Auto-hide after 4 seconds
    setTimeout(() => {
      messageEl.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.parentNode.removeChild(messageEl);
        }
      }, 300);
    }, 4000);
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new SessionBrowser();
});
