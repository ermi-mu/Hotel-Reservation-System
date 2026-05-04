<?php require_once 'config/secrets.php'; ?>
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login - Grand Hotel</title>
  <link rel="stylesheet" href="css/auth.css" />
  <link rel="stylesheet" href="css/notifications.css" />
  <link rel="stylesheet" href="css/style.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
</head>

<body>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">
          <i class="fas fa-hotel"></i>
        </div>
        <h2>Welcome Back</h2>
        <p>Sign in to your account</p>
      </div>

      <div class="auth-body">
        <form id="loginForm" class="auth-form">
          <div id="loginMessage" class="alert" style="display: none"></div>

          <div class="form-group">
            <label for="username" class="form-label">Username or Email</label>
            <div class="input-with-icon">
              <i class="fas fa-user"></i>
              <input type="text" id="username" class="form-control" required />
            </div>
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <div class="input-with-icon">
              <i class="fas fa-lock"></i>
              <input type="password" id="password" class="form-control" required />
            </div>
          </div>

          <div class="auth-options">
            <div class="remember-me">
              <input type="checkbox" id="rememberMe" />
              <label for="rememberMe">Remember me</label>
            </div>
            <a href="#" class="forgot-password">Forgot password?</a>
          </div>

          <button type="submit" class="auth-btn" id="loginBtn">
            <span>Sign In</span>
          </button>

          <div class="auth-social">
            <div class="social-divider">
              <span>Or continue with</span>
            </div>
            <div class="social-buttons">
              <button type="button" class="social-btn" id="googleLoginBtn">
                <i class="fab fa-google"></i> Google
              </button>
              <button type="button" class="social-btn" id="facebookLoginBtn">
                <i class="fab fa-facebook"></i> Facebook
              </button>
            </div>
          </div>
        </form>
      </div>

      <div class="auth-footer">
        <p>Don't have an account? <a href="register.html">Sign up</a></p>
      </div>
    </div>
  </div>

  <!-- Forgot Password Modal -->
  <div id="forgotPasswordModal" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
    <div class="modal-content" style="background-color: #fefefe; margin: 10% auto; padding: 2rem; border-radius: 12px; width: 90%; max-width: 400px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); position: relative;">
      <span class="close-modal" style="position: absolute; right: 1.5rem; top: 1rem; font-size: 1.5rem; font-weight: bold; cursor: pointer; color: #aaa;">&times;</span>
      
      <!-- Step 1: Request OTP -->
      <div id="stepRequestOTP">
        <h3>Forgot Password?</h3>
        <p class="text-muted small mb-4">Enter your email and we'll send you an OTP to reset your password.</p>
        <div id="forgotMessage" class="alert mb-3" style="display: none"></div>
        <div class="form-group mb-3">
          <label class="form-label">Email Address</label>
          <input type="email" id="forgotEmail" class="form-control" placeholder="your@email.com" required>
        </div>
        <button type="button" class="auth-btn w-100" id="sendOtpBtn">
          <span>Send OTP</span>
        </button>
      </div>
      
      <!-- Step 2: Verify & Reset -->
      <div id="stepResetPassword" style="display: none">
        <h3>Reset Password</h3>
        <p class="text-muted small mb-4">Enter the 6-digit OTP sent to your email and your new password.</p>
        <div id="resetMessage" class="alert mb-3" style="display: none"></div>
        <div class="form-group mb-3">
          <label class="form-label">OTP Code</label>
          <input type="text" id="otpCode" class="form-control" placeholder="123456" maxlength="6" required>
        </div>
        <div class="form-group mb-3">
          <label class="form-label">New Password</label>
          <input type="password" id="newPassword" class="form-control" placeholder="Min 8 characters" required>
        </div>
        <button type="button" class="auth-btn w-100" id="resetPasswordBtn">
          <span>Change Password</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Google Identity Services -->
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <!-- Facebook SDK -->
  <div id="fb-root"></div>
  <script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script>

  <script>
    // Initialize social SDKs
    window.onload = function () {
      // Google Initialization
      if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
          client_id: '<?php echo GOOGLE_CLIENT_ID; ?>',
          callback: handleGoogleSignIn,
          auto_select: false,
          cancel_on_tap_outside: true
        });
        
        // Render the invisible button so it's ready for manual trigger if needed,
        // or just rely on the prompt(). 
        // Some browsers require a user gesture for the prompt to show.
      }

      // Facebook Initialization
      window.fbAsyncInit = function() {
        if (typeof FB !== 'undefined') {
          FB.init({
            appId      : '<?php echo FACEBOOK_APP_ID; ?>',
            cookie     : true,
            xfbml      : true,
            version    : 'v12.0'
          });
          console.log("Facebook SDK initialized");
        }
      };
    };
  </script>


  <script src="js/api.js"></script>
  <script src="js/auth.js"></script>
  <script src="js/notifications.js"></script>
</body>

</html>