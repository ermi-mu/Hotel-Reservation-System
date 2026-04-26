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

switch ($method) {
    case 'GET':
        $reservationId = $_GET['reservation_id'] ?? null;
        
        if ($reservationId) {
            // Get services for a specific reservation
            $stmt = $conn->prepare("
                SELECT bs.*, s.service_name 
                FROM booking_services bs
                JOIN services s ON bs.service_id = s.service_id
                WHERE bs.reservation_id = ?
            ");
            $stmt->bind_param("i", $reservationId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $services = [];
            while ($row = $result->fetch_assoc()) {
                $services[] = $row;
            }
            
            jsonResponse(true, 'Services retrieved', $services);
            $stmt->close();
        } else {
            // Get recent active service requests across all reservations (for Reception/Manager Dashboard)
            if (!in_array($userRole, ['ADMIN', 'MANAGER', 'RECEPTION'])) {
                jsonResponse(false, 'Insufficient permissions to view all service requests', null, 403);
            }

            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;

            $stmt = $conn->prepare("
                SELECT bs.*, s.service_name, r.room_id, rm.room_number 
                FROM booking_services bs
                JOIN services s ON bs.service_id = s.service_id
                JOIN reservations r ON bs.reservation_id = r.reservation_id
                LEFT JOIN rooms rm ON r.room_id = rm.room_id
                ORDER BY bs.booking_service_id DESC
                LIMIT ?
            ");
            $stmt->bind_param("i", $limit);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $requests = [];
            while ($row = $result->fetch_assoc()) {
                $requests[] = $row;
            }
            
            jsonResponse(true, 'Active service requests retrieved', $requests);
            $stmt->close();
        }
        break;
        
    case 'POST':
        // Add services to a reservation
        $data = json_decode(file_get_contents('php://input'), true);
        $reservationId = $data['reservation_id'] ?? null;
        $services = $data['services'] ?? []; // Array of { service_id, quantity, price }
        
        if (!$reservationId || empty($services)) {
            jsonResponse(false, 'Missing required fields: reservation_id or services array');
        }

        if (!in_array($userRole, ['ADMIN', 'MANAGER', 'RECEPTION'])) {
            if ($userRole === 'CLIENT') {
                $stmt = $conn->prepare("SELECT user_id, status FROM reservations WHERE reservation_id = ?");
                $stmt->bind_param("i", $reservationId);
                $stmt->execute();
                $res = $stmt->get_result()->fetch_assoc();
                $stmt->close();
                
                if (!$res || $res['user_id'] != $userId || $res['status'] !== 'CHECKED_IN') {
                    jsonResponse(false, 'Cannot add services. You must be checked in to order services for this reservation.', null, 403);
                }
            } else {
                jsonResponse(false, 'Insufficient permissions', null, 403);
            }
        }
        
        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("
                INSERT INTO booking_services (reservation_id, service_id, quantity, price, status) 
                VALUES (?, ?, ?, ?, 'PENDING')
            ");
            
            foreach ($services as $service) {
                $serviceId = $service['service_id'];
                $quantity = $service['quantity'] ?? 1;
                $price = $service['price']; // Or fetch from DB to be safer
                
                $stmt->bind_param("iiid", $reservationId, $serviceId, $quantity, $price);
                $stmt->execute();
            }
            $stmt->close();
            
            $conn->commit();
            jsonResponse(true, 'Services added successfully');
            
        } catch (Exception $e) {
            $conn->rollback();
            jsonResponse(false, 'Failed to add services: ' . $e->getMessage());
        }
        break;
        
    case 'PUT':
        // Update service request status (e.g. mark as COMPLETED)
        if (!in_array($userRole, ['ADMIN', 'MANAGER', 'RECEPTION'])) {
            jsonResponse(false, 'Insufficient permissions', null, 403);
        }

        $bookingServiceId = $_GET['id'] ?? null;
        $data = json_decode(file_get_contents('php://input'), true);
        $status = $data['status'] ?? null;

        if (!$bookingServiceId || !$status) {
            jsonResponse(false, 'Missing booking_service_id or status');
        }

        // Get current info to check if we should apply charges
        $stmt = $conn->prepare("SELECT reservation_id, service_id, quantity, price, status FROM booking_services WHERE booking_service_id = ?");
        $stmt->bind_param("i", $bookingServiceId);
        $stmt->execute();
        $current = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$current) {
            jsonResponse(false, 'Service request not found');
        }

        $conn->begin_transaction();
        try {
            // Update status
            $stmt = $conn->prepare("UPDATE booking_services SET status = ? WHERE booking_service_id = ?");
            $stmt->bind_param("si", $status, $bookingServiceId);
            $stmt->execute();
            $stmt->close();

            // If changing to COMPLETED from PENDING, apply charges to reservation
            if ($status === 'COMPLETED' && $current['status'] !== 'COMPLETED') {
                $cost = $current['price'] * $current['quantity'];
                $resId = $current['reservation_id'];

                $updateStmt = $conn->prepare("UPDATE reservations SET total_price = total_price + ? WHERE reservation_id = ?");
                $updateStmt->bind_param("di", $cost, $resId);
                $updateStmt->execute();
                $updateStmt->close();
            }

            $conn->commit();
            jsonResponse(true, 'Service status updated successfully');
        } catch (Exception $e) {
            $conn->rollback();
            jsonResponse(false, 'Failed to update service status: ' . $e->getMessage());
        }
        break;

    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

closeDBConnection($conn);
?>
