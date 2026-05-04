<?php
require_once __DIR__ . '/functions.php';

// Function to register user
function registerUser($username, $password, $email, $fullName, $phone, $userRole = 'CLIENT') {
    $conn = getDBConnection();
    
    // Check if username or email already exists
    $stmt = $conn->prepare("SELECT user_id FROM users WHERE username = ? OR email = ?");
    $stmt->bind_param("ss", $username, $email);
    $stmt->execute();
    $stmt->store_result();
    
    if ($stmt->num_rows > 0) {
        $stmt->close();
        closeDBConnection($conn);
        return ['success' => false, 'message' => 'Username or email already exists'];
    }
    
    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Insert user
    $stmt = $conn->prepare("INSERT INTO users (username, password, email, full_name, phone, user_role) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssss", $username, $hashedPassword, $email, $fullName, $phone, $userRole);
    
    if ($stmt->execute()) {
        $userId = $stmt->insert_id;
        $stmt->close();
        closeDBConnection($conn);
        
        return [
            'success' => true,
            'message' => 'Registration successful',
            'data' => [
                'user_id' => $userId,
                'username' => $username,
                'email' => $email,
                'full_name' => $fullName,
                'user_role' => $userRole
            ]
        ];
    } else {
        $stmt->close();
        closeDBConnection($conn);
        return ['success' => false, 'message' => 'Registration failed: ' . $conn->error];
    }
}

// Function to login user
function loginUser($username, $password) {
    $conn = getDBConnection();
    
    $stmt = $conn->prepare("SELECT user_id, username, password, email, full_name, user_role FROM users WHERE username = ? OR email = ?");
    $stmt->bind_param("ss", $username, $username);
    $stmt->execute();
    $stmt->store_result();
    $stmt->bind_result($userId, $dbUsername, $dbPassword, $email, $fullName, $userRole);
    
    if ($stmt->fetch()) {
        if (password_verify($password, $dbPassword)) {
            // Start session
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }
            $_SESSION['user_id'] = $userId;
            $_SESSION['username'] = $dbUsername;
            $_SESSION['email'] = $email;
            $_SESSION['full_name'] = $fullName;
            $_SESSION['user_role'] = $userRole;
            
            $stmt->close();
            closeDBConnection($conn);
            
            return [
                'success' => true,
                'message' => 'Login successful',
                'data' => [
                    'user_id' => $userId,
                    'username' => $dbUsername,
                    'email' => $email,
                    'full_name' => $fullName,
                    'user_role' => $userRole
                ]
            ];
        }
    }
    
    $stmt->close();
    closeDBConnection($conn);
    return ['success' => false, 'message' => 'Invalid username or password'];
}

// Function to logout user
function logoutUser() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    session_destroy();
    return ['success' => true, 'message' => 'Logged out successfully'];
}

// Function to get user profile
function getUserProfile($userId) {
    $conn = getDBConnection();
    
    $stmt = $conn->prepare("SELECT user_id, username, email, full_name, phone, user_role, created_at FROM users WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->store_result();
    $stmt->bind_result($userId, $username, $email, $fullName, $phone, $userRole, $createdAt);
    
    if ($stmt->fetch()) {
        $stmt->close();
        closeDBConnection($conn);
        
        return [
            'success' => true,
            'data' => [
                'user_id' => $userId,
                'username' => $username,
                'email' => $email,
                'full_name' => $fullName,
                'phone' => $phone,
                'user_role' => $userRole,
                'created_at' => $createdAt
            ]
        ];
    }
    
    $stmt->close();
    closeDBConnection($conn);
    return ['success' => false, 'message' => 'User not found'];
}

// Function to update user profile
function updateUserProfile($userId, $data) {
    $conn = getDBConnection();
    
    $updates = [];
    $params = [];
    $types = '';
    
    if (isset($data['full_name'])) {
        $updates[] = "full_name = ?";
        $params[] = $data['full_name'];
        $types .= 's';
    }
    
    if (isset($data['email'])) {
        // Check if email already exists for another user
        $checkStmt = $conn->prepare("SELECT user_id FROM users WHERE email = ? AND user_id != ?");
        $checkStmt->bind_param("si", $data['email'], $userId);
        $checkStmt->execute();
        $checkStmt->store_result();
        
        if ($checkStmt->num_rows > 0) {
            $checkStmt->close();
            closeDBConnection($conn);
            return ['success' => false, 'message' => 'Email already exists'];
        }
        $checkStmt->close();
        
        $updates[] = "email = ?";
        $params[] = $data['email'];
        $types .= 's';
    }
    
    if (isset($data['phone'])) {
        $updates[] = "phone = ?";
        $params[] = $data['phone'];
        $types .= 's';
    }
    
    if (isset($data['password']) && !empty($data['password'])) {
        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        $updates[] = "password = ?";
        $params[] = $hashedPassword;
        $types .= 's';
    }
    
    if (empty($updates)) {
        closeDBConnection($conn);
        return ['success' => false, 'message' => 'No data to update'];
    }
    
    $params[] = $userId;
    $types .= 'i';
    
    $sql = "UPDATE users SET " . implode(', ', $updates) . ", updated_at = CURRENT_TIMESTAMP WHERE user_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        $stmt->close();
        closeDBConnection($conn);
        return ['success' => true, 'message' => 'Profile updated successfully'];
    } else {
        $stmt->close();
        closeDBConnection($conn);
        return ['success' => false, 'message' => 'Update failed: ' . $conn->error];
    }
}

// Function to login or register with social provider
function loginWithSocial($provider, $socialId, $email, $fullName) {
    writeLog("Social login attempt: Provider=$provider, Email=$email", "AUTH");
    $conn = getDBConnection();
    
    $column = ($provider === 'google') ? 'google_id' : 'facebook_id';
    
    // Check if user exists with this social ID
    $stmt = $conn->prepare("SELECT user_id, username, email, full_name, user_role FROM users WHERE $column = ?");
    $stmt->bind_param("s", $socialId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($user = $result->fetch_assoc()) {
        writeLog("Social login success: Existing user found by social ID (User ID: " . $user['user_id'] . ")", "AUTH");
        // User exists, start session
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['full_name'] = $user['full_name'];
        $_SESSION['user_role'] = $user['user_role'];
        
        $stmt->close();
        closeDBConnection($conn);
        
        return [
            'success' => true,
            'message' => 'Login successful',
            'data' => $user
        ];
    }
    
    // User does not exist with this social ID, check if email exists
    $stmt = $conn->prepare("SELECT user_id, username, google_id, facebook_id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($user = $result->fetch_assoc()) {
        writeLog("Social login: Linking account (User ID: " . $user['user_id'] . ")", "AUTH");
        // Email exists, link account
        $stmt = $conn->prepare("UPDATE users SET $column = ? WHERE user_id = ?");
        $stmt->bind_param("si", $socialId, $user['user_id']);
        if (!$stmt->execute()) {
            writeLog("Social login error: Failed to link account - " . $conn->error, "ERROR");
            return ['success' => false, 'message' => 'Failed to link social account'];
        }
        
        // Start session
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $profileResult = getUserProfile($user['user_id']);
        if (!$profileResult['success']) {
            return ['success' => false, 'message' => 'Failed to retrieve profile after linking'];
        }
        $profile = $profileResult['data'];
        
        $_SESSION['user_id'] = $profile['user_id'];
        $_SESSION['username'] = $profile['username'];
        $_SESSION['email'] = $profile['email'];
        $_SESSION['full_name'] = $profile['full_name'];
        $_SESSION['user_role'] = $profile['user_role'];
        
        $stmt->close();
        closeDBConnection($conn);
        
        return [
            'success' => true,
            'message' => 'Account linked and logged in',
            'data' => $profile
        ];
    }
    
    // User doesn't exist at all, create new one
    writeLog("Social login: Creating new user for $email", "AUTH");
    $username = strtolower(str_replace(' ', '.', $fullName)) . rand(100, 999);
    $tempPassword = bin2hex(random_bytes(8)); // Random password for social login users
    
    $registerResult = registerUser($username, $tempPassword, $email, $fullName, '', 'CLIENT');
    
    if ($registerResult['success']) {
        $userId = $registerResult['data']['user_id'];
        
        // Link social ID
        $stmt = $conn->prepare("UPDATE users SET $column = ? WHERE user_id = ?");
        $stmt->bind_param("si", $socialId, $userId);
        if (!$stmt->execute()) {
            writeLog("Social login error: Failed to link social ID after registration - " . $conn->error, "ERROR");
            return ['success' => true, 'message' => 'Registration successful, but social ID linking failed. Please try logging in normally.', 'data' => $registerResult['data']];
        }
        
        // Start session
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['email'] = $email;
        $_SESSION['full_name'] = $fullName;
        $_SESSION['user_role'] = 'CLIENT';
        
        $stmt->close();
        closeDBConnection($conn);
        
        return [
            'success' => true,
            'message' => 'Registration and login successful',
            'data' => [
                'user_id' => $userId,
                'username' => $username,
                'email' => $email,
                'full_name' => $fullName,
                'user_role' => 'CLIENT'
            ]
        ];
    }
    
    writeLog("Social login error: Registration failed for $email", "ERROR");
    $stmt->close();
    closeDBConnection($conn);
    return ['success' => false, 'message' => 'Social login failed: Could not create account'];
}

// Function to generate and store OTP
function generatePasswordResetOTP($email) {
    $conn = getDBConnection();
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT user_id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) {
        $stmt->close();
        closeDBConnection($conn);
        return ['success' => false, 'message' => 'Email not found'];
    }
    
    // Generate 6-digit OTP
    $otp = sprintf("%06d", mt_rand(0, 999999));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));
    
    // Delete any existing OTPs for this email
    $stmt = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    
    // Store new OTP
    $stmt = $conn->prepare("INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $email, $otp, $expiresAt);
    
    if ($stmt->execute()) {
        $stmt->close();
        closeDBConnection($conn);
        
        // Log the OTP for development (mock email sending)
        writeLog("PASSWORD RESET OTP for $email: $otp (Expires at: $expiresAt)", "AUTH");
        
        // Try to send real email
        $subject = "Password Reset OTP - Grand Hotel";
        $body = "
            <h3>Your OTP Code</h3>
            <p>You requested a password reset. Please use the following 6-digit code to proceed:</p>
            <div style='font-size: 24px; font-weight: bold; color: #3498db; letter-spacing: 5px; margin: 20px 0;'>$otp</div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        ";
        
        sendEmail($email, $subject, $body);
        
        return ['success' => true, 'message' => 'OTP sent successfully'];
    }
    
    $stmt->close();
    closeDBConnection($conn);
    return ['success' => false, 'message' => 'Failed to generate OTP'];
}

// Function to verify OTP and reset password
function resetPasswordWithOTP($email, $otp, $newPassword) {
    $conn = getDBConnection();
    
    // Check if OTP is valid and not expired
    $stmt = $conn->prepare("SELECT id FROM password_resets WHERE email = ? AND otp = ? AND expires_at > NOW()");
    $stmt->bind_param("ss", $email, $otp);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        closeDBConnection($conn);
        return ['success' => false, 'message' => 'Invalid or expired OTP'];
    }
    
    // OTP is valid, update password
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?");
    $stmt->bind_param("ss", $hashedPassword, $email);
    
    if ($stmt->execute()) {
        // Delete the used OTP
        $conn->query("DELETE FROM password_resets WHERE email = '$email'");
        
        $stmt->close();
        closeDBConnection($conn);
        writeLog("Password reset successful for $email", "AUTH");
        return ['success' => true, 'message' => 'Password reset successfully'];
    }
    
    $stmt->close();
    closeDBConnection($conn);
    return ['success' => false, 'message' => 'Failed to reset password'];
}
?>