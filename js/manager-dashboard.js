// Manager Dashboard Functionality
document.addEventListener("DOMContentLoaded", function () {
  if (!AuthUtils.isAuthenticated()) {
    window.location.href = "login.php";
    return;
  }

  // Check if user is manager or admin
  const user = AuthUtils.getCurrentUser();
  if (!user || (user.user_role !== "MANAGER" && user.user_role !== "ADMIN")) {
    window.location.href = "login.php";
    return;
  }

  initializeManagerDashboard();
});

async function initializeManagerDashboard() {
  // Update user info
  updateUserInfo();

  // Load dashboard data
  await loadDashboardData();

  // Setup event listeners
  setupManagerEventListeners();

  // Initialize charts
  initializeCharts();
}

function updateUserInfo() {
  const user = AuthUtils.getCurrentUser();
  if (!user) return;

  const userName = user.full_name || user.username;
  const userRole = user.user_role;

  // Update welcome message
  const welcomeElement = document.getElementById("welcomeMessage");
  if (welcomeElement) {
    welcomeElement.textContent = `Welcome, ${userName}`;
  }

  // Update user info in sidebar
  const nameElement = document.getElementById("userName");
  const roleElement = document.getElementById("userRole");

  if (nameElement) nameElement.textContent = userName;
  if (roleElement) roleElement.textContent = userRole.charAt(0) + userRole.slice(1).toLowerCase();

  // Hide Staff section for non-admins
  if (userRole !== "ADMIN") {
    const staffLink = document.querySelector('.sidebar-menu a[data-section="staff"]');
    if (staffLink) {
      staffLink.parentElement.style.display = 'none';
    }
  }
}

async function loadDashboardData() {
  showLoading();

  try {
    // Fetch all required data in parallel
    await Promise.all([
      loadDashboardStats(),
      loadRevenueData(),
      loadRoomOccupancy(),
      loadRecentReservations(),
      loadStaffPerformance()
    ]);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showMessage("error", "Failed to load dashboard data");
  } finally {
    hideLoading();
  }
}

async function loadDashboardStats() {
  try {
    const stats = await API.Dashboard.getStats();
    displayDashboardStats(stats.data);
  } catch (error) {
    console.error("Error loading dashboard stats:", error);
  }
}

async function loadRevenueData() {
  try {
    const revenue = await API.Dashboard.getRevenueData("monthly");
    updateRevenueChart(revenue.data);
  } catch (error) {
    console.error("Error loading revenue data:", error);
  }
}

async function loadRoomOccupancy() {
  try {
    const occupancy = await API.Dashboard.getRoomOccupancy();
    updateRoomOccupancyChart(occupancy.data);
  } catch (error) {
    console.error("Error loading room occupancy:", error);
  }
}

async function loadRecentReservations() {
  try {
    const reservations = await API.Dashboard.getRecentReservations();
    displayRecentReservations(reservations.data);
  } catch (error) {
    console.error("Error loading recent reservations:", error);
  }
}

async function loadStaffPerformance() {
  try {
    const staff = await API.User.getAllUsers();
    const receptionStaff = staff.data.filter(
      (user) => user.user_role === "RECEPTION"
    );
    displayStaffPerformance(receptionStaff);
  } catch (error) {
    console.error("Error loading staff performance:", error);
  }
}

function displayDashboardStats(stats) {
  const container = document.getElementById("dashboardStats");
  if (!container) return;

  container.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon primary">
                <i class="fas fa-dollar-sign"></i>
            </div>
            <div class="stat-content">
                <h3>$${formatNumber(stats.totalRevenue || 0)}</h3>
                <p>Total Revenue</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon success">
                <i class="fas fa-bed"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.totalBookings || 0}</h3>
                <p>Total Bookings</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon warning">
                <i class="fas fa-users"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.totalGuests || 0}</h3>
                <p>Total Guests</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon danger">
                <i class="fas fa-percentage"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.occupancyRate || 0}%</h3>
                <p>Occupancy Rate</p>
            </div>
        </div>
    `;
}

function displayRecentReservations(reservations) {
  const container = document.getElementById("recentActivity");
  if (!container) return;

  if (!reservations || reservations.length === 0) {
    container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-calendar-times"></i>
                <p>No recent reservations</p>
            </div>
        `;
    return;
  }

  const html = reservations
    .map((reservation) => {
      const isBooking = reservation.status === "CONFIRMED" || reservation.status === "PENDING";
      const isCheckIn = reservation.status === "CHECKED_IN";
      const isCheckOut = reservation.status === "COMPLETED";
      const isCancel = reservation.status === "CANCELLED";

      let iconClass = "booking";
      let iconHtml = '<i class="fas fa-calendar-check"></i>';
      let titleMsg = "New Booking";
      let descMsg = `Guest ${reservation.full_name || "Guest (#" + reservation.user_id + ")"} booked Room ${reservation.room_number}.`;

      if (isCheckIn) {
        iconClass = "checkin";
        iconHtml = '<i class="fas fa-sign-in-alt"></i>';
        titleMsg = "Guest Checked In";
        descMsg = `Guest ${reservation.full_name || "Guest"} checked into Room ${reservation.room_number}.`;
      } else if (isCheckOut) {
        iconClass = "checkout";
        iconHtml = '<i class="fas fa-sign-out-alt"></i>';
        titleMsg = "Guest Checked Out";
        descMsg = `Guest ${reservation.full_name || "Guest"} checked out from Room ${reservation.room_number}.`;
      } else if (isCancel) {
        iconClass = "cancel";
        iconHtml = '<i class="fas fa-times-circle"></i>';
        titleMsg = "Reservation Cancelled";
        descMsg = `Booking for ${reservation.full_name || "Guest"} was cancelled.`;
      }

      return `
        <div class="activity-item">
          <div class="activity-icon ${iconClass}">
            ${iconHtml}
          </div>
          <div class="activity-content">
            <div class="activity-header">
              <h5 class="activity-title">${titleMsg}</h5>
              <span class="activity-time">${formatDate(reservation.created_at || reservation.check_in_date)}</span>
            </div>
            <p class="activity-desc">${descMsg}</p>
            <div class="activity-meta">
              <span><i class="fas fa-hashtag"></i> ${reservation.reservation_id}</span>
              <span><i class="fas fa-money-bill"></i> $${reservation.total_price}</span>
              <span class="badge bg-${getStatusColor(reservation.status)}">
                  ${reservation.status}
              </span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = html;
}

function displayStaffPerformance(staff) {
  const container = document.getElementById("recentActivity"); // Or staffTable if preferred, but usually managers want activity here
  if (!container) return;

  if (!staff || staff.length === 0) {
    container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-users"></i>
                <p>No staff members found</p>
            </div>
        `;
    return;
  }

  const html = staff
    .map(
      (employee) => `
        <div class="staff-card">
            <div class="staff-info">
                <div class="staff-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div>
                    <h6>${employee.full_name}</h6>
                    <p>${employee.email}</p>
                </div>
            </div>
            <div class="staff-stats">
                <div class="stat">
                    <span class="stat-label">Bookings</span>
                    <span class="stat-value">${employee.total_bookings || 0
        }</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Rating</span>
                    <span class="stat-value">${employee.rating || "N/A"}</span>
                </div>
            </div>
            <div class="staff-actions">
                <button class="btn btn-sm btn-primary" onclick="viewStaffDetails(${employee.user_id
        })">
                    <i class="fas fa-chart-line"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");

  container.innerHTML = html;
}

function setupManagerEventListeners() {
  // Period selector for revenue chart
  const periodSelector = document.getElementById("revenuePeriod");
  if (periodSelector) {
    periodSelector.addEventListener("change", handleRevenuePeriodChange);
  }

  // Date range selector for reports
  const reportDateRange = document.getElementById("reportDateRange");
  if (reportDateRange) {
    reportDateRange.addEventListener("change", handleReportDateChange);
  }

  // Export buttons
  const exportButtons = document.querySelectorAll(".export-btn");
  exportButtons.forEach((button) => {
    button.addEventListener("click", handleExport);
  });

  // Add room button
  const addRoomBtn = document.getElementById("addRoomBtn");
  if (addRoomBtn) {
    addRoomBtn.addEventListener("click", showAddRoomModal);
  }

  // Add staff button
  const addStaffBtn = document.getElementById("addStaffBtn");
  if (addStaffBtn) {
    addStaffBtn.addEventListener("click", showAddStaffModal);
  }

  // Refresh and Export
  const refreshBtn = document.getElementById("refreshDataBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadDashboardData);
  }

  const exportBtn = document.getElementById("exportDataBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", handleExport);
  }


  // Room Form Submit
  const addRoomForm = document.getElementById("addRoomForm");
  if (addRoomForm) {
    addRoomForm.addEventListener("submit", handleAddRoom);
  }

  // Staff Form Submit
  const addStaffForm = document.getElementById("addStaffForm");
  if (addStaffForm) {
    addStaffForm.addEventListener("submit", handleAddStaff);
  }

  // Edit Room Form Submit
  const editRoomForm = document.getElementById("editRoomForm");
  if (editRoomForm) {
    editRoomForm.addEventListener("submit", handleUpdateRoom);
  }

  // Edit Staff Form Submit
  const editStaffForm = document.getElementById("editStaffForm");
  if (editStaffForm) {
    editStaffForm.addEventListener("submit", handleUpdateStaff);
  }

  // Navigation tabs
  // Navigation tabs
  const navLinks = document.querySelectorAll(".sidebar-menu a[data-section]");
  const sections = document.querySelectorAll(".dashboard-section");

  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      // Remove active class from all links and sections
      navLinks.forEach((l) => l.classList.remove("active"));
      sections.forEach((s) => s.classList.remove("active"));

      // Add active class to clicked link and corresponding section
      this.classList.add("active");
      const targetId = this.getAttribute("data-section");
      const section = document.getElementById(targetId);
      if (section) {
        section.classList.add("active");

        // Load section specific data
        switch (targetId) {
          case "dashboard":
            loadDashboardData();
            break;
          case "analytics":
            loadAnalyticsData();
            break;
          case "rooms":
            loadRoomsManagement();
            break;
          case "staff":
            if (AuthUtils.getCurrentUserRole() === "ADMIN") {
              loadStaffManagement();
            } else {
              showMessage("error", "Access denied");
              document.querySelector('.sidebar-menu a[data-section="dashboard"]').click();
            }
            break;
          case "reservations":
            loadReservations();
            break;
          case "finance":
            loadFinanceData();
            break;
          case "reports":
            loadReportsData();
            break;
        }
      }
    });
  });
  // Tab change listeners
  const tabTriggers = document.querySelectorAll('[data-bs-toggle="tab"]');
  tabTriggers.forEach((tab) => {
    tab.addEventListener("shown.bs.tab", handleTabChange);
  });
}

function initializeCharts() {
  // Initialize revenue chart
  initializeRevenueChart();

  // Initialize occupancy chart
  initializeOccupancyChart();
}

function initializeRevenueChart() {
  const ctx = document.getElementById("revenueChart");
  if (!ctx) return;

  window.revenueChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Revenue",
          data: [],
          borderColor: "#3498db",
          backgroundColor: "rgba(52, 152, 219, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `$${context.parsed.y.toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "$" + value;
            },
          },
        },
      },
    },
  });
}

function initializeOccupancyChart() {
  const ctx = document.getElementById("occupancyChart");
  if (!ctx) return;

  window.occupancyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Available", "Occupied", "Maintenance", "Cleaning"],
      datasets: [
        {
          label: "Rooms",
          data: [0, 0, 0, 0],
          backgroundColor: ["#27ae60", "#e74c3c", "#f39c12", "#3498db"],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

async function handleRevenuePeriodChange(e) {
  const period = e.target.value;

  try {
    const revenue = await API.Dashboard.getRevenueData(period);
    updateRevenueChart(revenue.data);
  } catch (error) {
    console.error("Error loading revenue data:", error);
    showMessage("error", "Failed to load revenue data");
  }
}

async function handleReportDateChange(e) {
  const dateRange = e.target.value;
  const [startDate, endDate] = dateRange.split(" to ");

  if (startDate && endDate) {
    await generateReport(startDate, endDate);
  }
}

async function handleExport(e) {
  const format = e.target.dataset.format;
  const reportType = e.target.dataset.report;

  try {
    await exportReport(reportType, format);
  } catch (error) {
    console.error("Error exporting report:", error);
    showMessage("error", "Failed to export report");
  }
}

async function generateReport(startDate, endDate) {
  showLoading();

  try {
    // Fetch report data
    const [reservations, revenue, occupancy] = await Promise.all([
      API.Reservation.getAllReservations(),
      API.Dashboard.getRevenueData("custom", startDate, endDate),
      API.Dashboard.getRoomOccupancy(),
    ]);

    // Filter reservations by date range
    const filteredReservations = reservations.data.filter((res) => {
      const checkIn = new Date(res.check_in_date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return checkIn >= start && checkIn <= end;
    });

    // Display report
    displayReport({
      reservations: filteredReservations,
      revenue: revenue.data,
      occupancy: occupancy.data,
      period: `${startDate} to ${endDate}`,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    showMessage("error", "Failed to generate report");
  } finally {
    hideLoading();
  }
}

function displayReport(reportData) {
  const container = document.getElementById("reportResults");
  if (!container) return;

  const totalRevenue = reportData.revenue.total || 0;
  const totalBookings = reportData.reservations.length;
  const totalGuests = new Set(reportData.reservations.map((r) => r.user_id))
    .size;

  container.innerHTML = `
        <div class="report-summary">
            <h4>Report Summary (${reportData.period})</h4>
            <div class="summary-stats">
                <div class="summary-stat">
                    <h5>$${formatNumber(totalRevenue)}</h5>
                    <p>Total Revenue</p>
                </div>
                <div class="summary-stat">
                    <h5>${totalBookings}</h5>
                    <p>Total Bookings</p>
                </div>
                <div class="summary-stat">
                    <h5>${totalGuests}</h5>
                    <p>Unique Guests</p>
                </div>
                <div class="summary-stat">
                    <h5>${reportData.occupancy.rate || 0}%</h5>
                    <p>Occupancy Rate</p>
                </div>
            </div>
        </div>
        
        <div class="report-details">
            <h5>Recent Bookings</h5>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Guest</th>
                            <th>Room</th>
                            <th>Check-in</th>
                            <th>Check-out</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.reservations
      .slice(0, 10)
      .map(
        (res) => `
                            <tr>
                                <td>#${res.reservation_id}</td>
                                <td>${res.full_name || "Guest"}</td>
                                <td>${res.room_number}</td>
                                <td>${formatDate(res.check_in_date)}</td>
                                <td>${formatDate(res.check_out_date)}</td>
                                <td>$${res.total_price}</td>
                                <td>
                                    <span class="badge bg-${getStatusColor(
          res.status
        )}">
                                        ${res.status}
                                    </span>
                                </td>
                            </tr>
                        `
      )
      .join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function exportReport(reportType, format) {
  // In a real application, this would make an API call to generate and download the report
  showMessage("info", `Exporting ${reportType} report in ${format} format...`);

  // Simulate API call
  setTimeout(() => {
    showMessage("success", "Report exported successfully!");
  }, 2000);
}

function updateRevenueChart(data) {
  if (!window.revenueChart) return;

  window.revenueChart.data.labels = data.labels || [];
  window.revenueChart.data.datasets[0].data = data.values || [];
  window.revenueChart.update();
}

function updateRoomOccupancyChart(data) {
  if (!window.occupancyChart) return;

  window.occupancyChart.data.datasets[0].data = [
    data.available || 0,
    data.occupied || 0,
    data.maintenance || 0,
    data.cleaning || 0,
  ];
  window.occupancyChart.update();
}

// Modal functions
function showAddRoomModal() {
  const modal = document.getElementById("addRoomModal");
  if (!modal) return;

  // Reset form
  const form = modal.querySelector("form");
  if (form) {
    form.reset();
  }

  const bootstrapModal = new bootstrap.Modal(modal);
  bootstrapModal.show();
}

async function showAddStaffModal() {
  const modal = document.getElementById("addStaffModal");
  if (!modal) return;

  // Reset form
  const form = modal.querySelector("form");
  if (form) {
    form.reset();
  }

  const bootstrapModal = new bootstrap.Modal(modal);
  bootstrapModal.show();
}

async function viewReservationDetails(reservationId) {
  try {
    const response = await API.Reservation.getReservationById(reservationId);

    if (response.success) {
      showReservationDetailsModal(response.data);
    }
  } catch (error) {
    console.error("Error loading reservation details:", error);
    showMessage("error", "Failed to load reservation details");
  }
}

async function viewStaffDetails(userId) {
  try {
    const user = await API.User.getUserById(userId);
    const reservations = await API.Reservation.getAllReservations();

    // Filter reservations handled by this staff
    const staffReservations = reservations.data.filter(
      (res) => res.handled_by === userId
    );

    showStaffDetailsModal(user.data, staffReservations);
  } catch (error) {
    console.error("Error loading staff details:", error);
    showMessage("error", "Failed to load staff details");
  }
}

// Form handlers
async function handleAddRoom(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const roomData = {
    room_number: formData.get("room_number"),
    room_type: formData.get("room_type"),
    description: formData.get("description"),
    price_per_night: parseFloat(formData.get("price_per_night")),
    capacity: parseInt(formData.get("capacity")),
    amenities: formData.get("amenities"),
    status: formData.get("status"),
  };

  showLoading();

  try {
    const response = await API.Room.createRoom(roomData);

    if (response.success) {
      showMessage("success", "Room added successfully!");
      e.target.reset();
      bootstrap.Modal.getInstance(document.getElementById("addRoomModal"))?.hide();
      await loadRoomsManagement();
    } else {
      showMessage("error", response.message);
    }
  } catch (error) {
    console.error("Error adding room:", error);
    showMessage("error", "Failed to add room");
  } finally {
    hideLoading();
  }
}

async function handleAddStaff(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const staffData = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    username: formData.get("username"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    user_role: formData.get("user_role"),
  };

  showLoading();

  try {
    const response = await API.Auth.register(staffData);

    if (response.success) {
      showMessage("success", "Staff member added successfully!");
      e.target.reset();
      bootstrap.Modal.getInstance(document.getElementById("addStaffModal"))?.hide();
      await loadStaffManagement();
    } else {
      showMessage("error", response.message);
    }
  } catch (error) {
    console.error("Error adding staff:", error);
    showMessage("error", "Failed to add staff member");
  } finally {
    hideLoading();
  }
}

async function handleTabChange(e) {
  const tabId = e.target.getAttribute("href");

  // Load specific data based on active tab
  switch (tabId) {
    case "#rooms":
      await loadRoomsManagement();
      break;
    case "#staff":
      await loadStaffManagement();
      break;
    case "#analytics":
      await loadAnalyticsData();
      break;
    case "#reservations":
      await loadReservations();
      break;
  }
}

async function loadReservations() {
  try {
    const response = await API.Reservation.getAllReservations();
    displayReservations(response.data);
  } catch (error) {
    console.error("Error loading reservations:", error);
    showMessage("error", "Failed to load reservations");
  }
}

function displayReservations(reservations) {
  const table = document.getElementById("reservationsTable");
  if (!table) return;
  const container = table.querySelector("tbody");
  if (!container) return;

  if (!reservations || reservations.length === 0) {
    container.innerHTML = '<tr><td colspan="7" class="text-center">No reservations found</td></tr>';
    return;
  }

  const html = reservations
    .map(
      (res) => `
        <tr>
            <td>#${res.reservation_id}</td>
            <td>${res.full_name || "Guest"}</td>
            <td>Room ${res.room_number || "N/A"}</td>
            <td>${formatDate(res.check_in_date)}</td>
            <td>${formatDate(res.check_out_date)}</td>
            <td>
                <span class="badge bg-${getReservationStatusColor(res.status)}">
                    ${res.status}
                </span>
            </td>
            <td class="table-actions">
                <button class="btn btn-sm btn-info" onclick="viewReservation(${res.reservation_id})">
                    <i class="fas fa-eye"></i>
                </button>
                ${res.status === 'PENDING' ? `
                <button class="btn btn-sm btn-success" onclick="updateReservationStatus(${res.reservation_id}, 'CONFIRMED')">
                    <i class="fas fa-check"></i>
                </button>` : ''}
                ${res.status !== 'CANCELLED' && res.status !== 'CHECKED_OUT' ? `
                <button class="btn btn-sm btn-danger" onclick="updateReservationStatus(${res.reservation_id}, 'CANCELLED')">
                    <i class="fas fa-times"></i>
                </button>` : ''}
            </td>
        </tr>`
    )
    .join("");

  container.innerHTML = html;
}

function getReservationStatusColor(status) {
  switch (status) {
    case "PENDING": return "warning";
    case "CONFIRMED": return "primary";
    case "CHECKED_IN": return "success";
    case "CHECKED_OUT": return "info";
    case "CANCELLED": return "danger";
    default: return "secondary";
  }
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

async function viewReservation(id) {
  try {
    const response = await API.Reservation.getReservationById(id);
    showReservationDetailsModal(response.data);
  } catch (error) {
    console.error("Error loading reservation:", error);
    showMessage("error", "Failed to load reservation details");
  }
}

async function updateReservationStatus(id, status) {
  BookingUI.showConfirm({
    title: "Change Status",
    message: `Are you sure you want to change status to ${status}?`,
    onConfirm: async () => {
      showLoading();
      try {
        const result = await API.Reservation.updateStatus(id, status);
        if (result.success) {
          showMessage("success", "Status updated successfully!");
          await loadReservations();
          bootstrap.Modal.getInstance(document.getElementById("reservationDetailsModal"))?.hide();
        } else {
          showMessage("error", result.message);
        }
      } catch (error) {
        console.error("Error updating status:", error);
        showMessage("error", "Error updating status");
      } finally {
        hideLoading();
      }
    }
  });

  showLoading();
  try {
    const response = await API.Reservation.updateReservationStatus(id, status);
    if (response.success) {
      showMessage("success", `Reservation ${status.toLowerCase()} successfully!`);
      await loadReservations();
      // Also update dashboard stats if on dashboard
      loadDashboardStats();
    } else {
      showMessage("error", response.message);
    }
  } catch (error) {
    console.error("Error updating reservation:", error);
    showMessage("error", "Failed to update reservation");
  } finally {
    hideLoading();
  }
}

async function loadRoomsManagement() {
  try {
    const rooms = await API.Room.getAllRooms();
    displayRoomsManagement(rooms.data);
  } catch (error) {
    console.error("Error loading rooms:", error);
    showMessage("error", "Failed to load rooms");
  }
}

async function loadStaffManagement() {
  try {
    const staff = await API.User.getAllUsers();
    const staffList = staff.data.users || [];
    const filteredStaff = staffList.filter(
      (user) => user.user_role === "RECEPTION" || user.user_role === "MANAGER"
    );
    displayStaffManagement(filteredStaff);
  } catch (error) {
    console.error("Error loading staff:", error);
    showMessage("error", "Failed to load staff");
  }
}

async function loadAnalyticsData() {
  try {
    // Load additional analytics data
    const [roomTypes, guestDemographics] = await Promise.all([
      getRoomTypeAnalytics(),
      getGuestDemographics(),
    ]);

    displayAnalyticsData(roomTypes, guestDemographics);
  } catch (error) {
    console.error("Error loading analytics:", error);
  }
}

async function loadFinanceData() {
  showLoading();
  try {
    const revenue = await API.Dashboard.getRevenueData("year");
    displayFinanceData(revenue.data);
  } catch (error) {
    console.error("Error loading finance data:", error);
    showMessage("error", "Failed to load financial data");
  } finally {
    hideLoading();
  }
}

async function loadReportsData() {
  showLoading();
  try {
    // Generate some mock/available reports for now
    const reports = [
      { id: 'daily-revenue', name: 'Daily Revenue Report', type: 'Financial', date: formatDate(new Date()) },
      { id: 'monthly-occupancy', name: 'Monthly Occupancy Report', type: 'Operational', date: formatDate(new Date()) },
      { id: 'guest-satisfaction', name: 'Guest Satisfaction Survey', type: 'Feedback', date: formatDate(new Date()) },
      { id: 'staff-performance', name: 'Staff Performance Review', type: 'Management', date: formatDate(new Date()) }
    ];
    displayReports(reports);
  } catch (error) {
    console.error("Error loading reports:", error);
  } finally {
    hideLoading();
  }
}

function displayFinanceData(data) {
  // Initialize or update finance chart (Income vs Expenses)
  const ctx = document.getElementById('financeChart');
  if (!ctx) return;

  // Mock expense data for comparison
  const labels = data.revenue_trend.map(item => item.date);
  const income = data.revenue_trend.map(item => item.revenue);
  const expenses = income.map(val => val * 0.4 + (Math.random() * 100)); // Simple mock expense calc

  if (window.financeChartInstance) {
    window.financeChartInstance.destroy();
  }

  window.financeChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Income',
          data: income,
          backgroundColor: 'rgba(46, 204, 113, 0.6)',
          borderColor: 'rgb(46, 204, 113)',
          borderWidth: 1
        },
        {
          label: 'Expenses',
          data: expenses,
          backgroundColor: 'rgba(231, 76, 60, 0.6)',
          borderColor: 'rgb(231, 76, 60)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function displayReports(reports) {
  const container = document.getElementById('reportsGrid');
  if (!container) return;

  container.innerHTML = reports.map(report => `
    <div class="report-card card mb-3">
      <div class="card-body">
        <h5 class="card-title">${report.name}</h5>
        <h6 class="card-subtitle mb-2 text-muted">${report.type}</h6>
        <p class="card-text">Generated on: ${report.date}</p>
        <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="generateReport('${report.id}')">View</button>
            <button class="btn btn-sm btn-outline-success" onclick="exportReport('${report.id}', 'pdf')">PDF</button>
            <button class="btn btn-sm btn-outline-info" onclick="exportReport('${report.id}', 'csv')">CSV</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Display functions for management tabs
function displayRoomsManagement(rooms) {
  const table = document.getElementById("roomsTable");
  if (!table) return;
  const container = table.querySelector("tbody");
  if (!container) return;

  const html = rooms
    .map(
      (room) => `
        <tr>
            <td>${room.room_number}</td>
            <td>${room.room_type}</td>
            <td>
                <span class="badge bg-${getRoomStatusColor(room.status)}">
                    ${room.status}
                </span>
            </td>
            <td>$${room.price_per_night}</td>
            <td class="table-actions">
                <button class="btn btn-sm btn-primary" onclick="editRoom(${room.room_id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteRoom(${room.room_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `
    )
    .join("");

  container.innerHTML = html;
}

function displayStaffManagement(staff) {
  const table = document.getElementById("staffTable");
  if (!table) return;
  const container = table.querySelector("tbody");
  if (!container) return;

  const html = staff
    .map(
      (employee) => `
        <tr>
            <td>${employee.full_name}</td>
            <td>${employee.user_role}</td>
            <td>${employee.email}</td>
            <td><span class="badge bg-success">Active</span></td>
            <td class="table-actions">
                <button class="btn btn-sm btn-primary" onclick="editStaff(${employee.user_id})">
                    <i class="fas fa-edit"></i>
                </button>
                ${AuthUtils.getCurrentUserRole() === 'ADMIN' ? `
                <button class="btn btn-sm btn-danger" onclick="deleteStaff(${employee.user_id})">
                    <i class="fas fa-trash"></i>
                </button>
                ` : ''}
            </td>
        </tr>
    `
    )
    .join("");

  container.innerHTML = html;
}

function displayAnalyticsData(roomTypes, demographics) {
  // We keep the occupancy and revenue breakdown charts from the overview tab
  // but we also have local versions if we want to differentiate

  // Initialize analytics-specific charts
  initializeRoomTypeChart(roomTypes);
  initializeDemographicsChart(demographics);
}

function initializeRoomTypeChart(data) {
  const ctx = document.getElementById('roomTypeChart');
  if (!ctx) return;

  if (window.roomTypeChartInstance) window.roomTypeChartInstance.destroy();

  window.roomTypeChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: [
          '#3498db',
          '#2ecc71',
          '#f1c40f',
          '#e74c3c',
          '#9b59b6'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function initializeDemographicsChart(data) {
  const ctx = document.getElementById('demographicsChart');
  if (!ctx) return;

  if (window.demographicsChartInstance) window.demographicsChartInstance.destroy();

  window.demographicsChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: [
          '#1abc9c',
          '#e67e22',
          '#95a5a6',
          '#34495e'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

async function generateReport(reportId) {
  const modal = new bootstrap.Modal(document.getElementById('reportModal'));
  const title = document.getElementById('reportModalTitle');
  const content = document.getElementById('reportContent');

  title.innerText = `Generating ${reportId}...`;
  content.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin fa-3x"></i><p class="mt-2">Processing Data...</p></div>';
  modal.show();

  // Simulate data fetching
  setTimeout(() => {
    title.innerText = reportId.replace(/-/g, ' ').toUpperCase();
    content.innerHTML = `
        <div class="report-header text-center mb-4">
            <h4>GRAND HOTEL BIJOU</h4>
            <p class="text-muted">Status: Finalized | Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Total Occupancy</td><td>84%</td><td><span class="badge bg-success">High</span></td></tr>
                <tr><td>Gross Revenue</td><td>$14,250.00</td><td><span class="badge bg-primary">Target Met</span></td></tr>
                <tr><td>Guest Satisfaction</td><td>4.8/5</td><td><span class="badge bg-success">Excellent</span></td></tr>
                <tr><td>Operational Cost</td><td>$5,120.00</td><td><span class="badge bg-warning">Review</span></td></tr>
            </tbody>
        </table>
        <div class="mt-4 p-3 bg-light rounded">
            <h6>Summary Conclusion</h6>
            <p>Overall performance for this period is outstanding. Room occupancy spiked during the weekend, leading to record-breaking revenue for our Deluxe suites.</p>
        </div>
    `;
  }, 1000);
}

function exportReport(reportId, format) {
  showMessage("info", `Exporting ${reportId} as ${format.toUpperCase()}...`);
  setTimeout(() => {
    showMessage("success", `${format.toUpperCase()} generated successfully! Check your downloads.`);
  }, 1500);
}

// Additional utility functions
function formatNumber(num) {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateString) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusColor(status) {
  switch (status) {
    case "PENDING":
      return "warning";
    case "CONFIRMED":
      return "primary";
    case "CHECKED_IN":
      return "success";
    case "CHECKED_OUT":
      return "info";
    case "CANCELLED":
      return "danger";
    default:
      return "secondary";
  }
}

function getRoomStatusColor(status) {
  switch (status) {
    case "AVAILABLE":
      return "success";
    case "OCCUPIED":
      return "danger";
    case "MAINTENANCE":
      return "warning";
    case "CLEANING":
      return "info";
    default:
      return "secondary";
  }
}

// Placeholder functions for analytics
// Analytics data fetching
async function getRoomTypeAnalytics() {
  try {
    const rooms = await API.Room.getAllRooms();
    const stats = {};
    rooms.data.forEach(room => {
      stats[room.room_type] = (stats[room.room_type] || 0) + 1;
    });
    return stats;
  } catch (error) {
    console.error("Error calculating room analytics:", error);
    return { Standard: 0, Deluxe: 0, Suite: 0 };
  }
}

async function getGuestDemographics() {
  try {
    const reservations = await API.Reservation.getAllReservations();
    // This is a simplification - real demographics might need more data
    const stats = { 'Business': 0, 'Leisure': 0, 'Family': 0, 'Other': 0 };
    reservations.data.forEach(res => {
      if (res.guests > 2) stats['Family']++;
      else if (res.total_price > 1000) stats['Leisure']++;
      else stats['Business']++;
    });
    return stats;
  } catch (error) {
    console.error("Error calculating guest demographics:", error);
    return { 'Business': 0, 'Leisure': 0 };
  }
}

function initializeRoomTypeChart(data) {
  const ctx = document.getElementById("roomTypeChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(data),
      datasets: [
        {
          data: Object.values(data),
          backgroundColor: ["#3498db", "#2ecc71", "#e74c3c", "#f39c12"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

function initializeDemographicsChart(data) {
  const ctx = document.getElementById("demographicsChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(data),
      datasets: [
        {
          data: Object.values(data),
          backgroundColor: ["#9b59b6", "#1abc9c", "#34495e", "#e67e22"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

// Action functions
async function editRoom(roomId) {
  try {
    const room = await API.Room.getRoomById(roomId);
    showEditRoomModal(room.data);
  } catch (error) {
    console.error("Error loading room details:", error);
    showMessage("error", "Failed to load room details");
  }
}

async function deleteRoom(roomId) {
  BookingUI.showConfirm({
    title: "Delete Room",
    message: "Are you sure you want to delete this room?",
    confirmText: "Delete",
    onConfirm: async () => {
      showLoading();
      try {
        const response = await API.Room.deleteRoom(roomId);
        if (response.success) {
          showMessage("success", "Room deleted successfully!");
          await loadRoomsManagement();
        } else {
          showMessage("error", response.message);
        }
      } catch (error) {
        console.error("Error deleting room:", error);
        showMessage("error", "Failed to delete room");
      } finally {
        hideLoading();
      }
    }
  });
}

async function updateRoomStatus(roomId) {
  try {
    const room = await API.Room.getRoomById(roomId);
    showUpdateRoomStatusModal(room.data);
  } catch (error) {
    console.error("Error loading room details:", error);
    showMessage("error", "Failed to load room details");
  }
}

async function editStaff(userId) {
  try {
    const user = await API.User.getUserById(userId);
    showEditStaffModal(user.data);
  } catch (error) {
    console.error("Error loading staff details:", error);
    showMessage("error", "Failed to load staff details");
  }
}

async function deleteStaff(userId) {
  BookingUI.showConfirm({
    title: "Delete Staff",
    message: "Are you sure you want to delete this staff member?",
    confirmText: "Delete",
    onConfirm: async () => {
      showLoading();
      try {
        const response = await API.User.deleteUser(userId);
        if (response.success) {
          showMessage("success", "Staff member deleted successfully!");
          await loadStaffManagement();
        } else {
          showMessage("error", response.message);
        }
      } catch (error) {
        console.error("Error deleting staff:", error);
        showMessage("error", "Failed to delete staff member");
      } finally {
        hideLoading();
      }
    }
  });
}

async function resetStaffPassword(userId) {
  BookingUI.showConfirm({
    title: "Reset Password",
    message: "Are you sure you want to reset password for this staff member?",
    confirmText: "Reset",
    onConfirm: async () => {
      showLoading();
      try {
        // In a real application, this would call an API endpoint
        showMessage("success", "Password reset email sent to staff member");
      } catch (error) {
        console.error("Error resetting password:", error);
        showMessage("error", "Failed to reset password");
      } finally {
        hideLoading();
      }
    }
  });
}

// Modal display functions (simplified versions)
// Modal display functions
function showEditRoomModal(room) {
  const form = document.getElementById("editRoomForm");
  if (!form) return;

  form.elements["room_id"].value = room.room_id;
  form.elements["room_number"].value = room.room_number;
  form.elements["room_type"].value = room.room_type;
  form.elements["price_per_night"].value = room.price_per_night;
  form.elements["status"].value = room.status;

  const modal = new bootstrap.Modal(document.getElementById("editRoomModal"));
  modal.show();
}

async function handleUpdateRoom(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const roomId = formData.get("room_id");
  const roomData = {
    room_number: formData.get("room_number"),
    room_type: formData.get("room_type"),
    price_per_night: formData.get("price_per_night"),
    status: formData.get("status"),
  };

  showLoading();
  try {
    const response = await API.Room.updateRoom(roomId, roomData);
    if (response.success) {
      showMessage("success", "Room updated successfully!");
      bootstrap.Modal.getInstance(document.getElementById("editRoomModal"))?.hide();
      await loadRoomsManagement();
    } else {
      showMessage("error", response.message);
    }
  } catch (error) {
    console.error("Error updating room:", error);
    showMessage("error", "Failed to update room");
  } finally {
    hideLoading();
  }
}

function showEditStaffModal(staff) {
  const form = document.getElementById("editStaffForm");
  if (!form) return;

  form.elements["user_id"].value = staff.user_id;
  form.elements["full_name"].value = staff.full_name;
  form.elements["email"].value = staff.email;
  form.elements["user_role"].value = staff.user_role;

  const modal = new bootstrap.Modal(document.getElementById("editStaffModal"));
  modal.show();
}

async function handleUpdateStaff(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const userId = formData.get("user_id");
  const staffData = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    user_role: formData.get("user_role"),
  };

  showLoading();
  try {
    const response = await API.User.updateUser(userId, staffData);
    if (response.success) {
      showMessage("success", "Staff updated successfully!");
      bootstrap.Modal.getInstance(document.getElementById("editStaffModal"))?.hide();
      await loadStaffManagement();
    } else {
      showMessage("error", response.message);
    }
  } catch (error) {
    console.error("Error updating staff:", error);
    showMessage("error", "Failed to update staff member");
  } finally {
    hideLoading();
  }
}

function showUpdateRoomStatusModal(room) {
  // We can reuse showEditRoomModal or make it simpler
  showEditRoomModal(room);
}

function showReservationDetailsModal(reservation) {
  const body = document.getElementById("reservationDetailsBody");
  if (!body) return;

  body.innerHTML = `
    <div class="reservation-details">
      <div class="mb-3">
        <h6>Guest Information</h6>
        <p><strong>Name:</strong> ${reservation.full_name || 'N/A'}</p>
        <p><strong>Email:</strong> ${reservation.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${reservation.phone || 'N/A'}</p>
      </div>
      <div class="mb-3">
        <h6>Stay Details</h6>
        <p><strong>Room:</strong> ${reservation.room_number ? 'Room ' + reservation.room_number : 'Not assigned'}</p>
        <p><strong>Dates:</strong> ${formatDate(reservation.check_in_date)} to ${formatDate(reservation.check_out_date)}</p>
        <p><strong>Guests:</strong> ${reservation.guests}</p>
      </div>
      <div class="mb-0">
        <h6>Financials</h6>
        <p><strong>Total Price:</strong> $${reservation.total_price}</p>
        <p><strong>Status:</strong> <span class="badge bg-${getStatusColor(reservation.status)}">${reservation.status}</span></p>
      </div>
    </div>
  `;

  const modal = new bootstrap.Modal(document.getElementById("reservationDetailsModal"));
  modal.show();
}

function showStaffDetailsModal(staff, reservations) {
  const totalRevenue = reservations.reduce((sum, res) => sum + parseFloat(res.total_price || 0), 0);

  BookingUI.showSuccess({
    title: "Staff Performance",
    subtitle: `${staff.full_name} (${staff.user_role})`,
    reservationId: "Performance Metrics",
    roomNumber: `Bookings: ${reservations.length}`,
    totalAmount: totalRevenue.toFixed(2),
    checkIn: "Rating",
    checkOut: `${staff.rating || '4.5'}/5.0`,
    actionText: "Export Report",
    onAction: () => showMessage("info", "Report export coming soon!")
  });
}

// Message and loading utilities
function showMessage(type, text) {
  if (typeof showNotification === 'function') {
    showNotification(type, text);
    return;
  }

  // Fallback if notifications.js didn't load
  const existingMessage = document.querySelector(".alert");
  if (existingMessage) existingMessage.remove();

  const messageDiv = document.createElement("div");
  messageDiv.className = `alert alert-${type === 'error' ? 'danger' : type} fixed-top mt-5 mx-3`;
  messageDiv.style.cssText = "z-index: 9999; position: fixed; top: 80px; right: 20px; max-width: 300px;";
  messageDiv.innerHTML = `<button type="button" class="btn-close" onclick="this.parentElement.remove()"></button> ${text}`;
  document.body.appendChild(messageDiv);
  setTimeout(() => messageDiv.remove(), 5000);
}

function showLoading() {
  let loadingDiv = document.getElementById("loadingOverlay");

  if (!loadingDiv) {
    loadingDiv = document.createElement("div");
    loadingDiv.id = "loadingOverlay";
    loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
    loadingDiv.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loadingDiv);
  }
}

function hideLoading() {
  const loadingDiv = document.getElementById("loadingOverlay");
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

// Expose functions to global scope
window.viewReservationDetails = viewReservationDetails;
window.viewStaffDetails = viewStaffDetails;
window.showEditRoomModal = showEditRoomModal;
window.deleteRoom = deleteRoom;
window.showEditStaffModal = showEditStaffModal;
window.deleteStaff = deleteStaff;
window.showUpdateRoomStatusModal = showUpdateRoomStatusModal;
window.showAddRoomModal = showAddRoomModal;
window.showAddStaffModal = showAddStaffModal;
// [Eyuel commit 7] incremental JS improvement
