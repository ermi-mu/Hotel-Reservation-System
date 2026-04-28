/**
 * main.js - Main JavaScript file for Hotel Management System
 * This file contains common functionality used across all pages
 */

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("Hotel Management System - Main JS loaded");

  // Initialize common functionality
  initCommonFeatures();

  // Check authentication status
  checkAuthStatus();

  // Initialize navigation
  initNavigation();

  // Load featured rooms if on homepage
  if (document.getElementById("featuredRooms")) {
    loadFeaturedRooms();
  }
});

/**
 * Initialize common features across all pages
 */
function initCommonFeatures() {
  // Initialize tooltips
  initTooltips();

  // Initialize forms
  initCommonForms();

  // Initialize date pickers
  initDatePickers();

  // Setup logout functionality
  setupLogoutHandlers();
}

/**
 * Initialize Bootstrap tooltips
 */
function initTooltips() {
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

/**
 * Initialize common forms
 */
function initCommonForms() {
  // Contact form
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", handleContactForm);
  }

  // Newsletter form
  const newsletterForm = document.getElementById("newsletterForm");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", handleNewsletterForm);
  }
}

/**
 * Initialize date pickers
 */
function initDatePickers() {
  // Set minimum date for check-in dates to today
  const today = new Date().toISOString().split("T")[0];
  const dateInputs = document.querySelectorAll('input[type="date"]');

  dateInputs.forEach((input) => {
    if (input.id.includes("checkIn") || input.id.includes("CheckIn")) {
      input.min = today;
    }
  });
}

function setupLogoutHandlers() {
  const logoutButtons = document.querySelectorAll(".logout-btn");
  logoutButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof BookingUI !== 'undefined') {
        BookingUI.showConfirm({
          title: "Logout",
          message: "Are you sure you want to logout?",
          onConfirm: () => handleLogout()
        });
      } else if (confirm("Are you sure you want to logout?")) {
        handleLogout();
      }
    });
  });
}

/**
 * Initialize navigation
 */
function initNavigation() {
  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById("mobileNavToggle");
  const navLinks = document.querySelector(".nav-links");

  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener("click", function () {
      navLinks.classList.toggle("active");

      // Update icon
      const icon = mobileMenuBtn.querySelector("i");
      if (navLinks.classList.contains("active")) {
        icon.classList.remove("fa-bars");
        icon.classList.add("fa-times");
      } else {
        icon.classList.remove("fa-times");
        icon.classList.add("fa-bars");
      }
    });
  }

  // Close mobile menu when clicking outside
  document.addEventListener("click", function (event) {
    if (
      navLinks &&
      navLinks.classList.contains("active") &&
      !event.target.closest(".nav-links") &&
      !event.target.closest("#mobileNavToggle")
    ) {
      navLinks.classList.remove("active");
      const icon = mobileMenuBtn.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-times");
        icon.classList.add("fa-bars");
      }
    }
  });

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href === "#") return;

      const targetElement = document.querySelector(href);
      if (targetElement) {
        e.preventDefault();
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: "smooth",
        });

        // Close mobile menu if open
        if (navLinks && navLinks.classList.contains("show")) {
          navLinks.classList.remove("show");
        }
      }
    });
  });
}

/**
 * Check authentication status and update UI
 */
function checkAuthStatus() {
  const token = localStorage.getItem("authToken");
  const userRole = localStorage.getItem("userRole");
  const userName = localStorage.getItem("userName");

  if (token && userRole) {
    // User is logged in
    updateUIForLoggedInUser(userName, userRole);
  } else {
    // User is not logged in
    updateUIForGuest();
  }
}

/**
 * Update UI for logged in user
 */
function updateUIForLoggedInUser(userName, userRole) {
  // Update navigation links
  const loginLink = document.querySelector('a[href="login.php"]');
  const registerLink = document.querySelector('a[href="register.html"]');
  const navLinks = document.querySelector(".nav-links");

  if (navLinks) {
    // Hide login/register links
    if (loginLink && loginLink.parentElement) {
      loginLink.parentElement.style.display = "none";
    }
    if (registerLink && registerLink.parentElement) {
      registerLink.parentElement.style.display = "none";
    }

    // Determine dashboard URL based on role
    let dashboardUrl = "client-dashboard.html";
    switch (userRole) {
      case "RECEPTION":
        dashboardUrl = "reception-dashboard.html";
        break;
      case "MANAGER":
      case "ADMIN":
        dashboardUrl = "manager-dashboard.html";
        break;
    }

    // Add dashboard link if not already present
    if (!document.getElementById("dashboardLink")) {
      const dashboardLi = document.createElement("li");
      dashboardLi.id = "dashboardLink";
      dashboardLi.innerHTML = `
                <a href="${dashboardUrl}" class="btn btn-primary">
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </a>
            `;
      navLinks.appendChild(dashboardLi);
    }

    // Add logout link if not already present
    if (!document.getElementById("logoutLink")) {
      const logoutLi = document.createElement("li");
      logoutLi.id = "logoutLink";
      logoutLi.innerHTML = `
                <a href="#" class="btn btn-danger logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
      navLinks.appendChild(logoutLi);

      // Reattach event listener
      logoutLi
        .querySelector(".logout-btn")
        .addEventListener("click", function (e) {
          e.preventDefault();
          handleLogout();
        });
    }
  }

  // Update welcome message if on dashboard
  const welcomeMessage = document.getElementById("welcomeMessage");
  if (welcomeMessage && userName) {
    welcomeMessage.textContent = `Welcome, ${userName}`;
  }
}

/**
 * Update UI for guest (not logged in)
 */
function updateUIForGuest() {
  const navLinks = document.querySelector(".nav-links");
  if (navLinks) {
    // Show login/register links
    const loginLink = document.querySelector('a[href="login.php"]');
    const registerLink = document.querySelector('a[href="register.html"]');

    if (loginLink && loginLink.parentElement) {
      loginLink.parentElement.style.display = "block";
    }
    if (registerLink && registerLink.parentElement) {
      registerLink.parentElement.style.display = "block";
    }

    // Remove dashboard and logout links
    const dashboardLink = document.getElementById("dashboardLink");
    const logoutLink = document.getElementById("logoutLink");

    if (dashboardLink) dashboardLink.remove();
    if (logoutLink) logoutLink.remove();
  }
}

/**
 * Handle logout
 */
function handleLogout() {
  // Clear local storage
  localStorage.removeItem("authToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");

  // Show success message
  showMessage("You have been logged out successfully.", "success");

  // Update UI
  setTimeout(() => {
    window.location.href = "login.php";
  }, 1500);
}

/**
 * Load featured rooms on homepage
 */
async function loadFeaturedRooms() {
  const featuredRoomsContainer = document.getElementById("featuredRooms");
  if (!featuredRoomsContainer) return;

  // Show loading state
  featuredRoomsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading our finest rooms...</p>
        </div>
    `;

  try {
    const response = await API.Room.getAllRooms();
    if (response.success && response.data && response.data.length > 0) {
      displayFeaturedRooms(response.data.slice(0, 3));
    } else {
      showDefaultRooms();
    }
  } catch (error) {
    console.log("Using default rooms:", error.message);
    showDefaultRooms();
  }
}

/**
 * Display featured rooms
 */
function displayFeaturedRooms(rooms) {
  const featuredRoomsContainer = document.getElementById("featuredRooms");
  if (!featuredRoomsContainer) return;

  const getRoomImage = (type) => {
    switch (type) {
      case "Standard": return "images/room-standard.png";
      case "Deluxe": return "images/room-deluxe.png";
      case "Suite": return "images/room-suite.png";
      default: return "images/hero.png";
    }
  };

  const html = rooms
    .map(
      (room) => `
        <div class="room-card">
            <div class="room-image" style="background-image: url('${getRoomImage(room.room_type)}')">
                <div class="room-status ${room.status.toLowerCase()}">${room.status
        }</div>
            </div>
            <div class="room-content">
                <h3>${room.room_type} ROOM</h3>
                <div class="room-price">
                    $${room.price_per_night} <span>/ NIGHT</span>
                </div>
                <p class="room-description">${room.description || "An exquisite sanctuary designed for the most discerning travelers."
        }</p>
                <div class="room-features">
                    <span><i class="fas fa-users"></i> ${room.capacity
        } GUESTS</span>
                    <span><i class="fas fa-wifi"></i> WIFI</span>
                </div>
                <a href="login.php?redirect=book&room=${room.room_id
        }" class="btn btn-primary" style="width: 100%; text-align: center;">
                    Book This Experience
                </a>
            </div>
        </div>
    `
    )
    .join("");

  featuredRoomsContainer.innerHTML = html;
}

/**
 * Show default rooms when API is not available
 */
function showDefaultRooms() {
  const defaultRooms = [
    {
      room_id: 1,
      room_type: "Standard",
      description: "Elegance and comfort in perfect harmony, featuring bespoke furnishings and a tranquil atmosphere.",
      capacity: 2,
      price_per_night: "250.00",
      status: "AVAILABLE",
    },
    {
      room_id: 2,
      room_type: "Deluxe",
      description: "Expansive living space with breathtaking views and meticulously crafted amenities for your indulgence.",
      capacity: 3,
      price_per_night: "450.00",
      status: "AVAILABLE",
    },
    {
      room_id: 3,
      room_type: "Suite",
      description: "The pinnacle of luxury, offering a private haven of sophistication and unrivaled panoramic city views.",
      capacity: 4,
      price_per_night: "850.00",
      status: "AVAILABLE",
    },
  ];

  displayFeaturedRooms(defaultRooms);
}

/**
 * Handle contact form submission
 */
function handleContactForm(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  // Show loading state
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  submitBtn.disabled = true;

  // Simulate API call
  setTimeout(() => {
    showMessage(
      "Thank you for your message! We will get back to you soon.",
      "success"
    );
    form.reset();
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }, 1500);
}

/**
 * Handle newsletter form submission
 */
function handleNewsletterForm(e) {
  e.preventDefault();

  const form = e.target;
  const email = form.querySelector('input[type="email"]').value;

  if (!email) {
    showMessage("Please enter your email address", "error");
    return;
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showMessage("Please enter a valid email address", "error");
    return;
  }

  // Show loading state
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing...';
  submitBtn.disabled = true;

  // Simulate API call
  setTimeout(() => {
    showMessage("Thank you for subscribing to our newsletter!", "success");
    form.reset();
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }, 1500);
}

/**
 * Show message to user
 */
function showMessage(message, type = "info") {
  // Remove existing messages
  const existingMessages = document.querySelectorAll(".user-message");
  existingMessages.forEach((msg) => msg.remove());

  // Create message element
  const messageDiv = document.createElement("div");
  messageDiv.className = `user-message ${type}`;
  messageDiv.innerHTML = `
        <div class="message-content">
            <span>${message}</span>
            <button class="close-btn">&times;</button>
        </div>
    `;

  // Add styles
  messageDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;

  // Set colors based on type
  if (type === "success") {
    messageDiv.style.background = "#d4edda";
    messageDiv.style.color = "#155724";
    messageDiv.style.border = "1px solid #c3e6cb";
  } else if (type === "error") {
    messageDiv.style.background = "#f8d7da";
    messageDiv.style.color = "#721c24";
    messageDiv.style.border = "1px solid #f5c6cb";
  } else {
    messageDiv.style.background = "#d1ecf1";
    messageDiv.style.color = "#0c5460";
    messageDiv.style.border = "1px solid #bee5eb";
  }

  // Add close functionality
  const closeBtn = messageDiv.querySelector(".close-btn");
  closeBtn.addEventListener("click", () => {
    messageDiv.remove();
  });

  // Add to page
  document.body.appendChild(messageDiv);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (messageDiv.parentElement) {
      messageDiv.remove();
    }
  }, 5000);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Calculate nights between dates
 */
function calculateNights(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
}

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .loading {
        text-align: center;
        padding: 40px;
    }
    
    .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .user-message .message-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .user-message .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        margin-left: 15px;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: inherit;
    }
    
    .room-image {
        height: 200px;
        background: linear-gradient(45deg, #3498db, #2c3e50);
        position: relative;
    }
    
    .room-status {
        position: absolute;
        top: 10px;
        right: 10px;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: bold;
        text-transform: uppercase;
    }
    
    .room-status.available {
        background: #27ae60;
        color: white;
    }
    
    .room-status.occupied {
        background: #e74c3c;
        color: white;
    }
    
    .room-status.maintenance {
        background: #f39c12;
        color: white;
    }
    
    .room-status.cleaning {
        background: #3498db;
        color: white;
    }
    
    .room-features {
        display: flex;
        gap: 15px;
        margin: 10px 0;
        font-size: 0.9rem;
        color: #666;
    }
    
    .room-features i {
        margin-right: 5px;
    }
    
    .room-price {
        font-size: 1.5rem;
        font-weight: bold;
        color: #2c3e50;
        margin: 15px 0;
    }
`;
document.head.appendChild(style);
// [Eyuel commit 6] incremental JS improvement
// [Eyuel commit 16] incremental JS improvement
