// client-dashboard.js - Fixed version
document.addEventListener("DOMContentLoaded", function () {
  console.log("Client dashboard loaded");

  // Check authentication
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) {
    window.location.href = "login.php";
    return;
  }

  // Initialize dashboard
  initDashboard();
  updateUserInfo();

  // Setup event listeners
  setupEventListeners();

  // Load initial data
  loadUserData();
  loadDashboardStats();
  loadRecentReservations();
  loadClientServices();

  // Check for payment status in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('payment')) {
    const status = urlParams.get('payment');
    if (status === 'success') {
      showMessage('success', 'Payment processed successfully! Your reservation is now confirmed.');
      // Remove parameter from URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'failed') {
      showMessage('error', 'Payment failed or was cancelled. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
});


function updateUserInfo() {
  const user = JSON.parse(localStorage.getItem("user"));
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
  if (roleElement) {
    roleElement.textContent = userRole.charAt(0) + userRole.slice(1).toLowerCase() + " Member";
  }
}

function initDashboard() {
  console.log("Initializing dashboard");

  // Set current date
  const currentDate = document.getElementById("currentDate");
  if (currentDate) {
    const now = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    currentDate.textContent = now.toLocaleDateString("en-US", options);
  }

  // Setup sidebar navigation
  const menuItems = document.querySelectorAll(".sidebar-menu a[data-section]");
  menuItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();

      // Remove active class from all items
      menuItems.forEach((i) => {
        i.classList.remove("active");
        const sectionId = i.getAttribute("data-section");
        const section = document.getElementById(sectionId);
        if (section) {
          section.classList.remove("active");
        }
      });

      // Add active class to clicked item
      this.classList.add("active");
      const sectionId = this.getAttribute("data-section");
      const section = document.getElementById(sectionId);
      if (section) {
        section.classList.add("active");
      }
    });
  });

  // Set minimum date for booking forms
  const today = new Date().toISOString().split("T")[0];
  const checkInInput = document.getElementById("checkInDate");
  const checkOutInput = document.getElementById("checkOutDate");

  if (checkInInput) {
    checkInInput.min = today;
    checkInInput.addEventListener("change", function () {
      if (checkOutInput) {
        checkOutInput.min = this.value;
        if (checkOutInput.value && checkOutInput.value < this.value) {
          checkOutInput.value = this.value;
        }
      }
    });
  }

  if (checkOutInput) {
    checkOutInput.min = today;
  }
}

function setupEventListeners() {
  console.log("Setting up event listeners");

  // Quick Book button
  const quickBookBtn = document.getElementById("quickBookBtn");
  if (quickBookBtn) {
    quickBookBtn.addEventListener("click", showBookRoomModal);
  }

  // Booking form
  const bookingForm = document.getElementById("bookingForm");
  if (bookingForm) {
    bookingForm.addEventListener("submit", handleBookingForm);
  }

  // Profile form
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", handleProfileUpdate);
  }


  // Initial load for all reservations tab if it's the active section
  const resLink = document.querySelector('a[data-section="reservations"]');
  if (resLink) {
    resLink.addEventListener('click', () => {
      setTimeout(loadAllReservations, 100);
    });
  }
}

function loadUserData() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  console.log("Loading user data:", user);

  // Update welcome message
  const welcomeMessage = document.getElementById("welcomeMessage");
  if (welcomeMessage) {
    welcomeMessage.textContent = `Welcome back, ${user.name || user.username}!`;
  }

  // Update user info in sidebar
  const userInfo = document.getElementById("userInfo");
  if (userInfo) {
    const h3 = userInfo.querySelector("h3");
    const p = userInfo.querySelector("p");
    if (h3) h3.textContent = user.name || user.username;
    if (p) {
      switch (user.user_role) {
        case "CLIENT":
          p.textContent = "Client Account";
          break;
        case "RECEPTION":
          p.textContent = "Reception Staff";
          break;
        case "MANAGER":
          p.textContent = "Manager";
          break;
        default:
          p.textContent = user.user_role;
      }
    }
  }

  // Populate profile form
  populateProfileForm(user);
}

async function loadDashboardStats() {
  const userStats = document.getElementById("userStats");
  if (!userStats) return;

  try {
    const result = await HotelAPI.getDashboardStats();

    if (result.success) {
      const stats = result.data;
      const statsHTML = `
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(45deg, #3498db, #2980b9)">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="stat-content">
                    <h3>${stats.total_reservations || 0}</h3>
                    <p>Total Bookings</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(45deg, #2ecc71, #27ae60)">
                    <i class="fas fa-plane"></i>
                </div>
                <div class="stat-content">
                    <h3>${stats.upcoming_reservations || 0}</h3>
                    <p>Upcoming Trips</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(45deg, #e74c3c, #c0392b)">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="stat-content">
                    <h3>$${stats.total_spent || 0}</h3>
                    <p>Total Spent</p>
                </div>
            </div>
        `;
      userStats.innerHTML = statsHTML;
    }
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

async function loadRecentReservations() {
  const recentReservations = document.getElementById("recentReservations");
  if (!recentReservations) return;

  try {
    const result = await HotelAPI.getReservations({ limit: 5 });

    if (result.success) {
      const reservations = result.data;

      if (reservations.length === 0) {
        recentReservations.innerHTML =
          '<p class="text-muted">No recent reservations found.</p>';
        return;
      }

      let reservationsHTML = "";
      reservations.forEach((reservation) => {
        reservationsHTML += `
                <div class="reservation-item" style="padding: 1rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h6 style="margin: 0; color: var(--primary-color);">Reservation #${reservation.reservation_id
          }</h6>
                        <p style="margin: 0.2rem 0; font-size: 0.9rem; color: #666;">Room ${reservation.room_number
          } (${reservation.room_type})</p>
                        <p style="margin: 0; font-size: 0.85rem; color: #999;">
                            ${formatDate(reservation.check_in_date)} - ${formatDate(
            reservation.check_out_date
          )}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge ${getStatusClass(
            reservation.status
          )}" style="padding: 0.25rem 0.5rem; border-radius: 4px; color: white;">
                            ${reservation.status.toUpperCase()}
                        </span>
                        <p style="margin: 0.5rem 0 0; font-weight: bold; color: var(--primary-color);">
                            $${reservation.total_price}
                        </p>
                        ${reservation.status === 'PENDING' ? `
                            <button class="btn btn-sm btn-success mt-1" onclick="showPaymentModal(${reservation.reservation_id}, ${reservation.total_price})">
                                <i class="fas fa-credit-card"></i> Pay Now
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
      });

      recentReservations.innerHTML = reservationsHTML;
    }
  } catch (error) {
    console.error("Error loading reservations:", error);
    recentReservations.innerHTML = '<p class="text-error">Error loading reservations.</p>';
  }
}

function populateProfileForm(user) {
  const fullName = document.getElementById("fullName");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const username = document.getElementById("username");

  if (fullName) fullName.value = user.name || "";
  if (email) email.value = user.email || "";
  if (phone) phone.value = user.phone || "";
  if (username) username.value = user.username || "";
}

async function handleBookingForm(e) {
  e.preventDefault();
  console.log("Booking form submitted");

  const checkInDate = document.getElementById("checkInDate").value;
  const checkOutDate = document.getElementById("checkOutDate").value;
  const guests = document.getElementById("guests").value;
  const roomType = document.getElementById("roomType").value;

  // Validate dates
  if (!checkInDate || !checkOutDate) {
    showMessage("error", "Please select both check-in and check-out dates");
    return;
  }

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkIn < today) {
    showMessage("error", "Check-in date cannot be in the past");
    return;
  }

  if (checkIn >= checkOut) {
    showMessage("error", "Check-out date must be after check-in date");
    return;
  }

  // Calculate nights
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

  // Show loading
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Searching...";
  submitBtn.disabled = true;

  try {
    const params = {
      checkIn: checkInDate,
      checkOut: checkOutDate
    };
    if (roomType !== "all") params.type = roomType;

    const result = await HotelAPI.getRooms(params);

    if (result.success) {
      displayAvailableRooms(result.data, nights);
    } else {
      throw new Error(result.message || "Failed to search rooms");
    }
  } catch (error) {
    console.error("Error searching for rooms:", error);
    showMessage("error", "Error searching for rooms: " + error.message);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

function displayAvailableRooms(rooms, nights) {
  const availableRooms = document.getElementById("availableRooms");
  const roomsList = document.getElementById("roomsList");

  if (!availableRooms || !roomsList) return;

  if (rooms.length === 0) {
    roomsList.innerHTML =
      '<div class="text-center py-5"><i class="fas fa-search-minus fa-3x mb-3 text-muted"></i><h4>No rooms available</h4><p class="text-muted">Try changing your dates or room type preferences.</p></div>';
    availableRooms.style.display = "block";
    return;
  }

  let roomsHTML = '<div class="row g-4">';
  rooms.forEach((room) => {
    const totalPrice = room.price_per_night * nights;
    roomsHTML += `
            <div class="col-md-6 mb-4">
                <div class="room-card card h-100 shadow-sm border-0 transition-transform">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h5 class="card-title fw-bold mb-1">${room.room_type} Room</h5>
                                <p class="text-muted small mb-0"><i class="fas fa-door-open"></i> Room ${room.room_number}</p>
                            </div>
                            <span class="badge bg-gold text-dark">$${room.price_per_night}/night</span>
                        </div>
                        <p class="card-text text-muted">${room.description || 'Experience ultimate luxury and comfort in our meticulously designed rooms.'}</p>
                        <div class="amenities-list mb-4">
                            ${(room.amenities ? (typeof room.amenities === 'string' ? room.amenities.split(',') : room.amenities) : [])
        .map(amenity => `<span class="badge bg-light text-dark me-1 mb-1 shadow-sm"><i class="fas fa-check text-success small me-1"></i>${amenity.trim()}</span>`)
        .join('')}
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-auto">
                            <div>
                                <p class="mb-0 small text-muted">Total for ${nights} night(s)</p>
                                <h4 class="mb-0 fw-bold text-primary">$${totalPrice}</h4>
                            </div>
                            <button class="btn btn-primary" onclick="bookRoom(${room.room_id}, '${room.room_number}', '${room.room_type}', ${room.price_per_night}, ${nights})">
                                <i class="fas fa-bookmark me-2"></i>Book Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  });
  roomsHTML += '</div>';

  roomsList.innerHTML = roomsHTML;
  availableRooms.style.display = "block";

  // Scroll to available rooms section
  availableRooms.scrollIntoView({ behavior: "smooth" });
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  console.log("Profile update form submitted");

  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Validate password change
  if ((newPassword || confirmPassword) && !currentPassword) {
    showMessage("error", "Please enter current password to change password");
    return;
  }

  if (newPassword && newPassword !== confirmPassword) {
    showMessage("error", "New passwords do not match");
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Saving...";
  submitBtn.disabled = true;

  try {
    const userData = {
      full_name: fullName,
      email: email,
      phone: phone
    };

    if (newPassword) userData.password = newPassword;

    const result = await HotelAPI.updateUser('me', userData);

    if (result.success) {
      // Update local storage
      localStorage.setItem("user", JSON.stringify(result.data));
      // Update UI
      loadUserData();
      showMessage("success", "Profile updated successfully!");

      // Clear password fields
      if (document.getElementById("currentPassword")) document.getElementById("currentPassword").value = "";
      if (document.getElementById("newPassword")) document.getElementById("newPassword").value = "";
      if (document.getElementById("confirmPassword")) document.getElementById("confirmPassword").value = "";
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    showMessage("error", "Error updating profile: " + error.message);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

function handleLogout() {
  console.log("Logging out...");

  // Clear auth data
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("rememberMe");

  // Redirect to login page
  window.location.href = "login.php";
}

// Modal functions
function showBookRoomModal() {
  console.log("Show book room modal");
  // This would open a Bootstrap modal
  // For now, navigate to book-room section
  const bookRoomSection = document.getElementById("book-room");
  const bookRoomLink = document.querySelector('a[data-section="book-room"]');

  if (bookRoomSection && bookRoomLink) {
    // Remove active class from all
    document
      .querySelectorAll(".sidebar-menu a")
      .forEach((item) => item.classList.remove("active"));
    document
      .querySelectorAll(".dashboard-section")
      .forEach((section) => section.classList.remove("active"));

    // Add active class to book-room
    bookRoomLink.classList.add("active");
    bookRoomSection.classList.add("active");

    // Scroll to top
    window.scrollTo(0, 0);
  }
}

function viewAllReservations() {
  const reservationsLink = document.querySelector(
    'a[data-section="reservations"]'
  );
  if (reservationsLink) {
    reservationsLink.click();
  }
}

function editProfile() {
  const profileLink = document.querySelector('a[data-section="profile"]');
  if (profileLink) {
    profileLink.click();
  }
}

async function bookRoom(roomId, roomNumber, roomType, price, nights) {
  console.log(`Booking room ${roomId}: ${roomNumber} for ${nights} nights`);

  // Get booking details from form
  const checkInDate = document.getElementById("checkInDate").value;
  const checkOutDate = document.getElementById("checkOutDate").value;
  const guests = document.getElementById("guests").value;

  if (!checkInDate || !checkOutDate) {
    showMessage("error", "Please select check-in and check-out dates first");
    return;
  }

  // Calculate total amount
  const totalAmount = price * nights;

  // Confirm booking
  BookingUI.showConfirm({
    title: "Confirm Booking",
    message: `Do you want to book ${roomType} Room ${roomNumber} for ${nights} night(s) at $${totalAmount}?`,
    onConfirm: async () => {
      try {
        const reservationData = {
          room_id: roomId,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          guests: guests
        };

        const result = await HotelAPI.createReservation(reservationData);

        if (result.success) {
          BookingUI.showSuccess({
            title: "Room Reserved!",
            subtitle: "Your booking request is being processed by our team.",
            reservationId: result.data.reservation_id,
            roomNumber: roomNumber,
            totalAmount: totalAmount,
            checkIn: formatDate(checkInDate),
            checkOut: formatDate(checkOutDate),
            actionText: "View My Reservations",
            onAction: () => viewAllReservations()
          });

          // Reset form
          document.getElementById("bookingForm").reset();
          document.getElementById("availableRooms").style.display = "none";

          // Update dashboard stats
          loadDashboardStats();
          loadRecentReservations();
          loadAllReservations(); // Refresh full list
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error("Booking error:", error);
        showMessage("error", "Booking failed: " + error.message);
      }
    }
  });
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusClass(status) {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "bg-success";
    case "checked-in":
      return "bg-primary";
    case "checked-out":
      return "bg-secondary";
    case "cancelled":
      return "bg-danger";
    default:
      return "bg-warning";
  }
}

function getRandomDate(startDays, endDays) {
  const date = new Date();
  date.setDate(
    date.getDate() +
    Math.floor(Math.random() * (endDays - startDays + 1)) +
    startDays
  );
  return date.toISOString().split("T")[0];
}

async function viewReservation(id) {
  try {
    const result = await HotelAPI.getReservationById(id);
    if (result.success) {
      const res = result.data;
      const modalBody = document.querySelector("#reservationDetailsModal .modal-body");
      if (modalBody) {
        modalBody.innerHTML = `
          <div class="reservation-details">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h5 class="mb-0 text-primary">Reservation #${res.reservation_id}</h5>
              <span class="badge ${getStatusClass(res.status)}">${res.status}</span>
            </div>
            <div class="row mb-3">
              <div class="col-6">
                <label class="text-muted small">Room</label>
                <p class="fw-bold mb-0">${res.room_type} Room ${res.room_number}</p>
              </div>
              <div class="col-6">
                <label class="text-muted small">Total Price</label>
                <p class="fw-bold mb-0">$${res.total_price}</p>
              </div>
            </div>
            <div class="row mb-3">
              <div class="col-6">
                <label class="text-muted small">Check-in</label>
                <p class="mb-0">${formatDate(res.check_in_date)}</p>
              </div>
              <div class="col-6">
                <label class="text-muted small">Check-out</label>
                <p class="mb-0">${formatDate(res.check_out_date)}</p>
              </div>
            </div>
            <div class="mb-3">
              <label class="text-muted small">Guests</label>
              <p class="mb-0">${res.guests} person(s)</p>
            </div>
            ${res.special_requests ? `
              <div class="mb-0">
                <label class="text-muted small">Special Requests</label>
                <p class="mb-0 fst-italic">"${res.special_requests}"</p>
              </div>
            ` : ''}
          </div>
        `;
        const modal = new bootstrap.Modal(document.getElementById('reservationDetailsModal'));
        modal.show();
      }
    }
  } catch (error) {
    console.error("Error viewing reservation:", error);
    showMessage("error", "Error loading reservation details.");
  }
}

async function loadAllReservations() {
  const container = document.getElementById("reservationsList");
  if (!container) return;

  try {
    const result = await HotelAPI.getReservations();
    if (result.success) {
      const reservations = result.data;
      if (reservations.length === 0) {
        container.innerHTML = '<div class="text-center py-5 text-muted">No reservations found.</div>';
        return;
      }

      container.innerHTML = `
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Room</th>
                <th>Stay Dates</th>
                <th>Status</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${reservations.map(res => `
                <tr>
                  <td>#${res.reservation_id}</td>
                  <td>${res.room_type}<br><small class="text-muted">Room ${res.room_number}</small></td>
                  <td>${formatDate(res.check_in_date)} - ${formatDate(res.check_out_date)}</td>
                  <td><span class="badge ${getStatusClass(res.status)}">${res.status}</span></td>
                  <td class="fw-bold">$${res.total_price}</td>
                  <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="viewReservation(${res.reservation_id})">
                      <i class="fas fa-eye"></i>
                    </button>
                    ${res.status === 'PENDING' ? `
                      <button class="btn btn-sm btn-success me-1" onclick="showPaymentModal(${res.reservation_id}, ${res.total_price})" title="Pay Now">
                        <i class="fas fa-credit-card"></i> Pay Now
                      </button>
                    ` : ''}
                    ${res.status === 'PENDING' || res.status === 'CONFIRMED' ? `
                      <button class="btn btn-sm btn-outline-danger" onclick="cancelReservation(${res.reservation_id})">
                        <i class="fas fa-times"></i>
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading all reservations:", error);
    container.innerHTML = '<div class="alert alert-danger">Failed to load reservations.</div>';
  }
}

async function cancelReservation(id) {
  BookingUI.showConfirm({
    title: "Cancel Reservation",
    message: "Are you sure you want to cancel this reservation?",
    confirmText: "Yes, Cancel It",
    onConfirm: async () => {
      try {
        const result = await HotelAPI.cancelReservation(id);
        if (result.success) {
          showMessage("success", "Reservation cancelled successfully.");
          loadAllReservations();
          loadDashboardStats();
          loadRecentReservations();
        } else {
          showMessage("error", "Failed to cancel reservation: " + result.message);
        }
      } catch (error) {
        console.error("Error cancelling reservation:", error);
        showMessage("error", "Error cancelling reservation.");
      }
    }
  });
}

async function loadClientServices() {
  const container = document.getElementById("servicesList");
  if (!container) return;

  showLoading();
  try {
    const reservationsRes = await API.Reservation.getAllReservations();
    if (!reservationsRes.success) throw new Error("Could not load reservations");

    // Find active reservation
    const activeRes = reservationsRes.data.find(r => r.status === 'CHECKED_IN');

    if (!activeRes) {
      container.innerHTML = `
        <div class="alert alert-info border-0 shadow-sm">
          <i class="fas fa-info-circle me-2"></i> 
          You must be checked into a room to order services.
        </div>`;
      return;
    }

    // Load available services
    const servicesRes = await API.Service.getAllServices();
    if (!servicesRes.success) throw new Error("Could not load services");

    // Load my service orders
    const myOrdersRes = await API.Service.getReservationServices(activeRes.reservation_id);

    let html = '';

    // Active orders section
    if (myOrdersRes.success && myOrdersRes.data && myOrdersRes.data.length > 0) {
      html += '<h4>My Active Orders</h4><div class="active-requests mb-4">';
      html += '<div class="list-group">';
      myOrdersRes.data.forEach(req => {
        const statusColors = { 'PENDING': 'warning', 'COMPLETED': 'success', 'CANCELLED': 'danger' };
        const badgeClass = statusColors[req.status] || 'secondary';
        const timeStr = new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        html += `
          <div class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-0">${req.service_name} (x${req.quantity}) - $${(req.price * req.quantity).toFixed(2)}</h6>
              <small class="text-muted">Requested at ${timeStr}</small>
            </div>
            <span class="badge bg-${badgeClass} rounded-pill">${req.status}</span>
          </div>
        `;
      });
      html += '</div></div>';
    }

    // Available services section
    html += '<h4>Available Services</h4><div class="row g-3">';
    html += servicesRes.data.map(service => `
      <div class="col-md-4">
        <div class="card h-100 shadow-sm border-0">
          <div class="card-body">
            <h6 class="card-title text-primary">${service.service_name}</h6>
            <p class="card-text small text-muted">${service.description || 'No description'}</p>
            <div class="d-flex justify-content-between align-items-center mt-3">
              <span class="fw-bold">$${service.price}</span>
              <button class="btn btn-sm btn-outline-primary" 
                onclick="showOrderServiceModal(${service.service_id}, '${service.service_name}', ${service.price}, ${activeRes.reservation_id})">
                Order
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    html += '</div>';

    container.innerHTML = html;
  } catch (error) {
    console.error("Error loading services:", error);
    container.innerHTML = '<div class="alert alert-danger">Failed to load services. Please try again.</div>';
  } finally {
    hideLoading();
  }
}

function showOrderServiceModal(serviceId, serviceName, price, reservationId) {
  document.getElementById("orderServiceName").textContent = serviceName;
  document.getElementById("orderServicePrice").textContent = `Price: $${price}`;
  document.getElementById("orderServiceId").value = serviceId;
  document.getElementById("orderServiceQuantity").value = 1;
  // store reservation inline
  document.getElementById("addServiceModal").dataset.reservationId = reservationId;
  document.getElementById("addServiceModal").dataset.price = price;

  const modal = new bootstrap.Modal(document.getElementById("addServiceModal"));
  modal.show();
}

async function submitClientAddService() {
  const modalEl = document.getElementById("addServiceModal");
  const reservationId = modalEl.dataset.reservationId;
  const serviceId = document.getElementById("orderServiceId").value;
  const quantity = parseInt(document.getElementById("orderServiceQuantity").value);
  const price = parseFloat(modalEl.dataset.price);

  if (!reservationId || !serviceId || isNaN(quantity) || quantity < 1) {
    showMessage("error", "Invalid order details.");
    return;
  }

  const services = [{
    service_id: serviceId,
    quantity: quantity,
    price: price
  }];

  showLoading();
  try {
    const response = await API.Service.addServicesToReservation(reservationId, services);
    if (response.success) {
      showMessage("success", "Service ordered successfully! It will be brought to your room shortly.");
      bootstrap.Modal.getInstance(modalEl).hide();
      loadClientServices(); // refresh list
    } else {
      showMessage("error", response.message || "Failed to order service.");
    }
  } catch (error) {
    console.error(error);
    showMessage("error", "An error occurred while placing your order.");
  } finally {
    hideLoading();
  }
}

// Expose functions to global scope for onclick attributes
window.showBookRoomModal = showBookRoomModal;
window.viewAllReservations = viewAllReservations;
window.editProfile = editProfile;
window.bookRoom = bookRoom;
window.viewReservation = viewReservation;
window.cancelReservation = cancelReservation;
window.showOrderServiceModal = showOrderServiceModal;
window.submitClientAddService = submitClientAddService;

console.log("Client dashboard functions loaded");
