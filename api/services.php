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
        $serviceId = $_GET['id'] ?? null;
        $category = $_GET['category'] ?? null;
        $available = $_GET['available'] ?? null;
        
        if ($serviceId) {
            // Get single service by ID
            $stmt = $conn->prepare("SELECT * FROM services WHERE service_id = ?");
            $stmt->bind_param("i", $serviceId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $service = $result->fetch_assoc();
                jsonResponse(true, 'Service found', $service);
            } else {
                jsonResponse(false, 'Service not found');
            }
            
            $stmt->close();
        } elseif ($category) {
            // Get services by category
            $stmt = $conn->prepare("SELECT * FROM services WHERE category = ? ORDER BY service_name");
            $stmt->bind_param("s", $category);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $services = [];
            while ($row = $result->fetch_assoc()) {
                $services[] = $row;
            }
            
            jsonResponse(true, 'Services found', $services);
            $stmt->close();
        } elseif ($available === 'true') {
            // Get active services (you can add status field to services table)
            $result = $conn->query("SELECT * FROM services ORDER BY service_name");
            
            $services = [];
            while ($row = $result->fetch_assoc()) {
                $services[] = $row;
            }
            
            jsonResponse(true, 'Available services found', $services);
        } else {
            // Get all services
            $result = $conn->query("SELECT * FROM services ORDER BY category, service_name");
            
            $services = [];
            while ($row = $result->fetch_assoc()) {
                $services[] = $row;
            }
            
            jsonResponse(true, 'Services found', $services);
        }
        break;
        
    case 'POST':
        // Create new service (requires authentication)
        requireRole('MANAGER');
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        $serviceName = sanitizeInput($data['service_name'] ?? '');
        $description = sanitizeInput($data['description'] ?? '');
        $price = $data['price'] ?? 0;
        $category = sanitizeInput($data['category'] ?? 'General');
        
        if (empty($serviceName) || $price <= 0) {
            jsonResponse(false, 'Required fields: service_name, price');
        }
        
        $stmt = $conn->prepare("
            INSERT INTO services (service_name, description, price, category) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->bind_param("ssds", $serviceName, $description, $price, $category);
        
        if ($stmt->execute()) {
            $serviceId = $stmt->insert_id;
            jsonResponse(true, 'Service created successfully', ['service_id' => $serviceId]);
        } else {
            jsonResponse(false, 'Failed to create service: ' . $conn->error);
        }
        
        $stmt->close();
        break;
        
    case 'PUT':
        // Update service (requires authentication)
        requireRole('MANAGER');
        
        $serviceId = $_GET['id'] ?? null;
        if (!$serviceId) {
            jsonResponse(false, 'Service ID required');
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        $updates = [];
        $params = [];
        $types = '';
        
        if (isset($data['service_name'])) {
            $updates[] = "service_name = ?";
            $params[] = sanitizeInput($data['service_name']);
            $types .= 's';
        }
        
        if (isset($data['description'])) {
            $updates[] = "description = ?";
            $params[] = sanitizeInput($data['description']);
            $types .= 's';
        }
        
        if (isset($data['price'])) {
            $updates[] = "price = ?";
            $params[] = $data['price'];
            $types .= 'd';
        }
        
        if (isset($data['category'])) {
            $updates[] = "category = ?";
            $params[] = sanitizeInput($data['category']);
            $types .= 's';
        }
        
        if (empty($updates)) {
            jsonResponse(false, 'No data to update');
        }
        
        $params[] = $serviceId;
        $types .= 'i';
        
        $sql = "UPDATE services SET " . implode(', ', $updates) . " WHERE service_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        
        if ($stmt->execute()) {
            jsonResponse(true, 'Service updated successfully');
        } else {
            jsonResponse(false, 'Failed to update service: ' . $conn->error);
        }
        
        $stmt->close();
        break;
        
    case 'DELETE':
        // Delete service (requires authentication)
        requireRole('MANAGER');
        
        $serviceId = $_GET['id'] ?? null;
        if (!$serviceId) {
            jsonResponse(false, 'Service ID required');
        }
        
        // Check if service is used in any bookings
        $checkStmt = $conn->prepare("SELECT booking_service_id FROM booking_services WHERE service_id = ? LIMIT 1");
        $checkStmt->bind_param("i", $serviceId);
        $checkStmt->execute();
        $checkStmt->store_result();
        
        if ($checkStmt->num_rows > 0) {
            $checkStmt->close();
            jsonResponse(false, 'Cannot delete service: It is being used in bookings');
        }
        $checkStmt->close();
        
        $stmt = $conn->prepare("DELETE FROM services WHERE service_id = ?");
        $stmt->bind_param("i", $serviceId);
        
        if ($stmt->execute()) {
            jsonResponse(true, 'Service deleted successfully');
        } else {
            jsonResponse(false, 'Failed to delete service: ' . $conn->error);
        }
        
        $stmt->close();
        break;
        
    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

closeDBConnection($conn);
?>