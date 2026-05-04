<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../includes/functions.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

switch ($method) {
    case 'GET':
        $userId = $_GET['id'] ?? null;
        $role = $_GET['role'] ?? null;
        $action = $_GET['action'] ?? '';
        
        // Check authentication
        requireAuth();
        
        switch ($action) {
            case 'roles':
                // Get all user roles
                $roles = ['CLIENT', 'RECEPTION', 'MANAGER', 'ADMIN'];
                jsonResponse(true, 'User roles retrieved', $roles);
                break;
                
            default:
                if ($userId) {
                    // Get single user by ID (require admin/manager or self)
                    $currentUserId = $_SESSION['user_id'];
                    $currentUserRole = $_SESSION['user_role'];
                    
                    if ($userId != $currentUserId && !in_array($currentUserRole, ['ADMIN', 'MANAGER', 'RECEPTION'])) {
                        jsonResponse(false, 'Insufficient permissions', null, 403);
                    }
                  
                    $stmt = $conn->prepare("
                        SELECT user_id, username, email, full_name, phone, user_role, created_at, updated_at 
                        FROM users WHERE user_id = ?
                    ");
                    $stmt->bind_param("i", $userId);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    if ($result->num_rows > 0) {
                        $user = $result->fetch_assoc();
                        jsonResponse(true, 'User found', $user);
                    } else {
                        jsonResponse(false, 'User not found');
                    }
                    
                    $stmt->close();
                } elseif ($role) {
                    // Get users by role (require receptionist or manager)
                    requireRole('RECEPTION');
                  
                    $stmt = $conn->prepare("
                        SELECT user_id, username, email, full_name, phone, user_role, created_at 
                        FROM users WHERE user_role = ? 
                        ORDER BY created_at DESC
                    ");
                    $stmt->bind_param("s", $role);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    $users = [];
                    while ($row = $result->fetch_assoc()) {
                        $users[] = $row;
                    }
                    
                    jsonResponse(true, 'Users found', $users);
                    $stmt->close();
                } else {
                    // Get all users (require receptionist or manager)
                    requireRole('RECEPTION');
                    
                    $page = max(1, intval($_GET['page'] ?? 1));
                    $limit = min(50, max(10, intval($_GET['limit'] ?? 20)));
                    $offset = ($page - 1) * $limit;
                    
                    // Get total count
                    $countResult = $conn->query("SELECT COUNT(*) as total FROM users");
                    $total = $countResult->fetch_assoc()['total'];
                    
                    // Get users with pagination
                    $stmt = $conn->prepare("
                        SELECT user_id, username, email, full_name, phone, user_role, created_at 
                        FROM users 
                        ORDER BY created_at DESC 
                        LIMIT ? OFFSET ?
                    ");
                    $stmt->bind_param("ii", $limit, $offset);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    $users = [];
                    while ($row = $result->fetch_assoc()) {
                        $users[] = $row;
                    }
                    
                    $responseData = [
                        'users' => $users,
                        'pagination' => [
                            'page' => $page,
                            'limit' => $limit,
                            'total' => $total,
                            'pages' => ceil($total / $limit)
                        ]
                    ];
                    
                    jsonResponse(true, 'Users retrieved', $responseData);
                    $stmt->close();
                }
        }
        break;
        
    case 'POST':
        // Create user (admin only)
        requireRole('ADMIN');
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        $username = sanitizeInput($data['username'] ?? '');
        $password = $data['password'] ?? '';
        $email = sanitizeInput($data['email'] ?? '');
        $fullName = sanitizeInput($data['full_name'] ?? '');
        $phone = sanitizeInput($data['phone'] ?? '');
        $userRole = sanitizeInput($data['user_role'] ?? 'CLIENT');
        
        if (empty($username) || empty($password) || empty($email) || empty($fullName)) {
            jsonResponse(false, 'All required fields must be filled');
        }
        
        if (!validateInput($email, 'email')) {
            jsonResponse(false, 'Invalid email address');
        }
        
        // Check if username or email already exists
        $stmt = $conn->prepare("SELECT user_id FROM users WHERE username = ? OR email = ?");
        $stmt->bind_param("ss", $username, $email);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows > 0) {
            $stmt->close();
            jsonResponse(false, 'Username or email already exists');
        }
        
        // Hash password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // Insert user
        $stmt = $conn->prepare("
            INSERT INTO users (username, password, email, full_name, phone, user_role) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("ssssss", $username, $hashedPassword, $email, $fullName, $phone, $userRole);
        
        if ($stmt->execute()) {
            $userId = $stmt->insert_id;
            $stmt->close();
            
            // Get created user
            $stmt = $conn->prepare("
                SELECT user_id, username, email, full_name, phone, user_role, created_at 
                FROM users WHERE user_id = ?
            ");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            
            jsonResponse(true, 'User created successfully', $user);
        } else {
            jsonResponse(false, 'Failed to create user: ' . $conn->error);
        }
        
        $stmt->close();
        break;
        
    case 'PUT':
        // Update user (admin/manager or self)
        requireAuth();
        
        $userId = $_GET['id'] ?? null;
        if (!$userId) {
            jsonResponse(false, 'User ID required');
        }
        
        $currentUserId = $_SESSION['user_id'];
        $currentUserRole = $_SESSION['user_role'];
        
        // Check permissions
        if ($userId != $currentUserId && !in_array($currentUserRole, ['ADMIN', 'MANAGER'])) {
            jsonResponse(false, 'Insufficient permissions', null, 403);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Only admin can change user role
        if (isset($data['user_role']) && $currentUserRole != 'ADMIN') {
            unset($data['user_role']);
        }
        
        // Regular users can only update their own profile with limited fields
        if ($userId == $currentUserId && !in_array($currentUserRole, ['ADMIN', 'MANAGER'])) {
            $allowedFields = ['full_name', 'email', 'phone', 'password'];
            foreach ($data as $key => $value) {
                if (!in_array($key, $allowedFields)) {
                    unset($data[$key]);
                }
            }
        }
        
        $updates = [];
        $params = [];
        $types = '';
        
        if (isset($data['full_name'])) {
            $updates[] = "full_name = ?";
            $params[] = sanitizeInput($data['full_name']);
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
                jsonResponse(false, 'Email already exists');
            }
            $checkStmt->close();
            
            $updates[] = "email = ?";
            $params[] = sanitizeInput($data['email']);
            $types .= 's';
        }
        
        if (isset($data['phone'])) {
            $updates[] = "phone = ?";
            $params[] = sanitizeInput($data['phone']);
            $types .= 's';
        }
        
        if (isset($data['user_role']) && in_array($currentUserRole, ['ADMIN'])) {
            $updates[] = "user_role = ?";
            $params[] = sanitizeInput($data['user_role']);
            $types .= 's';
        }
        
        if (isset($data['password']) && !empty($data['password'])) {
            // If updating another user's password, require admin role
            if ($userId != $currentUserId && !in_array($currentUserRole, ['ADMIN', 'MANAGER'])) {
                jsonResponse(false, 'Cannot update other user password', null, 403);
            }
            
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            $updates[] = "password = ?";
            $params[] = $hashedPassword;
            $types .= 's';
        }
        
        if (empty($updates)) {
            jsonResponse(false, 'No data to update');
        }
        
        $params[] = $userId;
        $types .= 'i';
        
        $sql = "UPDATE users SET " . implode(', ', $updates) . ", updated_at = CURRENT_TIMESTAMP WHERE user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        
        if ($stmt->execute()) {
            // Get updated user
            $stmt = $conn->prepare("
                SELECT user_id, username, email, full_name, phone, user_role, created_at, updated_at 
                FROM users WHERE user_id = ?
            ");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            
            jsonResponse(true, 'User updated successfully', $user);
        } else {
            jsonResponse(false, 'Failed to update user: ' . $conn->error);
        }
        
        $stmt->close();
        break;
        
    case 'DELETE':
        // Delete user (admin only)
        requireRole('ADMIN');
        
        $userId = $_GET['id'] ?? null;
        if (!$userId) {
            jsonResponse(false, 'User ID required');
        }
        
        // Cannot delete self
        if ($userId == $_SESSION['user_id']) {
            jsonResponse(false, 'Cannot delete your own account');
        }
        
        // Start transaction
        $conn->begin_transaction();
        
        try {
            // Get all reservation IDs for this user
            $resStmt = $conn->prepare("SELECT reservation_id FROM reservations WHERE user_id = ?");
            $resStmt->bind_param("i", $userId);
            $resStmt->execute();
            $resResult = $resStmt->get_result();
            $reservationIds = [];
            while ($row = $resResult->fetch_assoc()) {
                $reservationIds[] = $row['reservation_id'];
            }
            $resStmt->close();

            if (!empty($reservationIds)) {
                $idsList = implode(',', $reservationIds);
                
                // Delete booking services
                $conn->query("DELETE FROM booking_services WHERE reservation_id IN ($idsList)");
                
                // Delete payments
                $conn->query("DELETE FROM payments WHERE reservation_id IN ($idsList)");
                
                // Delete reservations
                $conn->query("DELETE FROM reservations WHERE user_id = $userId");
            }
            
            // Delete user
            $stmt = $conn->prepare("DELETE FROM users WHERE user_id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            
            if ($stmt->affected_rows > 0) {
                $conn->commit();
                jsonResponse(true, 'User deleted successfully');
            } else {
                $conn->rollback();
                jsonResponse(false, 'User not found or deletion failed');
            }
            
            $stmt->close();
        } catch (Exception $e) {
            $conn->rollback();
            jsonResponse(false, 'Deletion failed: ' . $e->getMessage());
        }
        break;
        
    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

closeDBConnection($conn);
?>