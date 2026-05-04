// Reception Dashboard Functionality
document.addEventListener("DOMContentLoaded", function () {
  // Check if user is authenticated and has the correct role
  const token = AuthUtils.getToken();
  const user = AuthUtils.getCurrentUser();
  if (!token || !user || !["RECEPTION", "ADMIN"].includes(user.user_role)) {
    window.location.href = "login.php";
    return;
  }

  initializeReceptionDashboard();
});


async function initializeReceptionDashboard() {
  // Update user info
  updateUserInfo();

  // Load dashboard data
  await loadDashboardData();

  // Setup event listeners
  setupReceptionEventListeners();

  // Initialize date pickers
  initializeDatePickers();
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
}

async function loadDashboardData() {
  showLoading();

  try {
    // Fetch all required data in parallel
    await Promise.all([
      loadCheckingsAndReservations(), // Combined for efficiency
      loadAvailableRooms(),
      loadDashboardStats(),
      loadRecentActivity()
    ]);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showMessage("error", "Failed to load dashboard data");
  } finally {
    hideLoading();
  }
}

async function loadCheckingsAndReservations() {
  try {
    const response = await API.Reservation.getAllReservations();
    const reservations = response.data;
    const today = new Date().toISOString().split("T")[0];

    // Today's check-ins
    const todayCheckIns = reservations.filter(
      (res) => res.check_in_date === today && (res.status === "CONFIRMED" || res.status === "PENDING")
    );
    displayTodayCheckIns(todayCheckIns);

    // Today's check-outs
    const todayCheckOuts = reservations.filter(
      (res) => res.check_out_date === today && res.status === "CHECKED_IN"
    );
    displayTodayCheckOuts(todayCheckOuts);

    // Current reservations (checked-in)
    const currentReservations = reservations.filter(
      (res) => res.status === "CHECKED_IN"
    );
    displayCurrentReservations(currentReservations);
  } catch (error) {
    console.error("Error loading reservations data:", error);
  }
}

async function loadTodayCheckIns() {
  try {
    const response = await API.Dashboard.getTodayCheckIns();
    displayTodayCheckIns(response.data);
  } catch (error) {
    console.error("Error loading today's check-ins:", error);
    showMessage("error", "Failed to load check-ins");
  }
}

async function loadTodayCheckOuts() {
  try {
    const response = await API.Dashboard.getTodayCheckOuts();
    displayTodayCheckOuts(response.data);
  } catch (error) {
    console.error("Error loading today's check-outs:", error);
    showMessage("error", "Failed to load check-outs");
  }
}

async function loadCurrentReservations() {
  try {
    const reservations = await API.Reservation.getAllReservations();
    const currentReservations = reservations.data.filter(
      (reservation) => reservation.status === "CHECKED_IN"
    );

    displayCurrentReservations(currentReservations);
  } catch (error) {
    console.error("Error loading current reservations:", error);
    showMessage("error", "Failed to load current reservations");
  }
}

async function loadAvailableRooms() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const rooms = await API.Room.getAllRooms();
    const availableRooms = rooms.data.filter(
      (room) => room.status === "AVAILABLE"
    );

    displayAvailableRooms(availableRooms);
  } catch (error) {
    console.error("Error loading available rooms:", error);
    showMessage("error", "Failed to load available rooms");
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

function displayTodayCheckIns(checkIns) {
  const container = document.getElementById("todayCheckIns");
  if (!container) return;

  if (!checkIns || checkIns.length === 0) {
    container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-user-clock"></i>
                <p>No check-ins today</p>
            </div>
        `;
    return;
  }

  const html = checkIns
    .map(
      (reservation) => `
        <div class="checkin-card">
            <div class="checkin-header">
                <h5>${reservation.full_name || "Guest"}</h5>
                <span class="badge bg-${reservation.status === "CONFIRMED" ? "success" : "warning"
        }">
                    ${reservation.status}
                </span>
            </div>
            <div class="checkin-details">
                <p><i class="fas fa-bed"></i> Room ${reservation.room_number
        }</p>
                <p><i class="fas fa-clock"></i> Check-in: Today</p>
            </div>
            <div class="checkin-actions">
                ${reservation.status === "CONFIRMED"
          ? `
                    <button class="btn btn-sm btn-success" onclick="processCheckIn(${reservation.reservation_id})">
                        <i class="fas fa-sign-in-alt"></i> Check In
                    </button>
                `
          : `
                    <button class="btn btn-sm btn-primary" onclick="confirmReservation(${reservation.reservation_id})">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                `
        }
                <button class="btn btn-sm" onclick="viewGuestDetails(${reservation.user_id
        })">
                    <i class="fas fa-user"></i> Guest
                </button>
            </div>
        </div>
    `
    )
    .join("");

  container.innerHTML = html;
}

function displayTodayCheckOuts(checkOuts) {
  const container = document.getElementById("todayCheckOuts");
  if (!container) return;

  if (!checkOuts || checkOuts.length === 0) {
    container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-user-check"></i>
                <p>No check-outs today</p>
            </div>
        `;
    return;
  }

  const html = checkOuts
    .map(
      (reservation) => `
        <div class="checkout-card">
            <div class="checkout-header">
                <h5>${reservation.full_name || "Guest"}</h5>
                <span class="badge bg-info">Checked In</span>
            </div>
            <div class="checkout-details">
                <p><i class="fas fa-bed"></i> Room ${reservation.room_number
        }</p>
                <p><i class="fas fa-clock"></i> Check-out: Today</p>
            </div>
            <div class="checkout-actions">
                <button class="btn btn-sm btn-warning" onclick="processCheckOut(${reservation.reservation_id
        })">
                    <i class="fas fa-sign-out-alt"></i> Check Out
                </button>
                <button class="btn btn-sm" onclick="viewGuestDetails(${reservation.user_id
        })">
                    <i class="fas fa-user"></i> Guest
                </button>
            </div>
        </div>
    `
    )
    .join("");

  container.innerHTML = html;
}

function displayCurrentReservations(reservations) {
  const container = document.getElementById("currentReservations");
  if (!container) return;

  if (!reservations || reservations.length === 0) {
    container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-bed"></i>
                <p>No current guests</p>
            </div>
        `;
    return;
  }

  const html = reservations
    .map(
      (reservation) => `
        <tr>
            <td>${reservation.full_name || "Guest"}</td>
            <td>${reservation.room_number}</td>
            <td>${reservation.room_type}</td>
            <td>${formatDate(reservation.check_in_date)}</td>
            <td>${formatDate(reservation.check_out_date)}</td>
            <td>$${reservation.total_price}</td>
            <td>
                <span class="badge bg-success">Checked In</span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewReservationDetails(${reservation.reservation_id
        })">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="processCheckOut(${reservation.reservation_id
        })">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
                <button class="btn btn-sm btn-info" onclick="addServiceToReservation(${reservation.reservation_id
        })">
                    <i class="fas fa-plus"></i>
                </button>
            </td>
        </tr>
    `
    )
    .join("");

  container.innerHTML = html;
}

function displayAvailableRooms(rooms) {
  const container = document.getElementById("availableRooms");
  if (!container) return;

  if (!rooms || rooms.length === 0) {
    container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-bed"></i>
                <p>No available rooms</p>
            </div>
        `;
    return;
  }

  const html = rooms
    .map(
      (room) => `
        <div class="room-card-sm">
            <div class="room-header">
                <h6>Room ${room.room_number}</h6>
                <span class="badge bg-success">Available</span>
            </div>
            <div class="room-details">
                <p><i class="fas fa-home"></i> ${room.room_type}</p>
                <p><i class="fas fa-dollar-sign"></i> $${room.price_per_night}/night</p>
                <p><i class="fas fa-users"></i> ${room.capacity} guests</p>
            </div>
            <div class="room-actions">
                <button class="btn btn-sm btn-primary" onclick="bookRoomForGuest(${room.room_id})">
                    <i class="fas fa-book"></i> Book
                </button>
                <button class="btn btn-sm" onclick="viewRoomDetails(${room.room_id})">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");

  container.innerHTML = html;
}

function displayDashboardStats(stats) {
  const container = document.getElementById("dashboardStats");
  if (!container) return;

  container.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon primary">
                <i class="fas fa-users"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.totalGuests || 0}</h3>
                <p>Current Guests</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon success">
                <i class="fas fa-bed"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.availableRooms || 0}</h3>
                <p>Available Rooms</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon warning">
                <i class="fas fa-calendar-day"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.todayCheckIns || 0}</h3>
                <p>Today's Check-ins</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon danger">
                <i class="fas fa-calendar-check"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.todayCheckOuts || 0}</h3>
                <p>Today's Check-outs</p>
            </div>
        </div>
    `;
}

async function loadRecentActivity() {
  try {
    const response = await API.Reservation.getAllReservations();
    if (response.success) {
      // Sort by latest created/updated
      const sorted = response.data.sort((a, b) => {
        const dateA = new Date(a.created_at || a.check_in_date);
        const dateB = new Date(b.created_at || b.check_in_date);
        return dateB - dateA;
      });
      // Get top 5 recent activities
      displayRecentActivity(sorted.slice(0, 5));
    }
  } catch (error) {
    console.error("Error loading recent activity:", error);
  }
}

function displayRecentActivity(reservations) {
  const container = document.getElementById("recentActivity");
  if (!container) return;

  if (!reservations || reservations.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="fas fa-history fa-2x mb-3"></i>
        <p>No recent activity found</p>
      </div>
    `;
    return;
  }

  const html = reservations
    .map((reservation) => {
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

function setupReceptionEventListeners() {
  // Quick search
  const quickSearch = document.getElementById("quickSearch");
  if (quickSearch) {
    quickSearch.addEventListener("input", handleQuickSearch);
  }

  // New booking form
  const newBookingForm = document.getElementById("newBookingForm");
  if (newBookingForm) {
    newBookingForm.addEventListener("submit", handleNewBooking);
  }

  // Search guest form
  const searchGuestForm = document.getElementById("searchGuestForm");
  if (searchGuestForm) {
    searchGuestForm.addEventListener("submit", handleSearchGuest);
  }

  // Check-in date change
  const checkInDate = document.getElementById("newCheckIn");
  const checkOutDate = document.getElementById("newCheckOut");
  if (checkInDate && checkOutDate) {
    checkInDate.addEventListener("change", updateRoomAvailability);
    checkOutDate.addEventListener("change", updateRoomAvailability);
  }

  // Check-in form
  const checkinForm = document.getElementById("checkinForm");
  if (checkinForm) {
    checkinForm.addEventListener("submit", handleProcessCheckIn);
  }

  // Check-out form
  const checkoutForm = document.getElementById("checkoutForm");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", handleProcessCheckOut);
  }

  // Create reservation button
  const createReservationBtn = document.getElementById("createReservationBtn");
  if (createReservationBtn) {
    createReservationBtn.addEventListener("click", () => {
      document.querySelector('a[data-section="dashboard"]')?.click();
      window.scrollTo(0, 0);
      showMessage("info", "Use the New Booking button at the top or Quick Booking on the dashboard.");
    });
  }

  // Quick booking button
  const newBookingBtn = document.getElementById("newBookingBtn");
  if (newBookingBtn) {
    newBookingBtn.addEventListener("click", () => {
      // Open the new booking modal
      API.User.getAllUsers().then(users => {
        const guests = (users.data.users || users.data).filter(u => u.user_role === 'CLIENT');
        showBookRoomModal(null, guests);
      });
    });
  }


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
      document.getElementById(targetId)?.classList.add("active");

      // Load section specific data
      switch (targetId) {
        case "dashboard":
          loadDashboardData();
          break;
        case "reservations":
          loadAllGlobalReservations();
          break;
        case "guests":
          loadAllGuests();
          break;
        case "rooms":
          loadRoomsGrid();
          break;
        case "services":
          loadServicesList();
          break;
      }
    });
  });
}

function initializeDatePickers() {
  // Set minimum dates for check-in/out
  const today = new Date().toISOString().split("T")[0];
  const checkInInputs = document.querySelectorAll('input[type="date"]');

  checkInInputs.forEach((input) => {
    if (input.id.includes("CheckIn") || !input.id) {
      input.min = today;
    }
  });
}

async function handleQuickSearch(e) {
  const searchTerm = e.target.value.trim();

  if (searchTerm.length < 2) {
    return;
  }

  showLoading();

  try {
    // Search across multiple endpoints
    const [reservations, users] = await Promise.all([
      API.Reservation.getAllReservations(),
      API.User.getAllUsers(),
    ]);

    // Filter results
    const searchResults = {
      reservations: reservations.data.filter(
        (r) =>
          r.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.room_number?.includes(searchTerm) ||
          r.reservation_id?.toString().includes(searchTerm)
      ),
      users: users.data.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.username?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    };

    displaySearchResults(searchResults);
  } catch (error) {
    console.error("Error searching:", error);
    showMessage("error", "Search failed");
  } finally {
    hideLoading();
  }
}

function displaySearchResults(results) {
  // Create or get search results dropdown
  let dropdown = document.getElementById("searchResultsDropdown");
  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.id = "searchResultsDropdown";
    dropdown.className = "search-results-dropdown";
    dropdown.style.cssText = `
      position: absolute; top: 100%; left: 0; right: 0; z-index: 1050;
      background: var(--bg-primary, #fff); border: 1px solid var(--border-color, #ddd);
      border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      max-height: 400px; overflow-y: auto; margin-top: 4px;
    `;
    const searchBox = document.querySelector(".search-box");
    if (searchBox) {
      searchBox.style.position = "relative";
      searchBox.appendChild(dropdown);
    }
  }

  const { reservations, users } = results;
  if ((!reservations || reservations.length === 0) && (!users || users.length === 0)) {
    dropdown.innerHTML = '<div style="padding: 16px; text-align: center; color: #888;"><i class="fas fa-search"></i> No results found</div>';
    dropdown.style.display = "block";
    return;
  }

  let html = '';
  if (reservations && reservations.length > 0) {
    html += '<div style="padding: 8px 16px; font-weight: 600; color: var(--text-secondary, #666); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Reservations</div>';
    reservations.forEach(r => {
      const statusColor = { PENDING: '#f0ad4e', CONFIRMED: '#5cb85c', CHECKED_IN: '#0275d8', CHECKED_OUT: '#6c757d', CANCELLED: '#d9534f' };
      html += `
        <div style="padding: 10px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.2s;"
             onmouseover="this.style.background='rgba(99,102,241,0.08)'" onmouseout="this.style.background='transparent'"
             onclick="viewReservationDetails(${r.reservation_id}); document.getElementById('searchResultsDropdown').style.display='none';">
          <div>
            <div style="font-weight: 500;">${r.full_name || 'Guest'}</div>
            <div style="font-size: 0.8rem; color: #888;">Room ${r.room_number || 'N/A'} · #${r.reservation_id}</div>
          </div>
          <span style="padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; color: #fff; background: ${statusColor[r.status] || '#888'};">${r.status}</span>
        </div>
      `;
    });
  }
  if (users && users.length > 0) {
    html += '<div style="padding: 8px 16px; font-weight: 600; color: var(--text-secondary, #666); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Guests</div>';
    users.forEach(u => {
      html += `
        <div style="padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.2s;"
             onmouseover="this.style.background='rgba(99,102,241,0.08)'" onmouseout="this.style.background='transparent'"
             onclick="viewGuestDetails(${u.user_id}); document.getElementById('searchResultsDropdown').style.display='none';">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem;">
            ${(u.full_name || u.username || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-weight: 500;">${u.full_name || u.username}</div>
            <div style="font-size: 0.8rem; color: #888;">${u.email || ''}</div>
          </div>
        </div>
      `;
    });
  }
  dropdown.innerHTML = html;
  dropdown.style.display = "block";

  // Close dropdown on click outside
  document.addEventListener("click", function closeDropdown(e) {
    if (!e.target.closest(".search-box")) {
      dropdown.style.display = "none";
      document.removeEventListener("click", closeDropdown);
    }
  });
}

async function handleNewBooking(e) {
  e.preventDefault();

  const guestId = document.getElementById("guestSelect").value;
  const roomId = document.getElementById("roomSelect").value;
  const checkIn = document.getElementById("newCheckIn").value;
  const checkOut = document.getElementById("newCheckOut").value;
  const guests = document.getElementById("newGuests").value;
  const specialRequests = document.getElementById("newSpecialRequests").value;

  if (!guestId || !roomId || !checkIn || !checkOut || !guests) {
    showMessage("error", "Please fill in all required fields");
    return;
  }

  showLoading();

  try {
    // Get room price
    const room = await API.Room.getRoomById(roomId);
    const nights = calculateNights(checkIn, checkOut);
    const totalPrice = room.data.price_per_night * nights;

    const reservationData = {
      user_id: guestId,
      room_id: roomId,
      check_in_date: checkIn,
      check_out_date: checkOut,
      total_price: totalPrice,
      guests: guests,
      special_requests: specialRequests,
      status: "CONFIRMED",
    };

    const response = await API.Reservation.createReservation(reservationData);

    if (response.success) {
      showMessage("success", "Booking created successfully!");
      e.target.reset();

      const modalInstance = bootstrap.Modal.getInstance(document.getElementById("bookRoomModal"));
      if (modalInstance) {
        modalInstance.hide();
      }

      await loadDashboardData();
    } else {
      showMessage("error", response.message);
    }
  } catch (error) {
    console.error("Error creating booking:", error);
    showMessage("error", "Failed to create booking");
  } finally {
    hideLoading();
  }
}

async function handleProcessCheckIn(e) {
  e.preventDefault();
  const resId = document.getElementById("reservationId").value;
  if (!resId) {
    showMessage("error", "Please enter a reservation ID");
    return;
  }
  await processCheckIn(resId);
}

async function handleProcessCheckOut(e) {
  e.preventDefault();
  const resId = document.getElementById("checkoutReservationId").value;
  if (!resId) {
    showMessage("error", "Please enter a reservation ID");
    return;
  }
  await processCheckOut(resId);
}

async function handleSearchGuest(e) {
  e.preventDefault();

  const searchTerm = document.getElementById("guestSearch").value.trim();

  if (!searchTerm) {
    showMessage("error", "Please enter search term");
    return;
  }

  showLoading();

  try {
    const users = await API.User.getAllUsers();
    const filteredUsers = users.data.filter(
      (user) =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    displayGuestSearchResults(filteredUsers);
  } catch (error) {
    console.error("Error searching guests:", error);
    showMessage("error", "Search failed");
  } finally {
    hideLoading();
  }
}

async function updateRoomAvailability() {
  const checkIn = document.getElementById("newCheckIn").value;
  const checkOut = document.getElementById("newCheckOut").value;

  if (!checkIn || !checkOut) {
    return;
  }

  try {
    const rooms = await API.Room.getAvailableRooms(checkIn, checkOut);
    populateRoomSelect(rooms.data);
  } catch (error) {
    console.error("Error updating room availability:", error);
  }
}

async function loadAllGlobalReservations() {
  const tableBody = document.querySelector("#reservationsTable tbody");
  if (!tableBody) return;

  showLoading();
  try {
    const result = await API.Reservation.getAllReservations();
    if (result.success) {
      const reservations = result.data;
      if (reservations.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No reservations found.</td></tr>';
        return;
      }

      tableBody.innerHTML = reservations.map(res => `
        <tr>
          <td>#${res.reservation_id}</td>
          <td>${res.full_name || 'Guest #' + res.user_id}</td>
          <td>Room ${res.room_number} (${res.room_type})</td>
          <td>${formatDate(res.check_in_date)}</td>
          <td>${formatDate(res.check_out_date)}</td>
          <td><span class="badge bg-${getStatusColor(res.status)}">${res.status}</span></td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="viewReservationDetails(${res.reservation_id})">
              <i class="fas fa-eye"></i>
            </button>
            ${res.status === 'CONFIRMED' ? `
              <button class="btn btn-sm btn-success" onclick="processCheckIn(${res.reservation_id})">
                <i class="fas fa-sign-in-alt"></i>
              </button>
            ` : ''}
            ${res.status === 'CHECKED_IN' ? `
              <button class="btn btn-sm btn-warning" onclick="processCheckOut(${res.reservation_id})">
                <i class="fas fa-sign-out-alt"></i>
              </button>
            ` : ''}
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error("Error loading all reservations:", error);
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">Failed to load reservations.</td></tr>';
  } finally {
    hideLoading();
  }
}

async function loadAllGuests() {
  const tableBody = document.querySelector("#guestsTable tbody");
  if (!tableBody) return;

  showLoading();
  try {
    const result = await API.User.getAllUsers();
    if (result.success) {
      const allUsers = result.data.users || result.data || [];
      const users = Array.isArray(allUsers) ? allUsers.filter(u => u.user_role === 'CLIENT') : [];
      if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No guests found.</td></tr>';
        return;
      }

      tableBody.innerHTML = users.map(user => `
        <tr>
          <td>#${user.user_id}</td>
          <td>${user.full_name}</td>
          <td>${user.email}<br><small>${user.phone || 'No phone'}</small></td>
          <td>${user.current_room || 'None'}</td>
          <td>${user.last_checkin ? formatDate(user.last_checkin) : 'Never'}</td>
          <td>
            <button class="btn btn-sm btn-info" onclick="viewGuestDetails(${user.user_id})">
              <i class="fas fa-user-tag"></i>
            </button>
            <button class="btn btn-sm btn-success" onclick="createReservationForGuest(${user.user_id})">
              <i class="fas fa-plus"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error("Error loading guests:", error);
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Failed to load guests.</td></tr>';
  } finally {
    hideLoading();
  }
}

// Action functions
async function processCheckIn(reservationId) {
  showLoading();

  try {
    const response = await API.Reservation.checkIn(reservationId);

    if (response.success) {
      showMessage("success", "Guest checked in successfully!");
      await loadDashboardData();
    } else {
      showMessage("error", response.message);
    }
  } catch (error) {
    console.error("Error checking in:", error);
    showMessage("error", "Failed to check in");
  } finally {
    hideLoading();
  }
}

async function processCheckOut(reservationId) {
  showLoading();

  try {
    const response = await API.Reservation.checkOut(reservationId);

    if (response.success) {
      showMessage("success", "Guest checked out successfully!");
      await loadDashboardData();
    } else {
      showMessage("error", response.message);
    }
  } catch (error) {
    console.error("Error checking out:", error);
    showMessage("error", "Failed to check out");
  } finally {
    hideLoading();
  }
}

async function confirmReservation(reservationId) {
  showLoading();

  try {
    const response = await API.Reservation.updateReservation(reservationId, {
      status: "CONFIRMED",
    });

    if (response.success) {
      // Fetch reservation details to show a nice card
      API.Reservation.getReservationById(reservationId).then(res => {
        if (res.success) {
          BookingUI.showSuccess({
            title: "Reservation Confirmed",
            subtitle: "The guest's stay is now officially confirmed.",
            reservationId: reservationId,
            roomNumber: res.data.room_number,
            totalAmount: res.data.total_price,
            checkIn: formatDate(res.data.check_in_date),
            checkOut: formatDate(res.data.check_out_date),
            actionText: "Print Receipt",
            onAction: () => window.print()
          });
        } else {
          showMessage("success", "Reservation confirmed!");
        }
      });
      await loadDashboardData();
    } else {
      showMessage("error", response.message);
    }
  } catch (error) {
    console.error("Error confirming reservation:", error);
    showMessage("error", "Failed to confirm reservation");
  } finally {
    hideLoading();
  }
}

async function cancelReservation(reservationId) {
  BookingUI.showConfirm({
    title: "Cancel Reservation",
    message: "Are you sure you want to cancel this reservation?",
    confirmText: "Yes, Cancel It",
    onConfirm: async () => {
      showLoading();
      try {
        const response = await API.Reservation.cancel(reservationId);
        if (response.success) {
          showMessage("success", "Reservation cancelled successfully!");
          await loadDashboardData();

          // Close the modal
          const modal = bootstrap.Modal.getInstance(document.getElementById("reservationDetailsModal"));
          if (modal) {
            modal.hide();
          }
        } else {
          showMessage("error", response.message);
        }
      } catch (error) {
        console.error("Error cancelling reservation:", error);
        showMessage("error", "Failed to cancel reservation");
      } finally {
        hideLoading();
      }
    }
  });
}

async function viewGuestDetails(userId) {
  try {
    const user = await API.User.getUserById(userId);

    showGuestDetailsModal(user.data);
  } catch (error) {
    console.error("Error loading guest details:", error);
    showMessage("error", "Failed to load guest details");
  }
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

async function bookRoomForGuest(roomId) {
  // Load guests for selection
  try {
    const users = await API.User.getAllUsers();
    const guests = users.data.filter((user) => user.user_role === "CLIENT");

    showBookRoomModal(roomId, guests);
  } catch (error) {
    console.error("Error loading guests:", error);
    showMessage("error", "Failed to load guest list");
  }
}

async function viewRoomDetails(roomId) {
  try {
    const room = await API.Room.getRoomById(roomId);
    showRoomDetailsModal(room.data);
  } catch (error) {
    console.error("Error loading room details:", error);
    showMessage("error", "Failed to load room details");
  }
}

async function addServiceToReservation(reservationId) {
  try {
    const services = await API.Service.getAllServices();
    showAddServiceModal(reservationId, services.data);
  } catch (error) {
    console.error("Error loading services:", error);
    showMessage("error", "Failed to load services");
  }
}

function viewGuestReservations(userId) {
  const modal = bootstrap.Modal.getInstance(document.getElementById("guestDetailsModal"));
  if (modal) modal.hide();

  // Switch to reservations tab and perform search
  document.querySelector('a[data-section="reservations"]')?.click();
  const searchInput = document.getElementById("quickSearch");
  if (searchInput) {
    searchInput.value = userId; // In a full implementation, we'd trigger the search
    showMessage("info", "Please search for the guest's ID or name in the reservations tab.");
  }
}

function createReservationForGuest(userId) {
  const modal = bootstrap.Modal.getInstance(document.getElementById("guestDetailsModal"));
  if (modal) modal.hide();

  // Open the new booking modal with this guest selected
  // We first fetch available rooms (mock loading here)
  API.Room.getAllRooms().then(rooms => {
    showBookRoomModal(null, [{ user_id: userId, full_name: "Selected Guest", email: "User #" + userId }]);
  });
}

// Modal display functions
function showGuestDetailsModal(guest) {
  const modal = document.getElementById("guestDetailsModal");
  if (!modal) return;

  const modalBody = modal.querySelector(".modal-body");
  modalBody.innerHTML = `
        <div class="guest-details">
            <div class="guest-header">
                <h4>${guest.full_name}</h4>
                <span class="badge bg-info">${guest.user_role}</span>
            </div>
            <div class="guest-info">
                <p><strong>Email:</strong> ${guest.email}</p>
                <p><strong>Username:</strong> ${guest.username}</p>
                <p><strong>Phone:</strong> ${guest.phone || "N/A"}</p>
                <p><strong>Member Since:</strong> ${formatDate(
    guest.created_at
  )}</p>
            </div>
            <div class="guest-actions">
                <button class="btn btn-primary" onclick="viewGuestReservations(${guest.user_id
    })">
                    <i class="fas fa-calendar"></i> View Reservations
                </button>
                <button class="btn btn-success" onclick="createReservationForGuest(${guest.user_id
    })">
                    <i class="fas fa-plus"></i> New Booking
                </button>
            </div>
        </div>
    `;

  const bootstrapModal = new bootstrap.Modal(modal);
  bootstrapModal.show();
}

function showReservationDetailsModal(reservation) {
  const modal = document.getElementById("reservationDetailsModal");
  if (!modal) return;

  const modalBody = modal.querySelector(".modal-body");
  modalBody.innerHTML = `
        <div class="reservation-details-view">
            <h4>Reservation #${reservation.reservation_id}</h4>
            <div class="detail-section">
                <h5>Guest Information</h5>
                <p><strong>Name:</strong> ${reservation.full_name || "Guest"
    }</p>
                <p><strong>Email:</strong> ${reservation.email || "N/A"}</p>
                <p><strong>Phone:</strong> ${reservation.phone || "N/A"}</p>
            </div>
            <div class="detail-section">
                <h5>Room Information</h5>
                <p><strong>Room Number:</strong> ${reservation.room_number}</p>
                <p><strong>Room Type:</strong> ${reservation.room_type}</p>
                <p><strong>Price per Night:</strong> $${reservation.price_per_night
    }</p>
            </div>
            <div class="detail-section">
                <h5>Stay Details</h5>
                <p><strong>Check-in:</strong> ${formatDate(
      reservation.check_in_date
    )}</p>
                <p><strong>Check-out:</strong> ${formatDate(
      reservation.check_out_date
    )}</p>
                <p><strong>Total Nights:</strong> ${calculateNights(
      reservation.check_in_date,
      reservation.check_out_date
    )}</p>
                <p><strong>Total Price:</strong> $${reservation.total_price}</p>
                <p><strong>Guests:</strong> ${reservation.guests || 2}</p>
            </div>
            <div class="detail-section">
                <h5>Status</h5>
                <span class="badge bg-${getStatusColor(reservation.status)}">
                    ${reservation.status}
                </span>
                <p><strong>Booked on:</strong> ${formatDate(
      reservation.created_at
    )}</p>
            </div>
            ${reservation.special_requests
      ? `
                <div class="detail-section">
                    <h5>Special Requests</h5>
                    <p>${reservation.special_requests}</p>
                </div>
            `
      : ""
    }
            <div class="reservation-actions">
                ${reservation.status === "PENDING"
      ? `
                    <button class="btn btn-success" onclick="confirmReservation(${reservation.reservation_id})">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                `
      : ""
    }
                ${reservation.status === "CONFIRMED"
      ? `
                    <button class="btn btn-primary" onclick="processCheckIn(${reservation.reservation_id})">
                        <i class="fas fa-sign-in-alt"></i> Check In
                    </button>
                `
      : ""
    }
                ${reservation.status === "CHECKED_IN"
      ? `
                    <button class="btn btn-warning" onclick="processCheckOut(${reservation.reservation_id})">
                        <i class="fas fa-sign-out-alt"></i> Check Out
                    </button>
                `
      : ""
    }
                <button class="btn btn-info" onclick="addServiceToReservation(${reservation.reservation_id
    })">
                    <i class="fas fa-plus"></i> Add Service
                </button>
                <button class="btn btn-danger" onclick="cancelReservation(${reservation.reservation_id
    })">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;

  const bootstrapModal = new bootstrap.Modal(modal);
  bootstrapModal.show();
}

function showRoomDetailsModal(room) {
  const modal = document.getElementById("roomDetailsModal");
  if (!modal) return;

  const modalBody = modal.querySelector(".modal-body");
  modalBody.innerHTML = `
        <div class="room-details-view">
            <h4>Room ${room.room_number}</h4>
            <div class="room-info">
                <p><strong>Type:</strong> ${room.room_type}</p>
                <p><strong>Price:</strong> $${room.price_per_night}/night</p>
                <p><strong>Capacity:</strong> ${room.capacity} guests</p>
                <p><strong>Status:</strong> 
                    <span class="badge bg-${getRoomStatusColor(room.status)}">
                        ${room.status}
                    </span>
                </p>
            </div>
            <div class="room-amenities">
                <h5>Amenities</h5>
                <div class="amenities-list">
                    ${room.amenities
      ? room.amenities
        .split(",")
        .map(
          (amenity) => `
                        <span class="badge bg-light text-dark">
                            <i class="fas fa-check"></i> ${amenity.trim()}
                        </span>
                    `
        )
        .join("")
      : "No amenities listed"
    }
                </div>
            </div>
            ${room.description
      ? `
                <div class="room-description">
                    <h5>Description</h5>
                    <p>${room.description}</p>
                </div>
            `
      : ""
    }
            <div class="room-actions">
                <button class="btn btn-primary" onclick="bookRoomForGuest(${room.room_id
    })">
                    <i class="fas fa-book"></i> Book This Room
                </button>
                <button class="btn btn-secondary" onclick="updateRoomStatus(${room.room_id
    })">
                    <i class="fas fa-sync"></i> Update Status
                </button>
            </div>
        </div>
    `;

  const bootstrapModal = new bootstrap.Modal(modal);
  bootstrapModal.show();
}

function showBookRoomModal(roomId, guests) {
  const modal = document.getElementById("bookRoomModal");
  if (!modal) return;

  const guestSelect = modal.querySelector("#guestSelect");
  if (guestSelect) {
    guestSelect.innerHTML = '<option value="">Select a guest...</option>';
    guests.forEach((guest) => {
      const option = document.createElement("option");
      option.value = guest.user_id;
      option.textContent = `${guest.full_name} (${guest.email})`;
      guestSelect.appendChild(option);
    });
  }

  const roomInput = modal.querySelector("#roomSelect");
  if (roomId && roomInput) {
    // Load room details and set the room
    API.Room.getRoomById(roomId).then((room) => {
      roomInput.innerHTML = `
                  <option value="${room.data.room_id}">
                      Room ${room.data.room_number} - ${room.data.room_type} ($${room.data.price_per_night}/night)
                  </option>
              `;
    });
  } else if (roomInput) {
    // Fetch all available rooms
    API.Room.getAllRooms().then((rooms) => {
      const available = rooms.data.filter(r => r.status === 'AVAILABLE');
      roomInput.innerHTML = '<option value="">Select a room...</option>' +
        available.map(room => `
          <option value="${room.room_id}">
              Room ${room.room_number} - ${room.room_type} ($${room.price_per_night}/night)
          </option>
        `).join('');
    });
  }

  const bootstrapModal = new bootstrap.Modal(modal);
  bootstrapModal.show();
}

function showAddServiceModal(reservationId, services) {
  const modal = document.getElementById("addServiceModal");
  if (!modal) return;

  // Store reservation ID in modal
  modal.dataset.reservationId = reservationId;

  const servicesContainer = modal.querySelector("#servicesContainer");
  if (servicesContainer) {
    servicesContainer.innerHTML = services
      .map(
        (service) => `
            <div class="service-item">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${service.service_id
          }" id="service-${service.service_id}">
                    <label class="form-check-label" for="service-${service.service_id
          }">
                        <strong>${service.service_name}</strong>
                        <p class="mb-0">${service.description || ""}</p>
                        <small class="text-muted">Price: $${service.price
          }</small>
                    </label>
                </div>
                <div class="service-quantity">
                    <input type="number" min="1" value="1" class="form-control form-control-sm" 
                           style="width: 80px;" data-service-id="${service.service_id
          }">
                </div>
            </div>
        `
      )
      .join("");
  }

  const bootstrapModal = new bootstrap.Modal(modal);
  bootstrapModal.show();
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function calculateNights(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const difference = end.getTime() - start.getTime();
  return Math.ceil(difference / (1000 * 3600 * 24));
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
    case "CONFIRMED":
      return "success";
    case "OCCUPIED":
    case "CHECKED_IN":
      return "primary";
    case "PENDING":
      return "warning";
    case "CANCELLED":
    case "CHECKED_OUT":
      return "danger";
    default:
      return "secondary";
  }
}

function handleExport() {
  const activeSection = document.querySelector('.dashboard-section.active');
  const sectionId = activeSection ? activeSection.id : 'dashboard';

  showMessage("info", `Exporting ${sectionId} data...`);

  // In a real app, this would generate a CSV/PDF
  // For now, we'll just simulate a download
  setTimeout(() => {
    const data = "Simulation of exported data for " + sectionId;
    const blob = new Blob([data], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sectionId}_export_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    showMessage("success", "Export completed successfully!");
  }, 1500);
}

function showMessage(type, text) {
  // Remove any existing messages
  const existingMessage = document.querySelector(".alert");
  if (existingMessage) {
    existingMessage.remove();
  }

  // Create new message
  const messageDiv = document.createElement("div");
  messageDiv.className = `alert alert-${type} fixed-top mt-5 mx-3`;
  messageDiv.style.cssText =
    "z-index: 9999; position: fixed; top: 80px; right: 20px; max-width: 300px;";
  messageDiv.innerHTML = `
        <button type="button" class="close" onclick="this.parentElement.remove()">&times;</button>
        ${text}
    `;

  document.body.appendChild(messageDiv);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (messageDiv.parentElement) {
      messageDiv.remove();
    }
  }, 5000);
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

async function loadRoomsGrid() {
  const container = document.getElementById("roomsGrid");
  if (!container) return;

  showLoading();
  try {
    const result = await API.Room.getAllRooms();
    if (result.success) {
      const rooms = result.data;
      if (rooms.length === 0) {
        container.innerHTML = '<div class="text-center py-4">No rooms found.</div>';
        return;
      }

      // Status summary bar
      const available = rooms.filter(r => r.status === 'AVAILABLE').length;
      const occupied = rooms.filter(r => r.status === 'OCCUPIED').length;
      const maintenance = rooms.filter(r => r.status === 'MAINTENANCE').length;

      let html = `
        <div class="rooms-summary-bar" style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
          <button class="btn btn-sm room-filter-btn active" data-filter="all" onclick="filterRooms('all', this)" style="border-radius: 20px; padding: 6px 18px; font-weight: 600; border: 2px solid #6366f1; background: #6366f1; color: #fff; transition: all 0.3s;">
            All Rooms <span class="badge bg-light text-dark ms-1">${rooms.length}</span>
          </button>
          <button class="btn btn-sm room-filter-btn" data-filter="AVAILABLE" onclick="filterRooms('AVAILABLE', this)" style="border-radius: 20px; padding: 6px 18px; font-weight: 600; border: 2px solid #22c55e; background: transparent; color: #22c55e; transition: all 0.3s;">
            <i class="fas fa-check-circle me-1"></i> Available <span class="badge bg-success ms-1">${available}</span>
          </button>
          <button class="btn btn-sm room-filter-btn" data-filter="OCCUPIED" onclick="filterRooms('OCCUPIED', this)" style="border-radius: 20px; padding: 6px 18px; font-weight: 600; border: 2px solid #ef4444; background: transparent; color: #ef4444; transition: all 0.3s;">
            <i class="fas fa-user me-1"></i> Occupied <span class="badge bg-danger ms-1">${occupied}</span>
          </button>
          <button class="btn btn-sm room-filter-btn" data-filter="MAINTENANCE" onclick="filterRooms('MAINTENANCE', this)" style="border-radius: 20px; padding: 6px 18px; font-weight: 600; border: 2px solid #f59e0b; background: transparent; color: #f59e0b; transition: all 0.3s;">
            <i class="fas fa-tools me-1"></i> Maintenance <span class="badge bg-warning text-dark ms-1">${maintenance}</span>
          </button>
        </div>
        <div class="rooms-card-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;">
      `;

      const statusStyles = {
        AVAILABLE: { bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '#22c55e', icon: 'fa-check-circle', color: '#16a34a', dotColor: '#22c55e' },
        OCCUPIED: { bg: 'linear-gradient(135deg, #fef2f2, #fecaca)', border: '#ef4444', icon: 'fa-user', color: '#dc2626', dotColor: '#ef4444' },
        MAINTENANCE: { bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '#f59e0b', icon: 'fa-tools', color: '#d97706', dotColor: '#f59e0b' },
      };

      rooms.forEach(room => {
        const s = statusStyles[room.status] || statusStyles.AVAILABLE;
        html += `
          <div class="room-grid-card" data-status="${room.status}" style="
            background: ${s.bg}; border: 2px solid ${s.border}; border-radius: 16px;
            padding: 20px; transition: all 0.3s ease; cursor: pointer; position: relative; overflow: hidden;
          " onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.12)';" 
             onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-size: 1.3rem; font-weight: 700; color: ${s.color};">#${room.room_number}</span>
              <span style="width: 12px; height: 12px; border-radius: 50%; background: ${s.dotColor}; box-shadow: 0 0 8px ${s.dotColor}80; animation: ${room.status === 'OCCUPIED' ? 'pulse 2s infinite' : 'none'};"></span>
            </div>
            <div style="font-size: 0.85rem; color: #555; margin-bottom: 4px;"><i class="fas fa-home me-1"></i> ${room.room_type}</div>
            <div style="font-size: 0.85rem; color: #555; margin-bottom: 4px;"><i class="fas fa-users me-1"></i> ${room.capacity} guests</div>
            <div style="font-size: 0.85rem; color: #555; margin-bottom: 12px;"><i class="fas fa-dollar-sign me-1"></i> $${room.price_per_night}/night</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px;">
              <i class="fas ${s.icon}" style="color: ${s.color};"></i>
              <span style="font-weight: 600; color: ${s.color}; font-size: 0.85rem;">${room.status}</span>
            </div>
            <div style="display: flex; gap: 6px;">
              <select class="form-select form-select-sm" style="border-radius: 8px; font-size: 0.8rem; flex: 1;" 
                onchange="updateRoomStatus(${room.room_id}, this.value)">
                <option value="" selected disabled>Change status…</option>
                <option value="AVAILABLE" ${room.status === 'AVAILABLE' ? 'disabled' : ''}>Available</option>
                <option value="OCCUPIED" ${room.status === 'OCCUPIED' ? 'disabled' : ''}>Occupied</option>
                <option value="MAINTENANCE" ${room.status === 'MAINTENANCE' ? 'disabled' : ''}>Maintenance</option>
              </select>
              <button class="btn btn-sm btn-outline-primary" style="border-radius: 8px;" onclick="viewRoomDetails(${room.room_id})"><i class="fas fa-info-circle"></i></button>
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    }
  } catch (error) {
    console.error("Error loading rooms grid:", error);
    container.innerHTML = '<div class="text-center py-4 text-danger">Failed to load rooms.</div>';
  } finally {
    hideLoading();
  }
}

function filterRooms(status, btn) {
  const cards = document.querySelectorAll('.room-grid-card');
  cards.forEach(card => {
    if (status === 'all' || card.dataset.status === status) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
  // Update active button
  document.querySelectorAll('.room-filter-btn').forEach(b => {
    b.style.background = 'transparent';
    b.style.color = b.style.borderColor;
    b.classList.remove('active');
  });
  btn.classList.add('active');
  btn.style.background = btn.style.borderColor;
  btn.style.color = '#fff';
}

async function loadServicesList() {
  const container = document.getElementById("servicesList");
  if (!container) return;

  showLoading();
  try {
    const [servicesResult, activeRequestsResult] = await Promise.all([
      API.Service.getAllServices(),
      API.Service.getReservationServices() // get all active ones
    ]);

    if (servicesResult.success) {
      const services = servicesResult.data;
      let html = '<h4>Active Service Requests</h4><div class="active-requests mb-4">';

      if (activeRequestsResult.success && activeRequestsResult.data.length > 0) {
        html += '<div class="list-group">';
        activeRequestsResult.data.forEach(req => {
          const statusColors = { 'PENDING': 'warning', 'COMPLETED': 'success', 'CANCELLED': 'danger' };
          const badgeClass = statusColors[req.status] || 'secondary';
          const timeStr = new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const roomStr = req.room_number ? `Rm ${req.room_number}` : `Res #${req.reservation_id}`;

          html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <h6 class="mb-0">${req.service_name} (x${req.quantity}) - $${(req.price_at_time * req.quantity).toFixed(2)}</h6>
                <small class="text-muted">${roomStr} • Requested at ${timeStr}</small>
              </div>
              <div>
                <span class="badge bg-${badgeClass} rounded-pill me-2">${req.status}</span>
                ${req.status === 'PENDING' ? `
                  <button class="btn btn-sm btn-outline-success" onclick="updateServiceStatus(${req.booking_service_id}, 'COMPLETED')" title="Approve & Complete">
                    <i class="fas fa-check"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="updateServiceStatus(${req.booking_service_id}, 'CANCELLED')" title="Reject">
                    <i class="fas fa-times"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        });
        html += '</div>';
      } else {
        html += '<p class="text-muted">No active service requests.</p>';
      }
      html += '</div>';

      html += '<h4>Available Services</h4><div class="row g-3">';
      html += services.map(service => `
        <div class="col-md-4">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h6 class="card-title">${service.service_name}</h6>
              <p class="card-text small text-muted">${service.description || 'No description'}</p>
              <div class="d-flex justify-content-between align-items-center">
                <span class="fw-bold text-primary">$${service.price}</span>
                <button class="btn btn-sm btn-primary" onclick="showOrderServiceModal(${service.service_id}, '${service.service_name}')">
                  Order
                </button>
              </div>
            </div>
          </div>
        </div>
      `).join('');
      html += '</div>';

      container.innerHTML = html;
    }
  } catch (error) {
    console.error("Error loading services list:", error);
    container.innerHTML = '<div class="text-center py-4 text-danger">Failed to load services.</div>';
  } finally {
    hideLoading();
  }
}

function showOrderServiceModal(serviceId, serviceName) {
  API.Reservation.getAllReservations().then(res => {
    const active = res.data.filter(r => r.status === 'CHECKED_IN');
    if (active.length === 0) {
      showMessage("warning", "No currently checked-in guests to order for.");
      return;
    }

    API.Service.getAllServices().then(services => {
      const service = services.data.filter(s => s.service_id === serviceId);

      // Let's create a better prompt for selecting multiple reservations
      let promptMsg = "Enter Reservation ID to order for:\n\n";
      active.forEach(a => {
        promptMsg += `#${a.reservation_id} - ${a.full_name || 'Guest'} (Room ${a.room_number})\n`;
      });

      const resId = prompt(promptMsg);
      if (resId && active.find(a => a.reservation_id == resId)) {
        showAddServiceModal(resId, service);
      } else if (resId) {
        showMessage("error", "Invalid Reservation ID or guest is not CHECKED_IN.");
      }
    });
  });
}

async function updateRoomStatus(roomId, newStatus) {
  if (!roomId || !newStatus) return;
  showLoading();
  try {
    const response = await API.Room.updateRoom(roomId, { status: newStatus });
    if (response.success) {
      showMessage("success", `Room status updated to ${newStatus}.`);
      loadRoomsGrid();
      loadAvailableRooms();
      loadDashboardStats();
    } else {
      showMessage("error", response.message || "Failed to update room status.");
    }
  } catch (error) {
    console.error("Error updating room status:", error);
    showMessage("error", "An error occurred while updating room status.");
  } finally {
    hideLoading();
  }
}

async function updateServiceStatus(bookingServiceId, status) {
  try {
    const response = await HotelAPI.request(`booking_services.php?id=${bookingServiceId}`, 'PUT', { status });
    if (response.success) {
      showMessage("success", "Service updated successfully.");
      loadServicesList();
    } else {
      showMessage("error", "Failed to update service status.");
    }
  } catch (err) {
    console.error(err);
    showMessage("error", "An error occurred while updating the service.");
  }
}

async function submitAddServices() {
  const modal = document.getElementById("addServiceModal");
  const reservationId = modal.dataset.reservationId;
  if (!reservationId) {
    showMessage("error", "No reservation selected.");
    return;
  }

  const container = document.getElementById("servicesContainer");
  const checkboxes = container.querySelectorAll(".form-check-input:checked");

  if (checkboxes.length === 0) {
    showMessage("warning", "Please select at least one service to add.");
    return;
  }

  const services = [];
  checkboxes.forEach(cb => {
    const serviceId = cb.value;
    const qtyInput = container.querySelector(`input[data-service-id="${serviceId}"]`);
    const quantity = qtyInput ? parseInt(qtyInput.value) : 1;

    // Get the price dynamically from the label or text
    const label = container.querySelector(`label[for="service-${serviceId}"]`);
    const priceText = label.querySelector("small").textContent;
    const price = parseFloat(priceText.replace('Price: $', ''));

    services.push({
      service_id: serviceId,
      quantity: quantity,
      price: price
    });
  });

  showLoading();
  try {
    const response = await API.Service.addServicesToReservation(reservationId, services);
    if (response.success) {
      showMessage("success", "Services successfully added to the reservation.");
      bootstrap.Modal.getInstance(modal).hide();

      // Refresh views
      loadServicesList();
      loadAllGlobalReservations(); // Optional refresh
    } else {
      showMessage("error", response.message || "Failed to add services.");
    }
  } catch (error) {
    console.error(error);
    showMessage("error", "An error occurred.");
  } finally {
    hideLoading();
  }
}

// Expose functions to global scope
window.processCheckIn = processCheckIn;
window.processCheckOut = processCheckOut;
window.confirmReservation = confirmReservation;
window.cancelReservation = cancelReservation;
window.viewGuestDetails = viewGuestDetails;
window.viewReservationDetails = viewReservationDetails;
window.bookRoomForGuest = bookRoomForGuest;
window.viewRoomDetails = viewRoomDetails;
window.addServiceToReservation = addServiceToReservation;
window.showOrderServiceModal = showOrderServiceModal;
window.viewGuestReservations = viewGuestReservations;
window.createReservationForGuest = createReservationForGuest;
window.updateRoomStatus = updateRoomStatus;
window.filterRooms = filterRooms;
window.updateServiceStatus = updateServiceStatus;
window.submitAddServices = submitAddServices;
