<?php
// API Secrets Configuration
// REPLACE THESE WITH YOUR REAL KEYS FROM THE RESPECTIVE DASHBOARDS

// Stripe Keys (https://dashboard.stripe.com/test/apikeys)
define('STRIPE_SECRET_KEY', 'sk_test_YOUR_STRIPE_SECRET_KEY');
define('STRIPE_PUBLISHABLE_KEY', 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY');

// Google Identity Services (https://console.cloud.google.com/)
define('GOOGLE_CLIENT_ID', 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com');

// Facebook Developers (https://developers.facebook.com/)
define('FACEBOOK_APP_ID', 'YOUR_FACEBOOK_APP_ID');

// Base URL for redirects (useful for Stripe success/cancel URLs)
define('BASE_URL', 'https://ermias.great-site.net/');

// Email Configuration (SMTP)
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'ermiasmuluget71@gmail.com');
define('SMTP_PASS', 'YOUR_GMAIL_APP_PASSWORD'); // Needs an App Password from Google
define('SMTP_FROM_EMAIL', 'ermiasmuluget71@gmail.com');
define('SMTP_FROM_NAME', 'Grand Hotel');
?>
