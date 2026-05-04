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
        $roomId = $_GET['id'] ?? null;
        $status = $_GET['status'] ?? null;
        $type = $_GET['type'] ?? null;
        $checkIn = $_GET['checkIn'] ?? null;
        $checkOut = $_GET['checkOut'] ?? null;
        
        if ($roomId) {
            // Get single room by ID
            $stmt = $conn->prepare("SELECT * FROM rooms WHERE room_id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $room = $result->fetch_assoc();
                jsonResponse(true, 'Room found', $room);
            } else {
                jsonResponse(false, 'Room not found');
            }
            
            $stmt->close();
        } elseif ($status) {
            // Get rooms by status
            $stmt = $conn->prepare("SELECT * FROM rooms WHERE status = ?");
            $stmt->bind_param("s", $status);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $rooms = [];
            while ($row = $result->fetch_assoc()) {
                $rooms[] = $row;
            }
            
            jsonResponse(true, 'Rooms found', $rooms);
            $stmt->close();
        } elseif ($type) {
            // Get rooms by type
            $stmt = $conn->prepare("SELECT * FROM rooms WHERE room_type = ?");
            $stmt->bind_param("s", $type);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $rooms = [];
            while ($row = $result->fetch_assoc()) {
                $rooms[] = $row;
            }
            
            jsonResponse(true, 'Rooms found', $rooms);
            $stmt->close();
        } elseif ($checkIn && $checkOut) {
            // Get available rooms for dates
            $stmt = $conn->prepare("
                SELECT r.* FROM rooms r
                WHERE r.status = 'AVAILABLE'
                AND r.room_id NOT IN (
                    SELECT room_id FROM reservations 
                    WHERE (
                        (check_in_date <= ? AND check_out_date >= ?) OR
                        (check_in_date <= ? AND check_out_date >= ?) OR
                        (check_in_date >= ? AND check_out_date <= ?)
                    )
                    AND status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
                )
            ");
            $stmt->bind_param("ssssss", $checkOut, $checkIn, $checkIn, $checkOut, $checkIn, $checkOut);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $rooms = [];
            while ($row = $result->fetch_assoc()) {
                $rooms[] = $row;
            }
            
            jsonResponse(true, 'Available rooms found', $rooms);
            $stmt->close();
        } else {
            // Get all rooms
            $result = $conn->query("SELECT * FROM rooms ORDER BY room_number");
            
            $rooms = [];
            while ($row = $result->fetch_assoc()) {
                $rooms[] = $row;
            }
            
            jsonResponse(true, 'Rooms found', $rooms);
        }
        break;
        
    case 'POST':
        // Create new room (requires authentication)
        requireRole('MANAGER');
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        $roomNumber = sanitizeInput($data['room_number'] ?? '');
        $roomType = sanitizeInput($data['room_type'] ?? '');
        $description = sanitizeInput($data['description'] ?? '');
        $price = $data['price_per_night'] ?? 0;
        $capacity = $data['capacity'] ?? 1;
        $amenities = sanitizeInput($data['amenities'] ?? '');
        $status = sanitizeInput($data['status'] ?? 'AVAILABLE');
        
        if (empty($roomNumber) || empty($roomType) || $price <= 0) {
            jsonResponse(false, 'Required fields: room_number, room_type, price_per_night');
        }
        
        $stmt = $conn->prepare("INSERT INTO rooms (room_number, room_type, description, price_per_night, capacity, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssdiss", $roomNumber, $roomType, $description, $price, $capacity, $amenities, $status);
        
        if ($stmt->execute()) {
            $roomId = $stmt->insert_id;
            jsonResponse(true, 'Room created successfully', ['room_id' => $roomId]);
        } else {
            jsonResponse(false, 'Failed to create room: ' . $conn->error);
        }
        
        $stmt->close();
        break;
        
    case 'PUT':
        // Update room (requires authentication)
        // RECEPTION can only update status; MANAGER can update everything
        requireAuth();
        $userRole = getUserRole();
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        if ($userRole === 'RECEPTION') {
            // Reception can only change room status
            if (!isset($data['status']) || count($data) > 1) {
                jsonResponse(false, 'Reception staff can only update room status', null, 403);
            }
        } else {
            requireRole('MANAGER');
        }
        
        $roomId = $_GET['id'] ?? null;
        if (!$roomId) {
            jsonResponse(false, 'Room ID required');
        }
        
        
        
        $updates = [];
        $params = [];
        $types = '';
        
        if (isset($data['room_number'])) {
            $updates[] = "room_number = ?";
            $params[] = sanitizeInput($data['room_number']);
            $types .= 's';
        }
        
        if (isset($data['room_type'])) {
            $updates[] = "room_type = ?";
            $params[] = sanitizeInput($data['room_type']);
            $types .= 's';
        }
        
        if (isset($data['description'])) {
            $updates[] = "description = ?";
            $params[] = sanitizeInput($data['description']);
            $types .= 's';
        }
        
        if (isset($data['price_per_night'])) {
            $updates[] = "price_per_night = ?";
            $params[] = $data['price_per_night'];
            $types .= 'd';
        }
        
        if (isset($data['capacity'])) {
            $updates[] = "capacity = ?";
            $params[] = $data['capacity'];
            $types .= 'i';
        }
        
        if (isset($data['amenities'])) {
            $updates[] = "amenities = ?";
            $params[] = sanitizeInput($data['amenities']);
            $types .= 's';
        }
        
        if (isset($data['status'])) {
            $updates[] = "status = ?";
            $params[] = sanitizeInput($data['status']);
            $types .= 's';
        }
        
        if (empty($updates)) {
            jsonResponse(false, 'No data to update');
        }
        
        $params[] = $roomId;
        $types .= 'i';
        
        $sql = "UPDATE rooms SET " . implode(', ', $updates) . " WHERE room_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        
        if ($stmt->execute()) {
            jsonResponse(true, 'Room updated successfully');
        } else {
            jsonResponse(false, 'Failed to update room: ' . $conn->error);
        }
        
        $stmt->close();
        break;
        
    case 'DELETE':
        // Delete room (requires authentication)
        requireRole('MANAGER');
        
        $roomId = $_GET['id'] ?? null;
        if (!$roomId) {
            jsonResponse(false, 'Room ID required');
        }
        
        // Start transaction
        $conn->begin_transaction();
        
        try {
            // Get all reservation IDs for this room
            $resStmt = $conn->prepare("SELECT reservation_id FROM reservations WHERE room_id = ?");
            $resStmt->bind_param("i", $roomId);
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
                $conn->query("DELETE FROM reservations WHERE room_id = $roomId");
            }
            
            // Delete room
            $stmt = $conn->prepare("DELETE FROM rooms WHERE room_id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            
            if ($stmt->affected_rows > 0) {
                $conn->commit();
                jsonResponse(true, 'Room deleted successfully');
            } else {
                $conn->rollback();
                jsonResponse(false, 'Room not found or deletion failed');
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