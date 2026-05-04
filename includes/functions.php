<?php
// Handle CORS preflight requests globally
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database configuration
require_once __DIR__ . '/../config/database.php';

// Function to send JSON response
function jsonResponse($success, $message = '', $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    
    $response = [
        'success' => $success,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode($response);
    exit;
}

// Function to validate input
function validateInput($input, $type = 'string', $required = true) {
    if ($required && empty(trim($input))) {
        return false;
    }
    
    switch ($type) {
        case 'email':
            return filter_var($input, FILTER_VALIDATE_EMAIL);
        case 'int':
            return filter_var($input, FILTER_VALIDATE_INT);
        case 'float':
            return filter_var($input, FILTER_VALIDATE_FLOAT);
        case 'date':
            return (bool)strtotime($input);
        case 'phone':
            return preg_match('/^[0-9+\-\s()]{10,20}$/', $input);
        default:
            return true;
    }
}

// Function to sanitize input
function sanitizeInput($input) {
    $input = trim($input);
    $input = stripslashes($input);
    $input = htmlspecialchars($input);
    return $input;
}

// Function to check if user is authenticated
function isAuthenticated() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

// Function to get current user role
function getUserRole() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    return $_SESSION['user_role'] ?? 'CLIENT';
}

// Function to require authentication
function requireAuth() {
    if (!isAuthenticated()) {
        jsonResponse(false, 'Authentication required', null, 401);
    }
}

// Function to require specific role
function requireRole($requiredRole) {
    requireAuth();
    $userRole = getUserRole();
    
    $roleHierarchy = [
        'CLIENT' => 1,
        'RECEPTION' => 2,
        'MANAGER' => 3,
        'ADMIN' => 4
    ];
    
    if (!isset($roleHierarchy[$userRole]) || $roleHierarchy[$userRole] < $roleHierarchy[$requiredRole]) {
        jsonResponse(false, 'Insufficient permissions', null, 403);
    }
}

// Function to cleanup expired pending reservations (older than 24 hours)
function cleanupPendingReservations($conn) {
    // We use MySQL's NOW() to ensure we compare apples to apples in the same timezone
    // Using a 24-hour window for better user experience during testing
    
    // Select expired pending reservations
    $stmt = $conn->prepare("
        SELECT reservation_id, room_id 
        FROM reservations 
        WHERE status = 'PENDING' AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
    ");
    $stmt->execute();
    $result = $stmt->get_result();
    
    $expiredIds = [];
    while ($row = $result->fetch_assoc()) {
        $expiredIds[] = $row['reservation_id'];
    }
    $stmt->close();
    
    if (!empty($expiredIds)) {
        // Update status to CANCELLED
        $idsStr = implode(',', $expiredIds);
        $conn->query("UPDATE reservations SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE reservation_id IN ($idsStr)");
        
        // Ensure rooms are AVAILABLE
        $conn->query("
            UPDATE rooms 
            SET status = 'AVAILABLE' 
            WHERE room_id IN (
                SELECT room_id FROM reservations WHERE reservation_id IN ($idsStr)
            )
        ");
    }
}

// Function to log errors or activities
function writeLog($message, $type = 'INFO') {
    $logFile = __DIR__ . '/../logs/app.log';
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] [$type] $message" . PHP_EOL;
    error_log($logMessage, 3, $logFile);
}

// Function to send email
function sendEmail($to, $subject, $body) {
    if (!defined('SMTP_FROM_EMAIL')) {
        require_once __DIR__ . '/../config/secrets.php';
    }
    
    $headers = "From: " . SMTP_FROM_NAME . " <" . SMTP_FROM_EMAIL . ">\r\n";
    $headers .= "Reply-To: " . SMTP_FROM_EMAIL . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    
    writeLog("Email sending attempt to $to: $subject", "MAIL");
    
    // On many local hosts, mail() is disabled. On InfinityFree, it works for internal/verified domains.
    // We return success if mail() returns true, but we still log the content just in case.
    $formatedBody = "
    <html>
    <body style='font-family: Arial, sans-serif;'>
        <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;'>
            <h2 style='color: #2c3e50;'>" . SMTP_FROM_NAME . "</h2>
            $body
            <hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;'>
            <p style='font-size: 12px; color: #7f8c8d;'>This is an automated message. Please do not reply.</p>
        </div>
    </body>
    </html>";
    
    $result = @mail($to, $subject, $formatedBody, $headers);
    
    if (!$result) {
        writeLog("Warning: mail() function failed for $to", "WARN");
    }
    
    return $result;
}
?>