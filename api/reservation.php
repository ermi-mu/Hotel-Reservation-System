<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../includes/functions.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

// Check authentication
requireAuth();

$userId = $_SESSION['user_id'];
$userRole = $_SESSION['user_role'];

// Cleanup expired pending reservations
cleanupPendingReservations($conn);

switch ($method) {
    case 'GET':
        $resId = $_GET['id'] ?? null;
        $status = $_GET['status'] ?? null;
        
        if ($resId) {
            // Get single reservation (require admin/reception or self)
            $stmt = $conn->prepare("
                SELECT r.*, rm.room_number, rm.room_type, u.full_name, u.email 
                FROM reservations r
                JOIN rooms rm ON r.room_id = rm.room_id
                JOIN users u ON r.user_id = u.user_id
                WHERE r.reservation_id = ?
            ");
            $stmt->bind_param("i", $resId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $reservation = $result->fetch_assoc();
                
                // Permission check
                if ($reservation['user_id'] != $userId && !in_array($userRole, ['ADMIN', 'MANAGER', 'RECEPTION'])) {
                    jsonResponse(false, 'Insufficient permissions', null, 403);
                }
                
                jsonResponse(true, 'Reservation found', $reservation);
            } else {
                jsonResponse(false, 'Reservation not found');
            }
            $stmt->close();
        } else {
            // Get multiple reservations
            $sql = "
                SELECT r.*, rm.room_number, rm.room_type, u.full_name 
                FROM reservations r
                JOIN rooms rm ON r.room_id = rm.room_id
                JOIN users u ON r.user_id = u.user_id
            ";
            
            $where = [];
            $params = [];
            $types = "";
            
            // If client, only show their own
            if ($userRole == 'CLIENT') {
                $where[] = "r.user_id = ?";
                $params[] = $userId;
                $types .= "i";
            } elseif ($status) {
                $where[] = "r.status = ?";
                $params[] = $status;
                $types .= "s";
            }
            
            if (!empty($where)) {
                $sql .= " WHERE " . implode(" AND ", $where);
            }
            
            $sql .= " ORDER BY r.created_at DESC";
            
            $limit = intval($_GET['limit'] ?? 0);
            if ($limit > 0) {
                $sql .= " LIMIT " . $limit;
            }
            
            $stmt = $conn->prepare($sql);
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            
            $reservations = [];
            while ($row = $result->fetch_assoc()) {
                $reservations[] = $row;
            }
            
            jsonResponse(true, 'Reservations retrieved', $reservations);
            $stmt->close();
        }
        break;
        
    case 'POST':
        // Create new reservation
        $data = json_decode(file_get_contents('php://input'), true);
        
        $roomId = $data['room_id'] ?? null;
        $checkIn = $data['check_in_date'] ?? null;
        $checkOut = $data['check_out_date'] ?? null;
        $guests = $data['guests'] ?? 1;
        $specialRequests = $data['special_requests'] ?? '';
        
        if (!$roomId || !$checkIn || !$checkOut) {
            jsonResponse(false, 'Missing required fields: room_id, check_in_date, check_out_date');
        }
        
        if (strtotime($checkIn) >= strtotime($checkOut)) {
            jsonResponse(false, 'Check-out date must be after check-in date');
        }
        
        // Calculate total price
        $stmt = $conn->prepare("SELECT price_per_night FROM rooms WHERE room_id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $roomResult = $stmt->get_result();
        
        if ($roomResult->num_rows == 0) {
            jsonResponse(false, 'Room not found');
        }
        
        $room = $roomResult->fetch_assoc();
        $date1 = new DateTime($checkIn);
        $date2 = new DateTime($checkOut);
        $nights = $date2->diff($date1)->format("%a");
        if ($nights <= 0) $nights = 1; // Minimum 1 night charge
        $totalPrice = $room['price_per_night'] * $nights;
        
        $stmt->close();
        
        // Check if room is already booked for these dates
        $stmt = $conn->prepare("
            SELECT reservation_id FROM reservations 
            WHERE room_id = ? 
            AND status NOT IN ('CANCELLED', 'CHECKED_OUT')
            AND (
                (check_in_date <= ? AND check_out_date >= ?) OR
                (check_in_date <= ? AND check_out_date >= ?) OR
                (check_in_date >= ? AND check_out_date <= ?)
            )
        ");
        $stmt->bind_param("issssss", $roomId, $checkOut, $checkIn, $checkIn, $checkOut, $checkIn, $checkOut);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            jsonResponse(false, 'Room is already booked for the selected dates');
        }
        $stmt->close();
        
        // Insert reservation
        $stmt = $conn->prepare("
            INSERT INTO reservations (user_id, room_id, check_in_date, check_out_date, guests, special_requests, total_price, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
        ");
        $stmt->bind_param("iissisd", $userId, $roomId, $checkIn, $checkOut, $guests, $specialRequests, $totalPrice);
        
        if ($stmt->execute()) {
            jsonResponse(true, 'Reservation created successfully', ['reservation_id' => $stmt->insert_id]);
        } else {
            jsonResponse(false, 'Failed to create reservation: ' . $conn->error);
        }
        $stmt->close();
        break;
        
    case 'PUT':
        // Update reservation status (cancel or check-in/out)
        $resId = $_GET['id'] ?? null;
        $data = json_decode(file_get_contents('php://input'), true);
        $newStatus = $data['status'] ?? null;
        
        if (!$resId || !$newStatus) {
            jsonResponse(false, 'Missing reservation ID or status');
        }
        
        // Permission check
        $stmt = $conn->prepare("SELECT user_id, status FROM reservations WHERE reservation_id = ?");
        $stmt->bind_param("i", $resId);
        $stmt->execute();
        $resQueryResult = $stmt->get_result();
        $res = $resQueryResult->fetch_assoc();
        
        if (!$res) {
            jsonResponse(false, 'Reservation not found');
        }
        
        if ($res['user_id'] != $userId && !in_array($userRole, ['ADMIN', 'MANAGER', 'RECEPTION'])) {
            jsonResponse(false, 'Insufficient permissions', null, 403);
        }
        
        // Clients can only cancel PENDING/CONFIRMED reservations
        if ($userRole == 'CLIENT' && $newStatus != 'CANCELLED') {
           jsonResponse(false, 'Clients can only cancel reservations', null, 403);
        }
        
        $stmt = $conn->prepare("UPDATE reservations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE reservation_id = ?");
        $stmt->bind_param("si", $newStatus, $resId);
        
        if ($stmt->execute()) {
            // If checked in or out, update room status
            if ($newStatus == 'CHECKED_IN') {
                 $conn->query("UPDATE rooms SET status = 'OCCUPIED' WHERE room_id = (SELECT room_id FROM reservations WHERE reservation_id = $resId)");
            } elseif ($newStatus == 'CHECKED_OUT' || $newStatus == 'CANCELLED') {
                 $conn->query("UPDATE rooms SET status = 'AVAILABLE' WHERE room_id = (SELECT room_id FROM reservations WHERE reservation_id = $resId)");
            }
            
            jsonResponse(true, 'Reservation updated successfully');
        } else {
            jsonResponse(false, 'Failed to update reservation: ' . $conn->error);
        }
        $stmt->close();
        break;

    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

closeDBConnection($conn);
?>