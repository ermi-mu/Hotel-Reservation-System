<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../includes/auth_functions.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($method !== 'POST') {
    jsonResponse(false, 'Method not allowed', null, 405);
}

$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    case 'request-otp':
        $email = sanitizeInput($data['email'] ?? '');
        if (empty($email)) {
            jsonResponse(false, 'Email is required');
        }
        
        $result = generatePasswordResetOTP($email);
        jsonResponse($result['success'], $result['message']);
        break;
        
    case 'reset-password':
        $email = sanitizeInput($data['email'] ?? '');
        $otp = sanitizeInput($data['otp'] ?? '');
        $newPassword = $data['new_password'] ?? '';
        
        if (empty($email) || empty($otp) || empty($newPassword)) {
            jsonResponse(false, 'Email, OTP, and new password are required');
        }
        
        $result = resetPasswordWithOTP($email, $otp, $newPassword);
        jsonResponse($result['success'], $result['message']);
        break;
        
    default:
        jsonResponse(false, 'Invalid action');
}
?>
