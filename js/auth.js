document.addEventListener("DOMContentLoaded", function () {
  // Check if user is already logged in
  checkAuthStatus();

  // Login Form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Register Form
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);

    // Password strength indicator
    const passwordInput = document.getElementById("password");
    const strengthLevel = document.getElementById("strengthLevel");
    const strengthText = document.getElementById("strengthText");

    passwordInput.addEventListener("input", function () {
      const strength = checkPasswordStrength(this.value);
      strengthLevel.style.width = `${strength.percentage}%`;
      strengthLevel.style.backgroundColor = strength.color;
      strengthText.textContent = strength.text;
      strengthText.style.color = strength.color;
    });
  }

  // Logout Button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
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
  }

  // Social Login Buttons
  const googleBtn = document.getElementById("googleLoginBtn");
  if (googleBtn) {
    googleBtn.addEventListener("click", () => handleSocialLogin("google"));
  }

  const facebookBtn = document.getElementById("facebookLoginBtn");
  if (facebookBtn) {
    facebookBtn.addEventListener("click", () => handleSocialLogin("facebook"));
  }

  // Forgot Password Modal
  const forgotLink = document.querySelector(".forgot-password");
  const forgotModal = document.getElementById("forgotPasswordModal");
  const closeModal = document.querySelector(".close-modal");

  if (forgotLink && forgotModal) {
    forgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      forgotModal.style.display = "block";
      resetForgotModal();
    });
  }

  if (closeModal && forgotModal) {
    closeModal.addEventListener("click", function () {
      forgotModal.style.display = "none";
    });

    window.addEventListener("click", function (e) {
      if (e.target == forgotModal) {
        forgotModal.style.display = "none";
      }
    });
  }

  // OTP Flow
  const sendOtpBtn = document.getElementById("sendOtpBtn");
  if (sendOtpBtn) {
    sendOtpBtn.addEventListener("click", handleRequestOTP);
  }

  const resetPasswordBtn = document.getElementById("resetPasswordBtn");
  if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener("click", handlePasswordResetWithOTP);
  }
});

function resetForgotModal() {
  document.getElementById("stepRequestOTP").style.display = "block";
  document.getElementById("stepResetPassword").style.display = "none";
  document.getElementById("forgotMessage").style.display = "none";
  document.getElementById("resetMessage").style.display = "none";
  document.getElementById("forgotEmail").value = "";
  document.getElementById("otpCode").value = "";
  document.getElementById("newPassword").value = "";
}

async function handleRequestOTP() {
  const email = document.getElementById("forgotEmail").value;
  const btn = document.getElementById("sendOtpBtn");
  const msg = document.getElementById("forgotMessage");

  if (!email) {
    showMessage(msg, "Please enter your email", "error");
    return;
  }

  const originalText = btn.querySelector("span").textContent;
  btn.querySelector("span").textContent = "Sending...";
  btn.disabled = true;

  try {
    const response = await fetch('api/password-reset.php?action=request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const result = await response.json();

    if (result.success) {
      showMessage(msg, "OTP sent! Check your email (or logs).", "success");
      setTimeout(() => {
        document.getElementById("stepRequestOTP").style.display = "none";
        document.getElementById("stepResetPassword").style.display = "block";
      }, 1500);
    } else {
      showMessage(msg, result.message || "Failed to send OTP", "error");
    }
  } catch (err) {
    showMessage(msg, "Connection error", "error");
  } finally {
    btn.querySelector("span").textContent = originalText;
    btn.disabled = false;
  }
}

async function handlePasswordResetWithOTP() {
  const email = document.getElementById("forgotEmail").value;
  const otp = document.getElementById("otpCode").value;
  const newPassword = document.getElementById("newPassword").value;
  const btn = document.getElementById("resetPasswordBtn");
  const msg = document.getElementById("resetMessage");

  if (!otp || !newPassword) {
    showMessage(msg, "All fields are required", "error");
    return;
  }

  if (newPassword.length < 8) {
    showMessage(msg, "Password must be at least 8 characters", "error");
    return;
  }

  const originalText = btn.querySelector("span").textContent;
  btn.querySelector("span").textContent = "Changing...";
  btn.disabled = true;

  try {
    const response = await fetch('api/password-reset.php?action=reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, new_password: newPassword })
    });
    const result = await response.json();

    if (result.success) {
      showMessage(msg, "Password reset successful! You can now login.", "success");
      setTimeout(() => {
        document.getElementById("forgotPasswordModal").style.display = "none";
      }, 2000);
    } else {
      showMessage(msg, result.message || "Failed to reset password", "error");
    }
  } catch (err) {
    showMessage(msg, "Connection error", "error");
  } finally {
    btn.querySelector("span").textContent = originalText;
    btn.disabled = false;
  }
}

function checkAuthStatus() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  // If on login/register page and already logged in, redirect to dashboard
  if (
    (window.location.pathname.includes("login.php") ||
      window.location.pathname.includes("register.html")) &&
    token &&
    user
  ) {
    redirectToDashboard(user.role);
  }

  // If on dashboard page and not logged in, redirect to login
  if (window.location.pathname.includes("dashboard.html") && !token) {
    window.location.href = "login.php";
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("rememberMe")?.checked;
  const loginBtn = document.getElementById("loginBtn");
  const messageDiv = document.getElementById("loginMessage");

  // Validate inputs
  if (!username || !password) {
    showMessage(messageDiv, "Please fill in all fields", "error");
    return;
  }

  // Show loading state
  const originalText = loginBtn.querySelector("span").textContent;
  loginBtn.querySelector("span").textContent = "Signing in...";
  loginBtn.disabled = true;

  try {
    const result = await HotelAPI.login({ username, password });

    if (result.success) {
      // Store auth data
      localStorage.setItem("user", JSON.stringify(result.data));
      // In this PHP implementation, session is handled by PHP. 
      // We set a 'token' just to satisfy existing checks, but PHP uses session_start()
      localStorage.setItem("token", "session-active");

      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
      }

      showMessage(messageDiv, "Login successful! Redirecting...", "success");

      // Redirect to appropriate dashboard
      setTimeout(() => {
        redirectToDashboard(result.data.user_role);
      }, 1500);
    } else {
      throw new Error(result.message || "Invalid credentials");
    }
  } catch (error) {
    showMessage(messageDiv, error.message || "Invalid credentials", "error");
  } finally {
    // Reset button state
    loginBtn.querySelector("span").textContent = originalText;
    loginBtn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const username = document.getElementById("username").value;
  const phone = document.getElementById("phone").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const userRole = "CLIENT";
  const terms = document.getElementById("terms").checked;
  const registerBtn = document.getElementById("registerBtn");
  const messageDiv = document.getElementById("registerMessage");

  // Validate inputs
  if (!fullName || !email || !username || !password || !confirmPassword) {
    showMessage(messageDiv, "Please fill in all required fields", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage(messageDiv, "Passwords do not match", "error");
    return;
  }

  if (!terms) {
    showMessage(messageDiv, "Please accept the terms and conditions", "error");
    return;
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showMessage(messageDiv, "Please enter a valid email address", "error");
    return;
  }

  // Show loading state
  const originalText = registerBtn.querySelector("span").textContent;
  registerBtn.querySelector("span").textContent = "Creating account...";
  registerBtn.disabled = true;

  try {
    const userData = {
      full_name: fullName,
      email,
      username,
      phone,
      password,
      user_role: userRole,
    };

    const result = await HotelAPI.register(userData);

    if (result.success) {
      // Store auth data
      localStorage.setItem("user", JSON.stringify(result.data));
      localStorage.setItem("token", "session-active");

      showMessage(
        messageDiv,
        "Registration successful! Redirecting...",
        "success"
      );

      // Redirect to appropriate dashboard
      setTimeout(() => {
        redirectToDashboard(userRole);
      }, 1500);
    } else {
      throw new Error(result.message || "Registration failed");
    }
  } catch (error) {
    showMessage(messageDiv, error.message || "Registration failed", "error");
  } finally {
    // Reset button state
    registerBtn.querySelector("span").textContent = originalText;
    registerBtn.disabled = false;
  }
}

async function handleSocialLogin(provider) {
  const messageDiv = document.getElementById("loginMessage") || document.getElementById("registerMessage");

  if (provider === 'google') {
    if (messageDiv) showMessage(messageDiv, "Connecting to Google...", "success");
    if (typeof google !== 'undefined') {
      try {
        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            console.warn("One Tap not displayed:", notification.getNotDisplayedReason());
            if (messageDiv) showMessage(messageDiv, "Google One Tap not available. You might be signed in already or have blocked it.", "error");
          } else if (notification.isSkippedMoment()) {
            console.warn("One Tap skipped:", notification.getSkippedReason());
          }
        });
      } catch (err) {
        console.error("Google Prompt error:", err);
        if (messageDiv) showMessage(messageDiv, "Failed to initialize Google Login.", "error");
      }
    } else {
      if (messageDiv) showMessage(messageDiv, "Google SDK not loaded. Please check your internet connection or ad blocker.", "error");
    }
  } else if (provider === 'facebook') {
    if (messageDiv) showMessage(messageDiv, "Connecting to Facebook...", "success");
    if (typeof FB !== 'undefined') {
      FB.login(function (response) {
        if (response.authResponse) {
          // Logged into your app and Facebook.
          FB.api('/me', { fields: 'name,email' }, async function (fbUser) {
            try {
              if (!fbUser.email) {
                throw new Error("Facebook did not provide an email address. Please ensure you have an email associated with your Facebook account.");
              }
              const socialData = {
                id: fbUser.id,
                email: fbUser.email,
                full_name: fbUser.name
              };
              const result = await HotelAPI.socialLogin('facebook', socialData);
              if (result.success) {
                handleSocialSuccess(result);
              } else {
                throw new Error(result.message || "Social login failed");
              }
            } catch (error) {
              if (messageDiv) showMessage(messageDiv, error.message, "error");
            }
          });
        } else {
          if (messageDiv) showMessage(messageDiv, "Facebook login cancelled or not authorized.", "error");
        }
      }, { scope: 'public_profile,email' });
    } else {
      if (messageDiv) showMessage(messageDiv, "Facebook SDK not loaded. Please check your internet connection or ad blocker.", "error");
    }
  }
}

// Make handleGoogleSignIn global for Google Identity Services callback
window.handleGoogleSignIn = async function (response) {
  const messageDiv = document.getElementById("loginMessage") || document.getElementById("registerMessage");
  try {
    if (messageDiv) showMessage(messageDiv, "Verifying Google account...", "success");

    // Decode the JWT (id_token)
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const googleUser = JSON.parse(jsonPayload);

    const socialData = {
      id: googleUser.sub,
      email: googleUser.email,
      full_name: googleUser.name
    };

    console.log("Google Social Data:", socialData);

    const result = await HotelAPI.socialLogin('google', socialData);
    if (result.success) {
      handleSocialSuccess(result);
    } else {
      throw new Error(result.message || "Google login failed");
    }
  } catch (error) {
    console.error("Google SignIn error:", error);
    if (messageDiv) showMessage(messageDiv, error.message, "error");
  }
};

function handleSocialSuccess(result) {
  const messageDiv = document.getElementById("loginMessage") || document.getElementById("registerMessage");
  localStorage.setItem("user", JSON.stringify(result.data));
  localStorage.setItem("token", "session-active");

  if (messageDiv) showMessage(messageDiv, "Social login successful! Redirecting...", "success");

  setTimeout(() => {
    redirectToDashboard(result.data.user_role);
  }, 1500);
}

async function handleLogout() {
  try {
    await HotelAPI.logout();
  } catch (error) {
    console.error("Logout error:", error);
  }

  // Clear auth data
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("rememberMe");

  // Show status
  const messageDiv = document.getElementById("loginMessage") || document.getElementById("registerMessage");
  if (messageDiv) {
    showMessage(messageDiv, "Logging out... Redirecting...", "success");
  } else if (typeof showNotification === 'function') {
    showNotification("success", "Logging out... Redirecting to login page");
  } else {
    console.log("Logged out successfully");
  }

  // Redirect after delay
  setTimeout(() => {
    window.location.href = "login.php";
  }, 1500);
}

function redirectToDashboard(role) {
  switch (role) {
    case "ADMIN":
      window.location.href = "admin-dashboard.html";
      break;
    case "MANAGER":
      window.location.href = "manager-dashboard.html";
      break;
    case "RECEPTION":
      window.location.href = "reception-dashboard.html";
      break;
    case "CLIENT":
    default:
      window.location.href = "client-dashboard.html";
      break;
  }
}

function checkPasswordStrength(password) {
  let strength = 0;
  let text = "Password strength";
  let percentage = 0;
  let color = "#e74c3c"; // Red

  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  switch (strength) {
    case 0:
      text = "Very Weak";
      percentage = 20;
      color = "#e74c3c";
      break;
    case 1:
      text = "Weak";
      percentage = 40;
      color = "#e74c3c";
      break;
    case 2:
      text = "Fair";
      percentage = 60;
      color = "#f39c12";
      break;
    case 3:
      text = "Good";
      percentage = 80;
      color = "#27ae60";
      break;
    case 4:
      text = "Strong";
      percentage = 100;
      color = "#27ae60";
      break;
  }

  return { text, percentage, color };
}

function determineUserRole(username) {
  // Mock role determination based on username
  const name = username.toLowerCase();
  if (name.includes("admin")) return "ADMIN";
  if (name.includes("manager")) return "MANAGER";
  if (name.includes("reception")) return "RECEPTION";
  return "CLIENT";
}

function showMessage(element, message, type) {
  if (!element) return;

  element.textContent = message;
  element.className = `alert alert-${type === "error" ? "error" : "success"}`;
  element.style.display = "block";

  // Auto-hide success messages
  if (type === "success") {
    setTimeout(() => {
      element.style.display = "none";
    }, 5000);
  }
}

// Export functions for use in other files
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    checkAuthStatus,
    handleLogin,
    handleRegister,
    handleLogout,
    checkPasswordStrength,
  };
}
// [Eyuel commit 3] incremental JS improvement
// [Eyuel commit 13] incremental JS improvement
// [Eyuel commit 23] incremental JS improvement
// [Eyuel commit 33] incremental JS improvement
