<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../includes/auth_functions.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'register':
                $data = json_decode(file_get_contents('php://input'), true);
                
                $username = sanitizeInput($data['username'] ?? '');
                $password = $data['password'] ?? '';
                $email = sanitizeInput($data['email'] ?? '');
                $fullName = sanitizeInput($data['full_name'] ?? '');
                $phone = sanitizeInput($data['phone'] ?? '');
                $userRole = 'CLIENT';
                
                if (empty($username) || empty($password) || empty($email) || empty($fullName)) {
                    jsonResponse(false, 'All required fields must be filled');
                }
                
                if (!validateInput($email, 'email')) {
                    jsonResponse(false, 'Invalid email address');
                }
                
                $result = registerUser($username, $password, $email, $fullName, $phone, $userRole);
                jsonResponse($result['success'], $result['message'], $result['data'] ?? null);
                break;
                
            case 'login':
                $data = json_decode(file_get_contents('php://input'), true);
                
                $username = sanitizeInput($data['username'] ?? '');
                $password = $data['password'] ?? '';
                
                if (empty($username) || empty($password)) {
                    jsonResponse(false, 'Username and password are required');
                }
                
                $result = loginUser($username, $password);
                jsonResponse($result['success'], $result['message'], $result['data'] ?? null);
                break;
                
            case 'google-login':
            case 'facebook-login':
                $data = json_decode(file_get_contents('php://input'), true);
                $provider = ($action === 'google-login') ? 'google' : 'facebook';
                
                $socialId = $data['id'] ?? '';
                $email = sanitizeInput($data['email'] ?? '');
                $fullName = sanitizeInput($data['full_name'] ?? '');
                
                if (empty($socialId) || empty($email)) {
                    jsonResponse(false, 'Missing social login data');
                }
                
                $result = loginWithSocial($provider, $socialId, $email, $fullName);
                jsonResponse($result['success'], $result['message'], $result['data'] ?? null);
                break;
                
            case 'logout':
                $result = logoutUser();
                jsonResponse($result['success'], $result['message']);
                break;
                
            default:
                jsonResponse(false, 'Invalid action');
        }
        break;
        
    case 'GET':
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'profile':
                if (session_status() === PHP_SESSION_NONE) {
                    session_start();
                }
                if (!isset($_SESSION['user_id'])) {
                    jsonResponse(false, 'Not authenticated', null, 401);
                }
                
                $result = getUserProfile($_SESSION['user_id']);
                jsonResponse($result['success'], $result['message'], $result['data'] ?? null);
                break;
                
            default:
                jsonResponse(false, 'Invalid action');
        }
        break;
        
    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}
?>