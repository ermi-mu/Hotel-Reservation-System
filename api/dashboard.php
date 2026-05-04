<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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
        $action = $_GET['action'] ?? '';
        $period = $_GET['period'] ?? 'month'; // today, week, month, year
        
        switch ($action) {
            case 'stats':
                // Get dashboard statistics based on user role
                $stats = [];
                
                if (in_array($userRole, ['ADMIN', 'MANAGER'])) {
                    // Manager/Admin Dashboard Stats
                    $stats = getManagerDashboardStats($conn, $period);
                } elseif ($userRole == 'RECEPTION') {
                    // Reception Dashboard Stats
                    $stats = getReceptionDashboardStats($conn, $period);
                } else {
                    // Client Dashboard Stats
                    $stats = getClientDashboardStats($conn, $userId);
                }
                
                jsonResponse(true, 'Dashboard stats retrieved', $stats);
                break;
                
            case 'today-checkins':
                // Get today's check-ins (for reception)
                if (!in_array($userRole, ['RECEPTION', 'MANAGER', 'ADMIN'])) {
                    jsonResponse(false, 'Insufficient permissions', null, 403);
                }
                
                $today = date('Y-m-d');
                $stmt = $conn->prepare("
                    SELECT r.*, u.full_name, u.email, u.phone, rm.room_number, rm.room_type
                    FROM reservations r
                    JOIN users u ON r.user_id = u.user_id
                    JOIN rooms rm ON r.room_id = rm.room_id
                    WHERE DATE(r.check_in_date) = ?
                    AND r.status IN ('CONFIRMED', 'CHECKED_IN')
                    ORDER BY r.check_in_date
                ");
                $stmt->bind_param("s", $today);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $checkins = [];
                while ($row = $result->fetch_assoc()) {
                    $checkins[] = $row;
                }
                
                jsonResponse(true, "Today's check-ins", $checkins);
                $stmt->close();
                break;
                
            case 'today-checkouts':
                // Get today's check-outs (for reception)
                if (!in_array($userRole, ['RECEPTION', 'MANAGER', 'ADMIN'])) {
                    jsonResponse(false, 'Insufficient permissions', null, 403);
                }
                
                $today = date('Y-m-d');
                $stmt = $conn->prepare("
                    SELECT r.*, u.full_name, u.email, u.phone, rm.room_number, rm.room_type
                    FROM reservations r
                    JOIN users u ON r.user_id = u.user_id
                    JOIN rooms rm ON r.room_id = rm.room_id
                    WHERE DATE(r.check_out_date) = ?
                    AND r.status IN ('CHECKED_IN', 'CHECKED_OUT')
                    ORDER BY r.check_out_date
                ");
                $stmt->bind_param("s", $today);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $checkouts = [];
                while ($row = $result->fetch_assoc()) {
                    $checkouts[] = $row;
                }
                
                jsonResponse(true, "Today's check-outs", $checkouts);
                $stmt->close();
                break;
                
            case 'revenue':
                // Get revenue data (for manager/admin)
                if (!in_array($userRole, ['MANAGER', 'ADMIN'])) {
                    jsonResponse(false, 'Insufficient permissions', null, 403);
                }
                
                $revenueData = getRevenueData($conn, $period);
                jsonResponse(true, 'Revenue data retrieved', $revenueData);
                break;
                
            case 'occupancy':
                // Get occupancy data (for manager/admin)
                if (!in_array($userRole, ['MANAGER', 'ADMIN'])) {
                    jsonResponse(false, 'Insufficient permissions', null, 403);
                }
                
                $occupancyData = getOccupancyData($conn, $period);
                jsonResponse(true, 'Occupancy data retrieved', $occupancyData);
                break;
                
            case 'recent-activity':
                // Get recent activity
                $activity = getRecentActivity($conn, $userId, $userRole);
                jsonResponse(true, 'Recent activity retrieved', $activity);
                break;
                
            default:
                jsonResponse(false, 'Invalid action');
        }
        break;
        
    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

closeDBConnection($conn);

// Helper functions
function getManagerDashboardStats($conn, $period) {
    $today = date('Y-m-d');
    $startDate = getPeriodStartDate($period);
    
    // Total rooms
    $result = $conn->query("SELECT COUNT(*) as total FROM rooms");
    $totalRooms = $result->fetch_assoc()['total'];
    
    // Available rooms
    $result = $conn->query("SELECT COUNT(*) as available FROM rooms WHERE status = 'AVAILABLE'");
    $availableRooms = $result->fetch_assoc()['available'];
    
    // Total reservations
    $result = $conn->query("SELECT COUNT(*) as total_reservations FROM reservations");
    $totalReservations = $result->fetch_assoc()['total_reservations'];
    
    // Active reservations
    $result = $conn->query("SELECT COUNT(*) as active_reservations FROM reservations WHERE status IN ('CONFIRMED', 'CHECKED_IN')");
    $activeReservations = $result->fetch_assoc()['active_reservations'];
    
    // Total revenue
    $result = $conn->query("SELECT COALESCE(SUM(total_price), 0) as total_revenue FROM reservations WHERE status != 'CANCELLED'");
    $totalRevenue = $result->fetch_assoc()['total_revenue'];
    
    // Period revenue
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(total_price), 0) as period_revenue 
        FROM reservations 
        WHERE status != 'CANCELLED' 
        AND created_at >= ?
    ");
    $stmt->bind_param("s", $startDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $periodRevenue = $result->fetch_assoc()['period_revenue'];
    $stmt->close();
    
    // Total users
    $result = $conn->query("SELECT COUNT(*) as total_users FROM users");
    $totalUsers = $result->fetch_assoc()['total_users'];
    
    // New users this period
    $stmt = $conn->prepare("
        SELECT COUNT(*) as new_users 
        FROM users 
        WHERE created_at >= ?
    ");
    $stmt->bind_param("s", $startDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $newUsers = $result->fetch_assoc()['new_users'];
    $stmt->close();
    
    return [
        'totalRooms' => (int)$totalRooms,
        'availableRooms' => (int)$availableRooms,
        'totalReservations' => (int)$totalReservations,
        'totalBookings' => (int)$totalReservations,
        'activeReservations' => (int)$activeReservations,
        'totalRevenue' => (float)$totalRevenue,
        'periodRevenue' => (float)$periodRevenue,
        'totalUsers' => (int)$totalUsers,
        'totalGuests' => (int)$totalUsers,
        'newUsers' => (int)$newUsers,
        'occupancyRate' => $totalRooms > 0 ? round(($totalRooms - $availableRooms) / $totalRooms * 100, 2) : 0,
        'total_rooms' => (int)$totalRooms,
        'available_rooms' => (int)$availableRooms,
        'total_reservations' => (int)$totalReservations,
        'total_bookings' => (int)$totalReservations,
        'total_revenue' => (float)$totalRevenue,
        'total_guests' => (int)$totalUsers,
        'occupancy_rate' => $totalRooms > 0 ? round(($totalRooms - $availableRooms) / $totalRooms * 100, 2) : 0,
        'period' => $period
    ];
}

function getReceptionDashboardStats($conn, $period) {
    $today = date('Y-m-d');
    
    // Today's check-ins
    $stmt = $conn->prepare("
        SELECT COUNT(*) as today_checkins 
        FROM reservations 
        WHERE DATE(check_in_date) = ? 
        AND status IN ('CONFIRMED', 'CHECKED_IN')
    ");
    $stmt->bind_param("s", $today);
    $stmt->execute();
    $result = $stmt->get_result();
    $todayCheckins = $result->fetch_assoc()['today_checkins'];
    $stmt->close();
    
    // Today's check-outs
    $stmt = $conn->prepare("
        SELECT COUNT(*) as today_checkouts 
        FROM reservations 
        WHERE DATE(check_out_date) = ? 
        AND status IN ('CHECKED_IN', 'CHECKED_OUT')
    ");
    $stmt->bind_param("s", $today);
    $stmt->execute();
    $result = $stmt->get_result();
    $todayCheckouts = $result->fetch_assoc()['today_checkouts'];
    $stmt->close();
    
    // Current guests
    $result = $conn->query("
        SELECT COUNT(DISTINCT r.user_id) as current_guests 
        FROM reservations r 
        WHERE r.status = 'CHECKED_IN'
    ");
    $currentGuests = $result->fetch_assoc()['current_guests'];
    
    // Pending reservations
    $result = $conn->query("SELECT COUNT(*) as pending_reservations FROM reservations WHERE status = 'PENDING'");
    $pendingReservations = $result->fetch_assoc()['pending_reservations'];
    
    // Available rooms
    $result = $conn->query("SELECT COUNT(*) as available_rooms FROM rooms WHERE status = 'AVAILABLE'");
    $availableRooms = $result->fetch_assoc()['available_rooms'];
    
    // Occupied rooms
    $result = $conn->query("SELECT COUNT(*) as occupied_rooms FROM rooms WHERE status = 'OCCUPIED'");
    $occupiedRooms = $result->fetch_assoc()['occupied_rooms'];
    
    return [
        'todayCheckIns' => (int)$todayCheckins,
        'todayCheckOuts' => (int)$todayCheckouts,
        'totalGuests' => (int)$currentGuests,
        'pendingReservations' => (int)$pendingReservations,
        'availableRooms' => (int)$availableRooms,
        'occupiedRooms' => (int)$occupiedRooms,
        'today_checkins' => (int)$todayCheckins,
        'today_checkouts' => (int)$todayCheckouts,
        'total_guests' => (int)$currentGuests,
        'pending_reservations' => (int)$pendingReservations,
        'available_rooms' => (int)$availableRooms,
        'occupied_rooms' => (int)$occupiedRooms,
        'date' => $today
    ];
}

function getClientDashboardStats($conn, $userId) {
    // Total reservations
    $stmt = $conn->prepare("SELECT COUNT(*) as total_reservations FROM reservations WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $totalReservations = $result->fetch_assoc()['total_reservations'];
    $stmt->close();
    
    // Upcoming reservations
    $today = date('Y-m-d');
    $stmt = $conn->prepare("
        SELECT COUNT(*) as upcoming_reservations 
        FROM reservations 
        WHERE user_id = ? 
        AND check_in_date >= ? 
        AND status IN ('CONFIRMED', 'PENDING')
    ");
    $stmt->bind_param("is", $userId, $today);
    $stmt->execute();
    $result = $stmt->get_result();
    $upcomingReservations = $result->fetch_assoc()['upcoming_reservations'];
    $stmt->close();
    
    // Current stay
    $stmt = $conn->prepare("
        SELECT COUNT(*) as current_stay 
        FROM reservations 
        WHERE user_id = ? 
        AND status = 'CHECKED_IN'
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $currentStay = $result->fetch_assoc()['current_stay'];
    $stmt->close();
    
    // Total spent
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(total_price), 0) as total_spent 
        FROM reservations 
        WHERE user_id = ? 
        AND status != 'CANCELLED'
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $totalSpent = $result->fetch_assoc()['total_spent'];
    $stmt->close();
    
    // Recent bookings
    $stmt = $conn->prepare("
        SELECT r.*, rm.room_number, rm.room_type 
        FROM reservations r
        JOIN rooms rm ON r.room_id = rm.room_id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
        LIMIT 5
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $recentBookings = [];
    while ($row = $result->fetch_assoc()) {
        $recentBookings[] = $row;
    }
    $stmt->close();
    
    return [
        'totalReservations' => (int)$totalReservations,
        'upcomingReservations' => (int)$upcomingReservations,
        'currentStay' => (int)$currentStay,
        'totalSpent' => (float)$totalSpent,
        'total_reservations' => (int)$totalReservations,
        'upcoming_reservations' => (int)$upcomingReservations,
        'current_stay' => (int)$currentStay,
        'total_spent' => (float)$totalSpent,
        'recentBookings' => $recentBookings,
        'recent_bookings' => $recentBookings
    ];
}

function getRevenueData($conn, $period) {
    $startDate = getPeriodStartDate($period);
    
    // Revenue by day/week/month
    $interval = $period == 'year' ? 'MONTH' : 'DAY';
    
    $query = "
        SELECT 
            DATE(created_at) as date,
            SUM(total_price) as revenue,
            COUNT(*) as bookings
        FROM reservations 
        WHERE status != 'CANCELLED' 
        AND created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY date
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $startDate);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $revenueData = [];
    while ($row = $result->fetch_assoc()) {
        $revenueData[] = $row;
    }
    $stmt->close();
    
    // Revenue by room type
    $query = "
        SELECT 
            rm.room_type,
            COUNT(*) as bookings,
            SUM(r.total_price) as revenue
        FROM reservations r
        JOIN rooms rm ON r.room_id = rm.room_id
        WHERE r.status != 'CANCELLED' 
        AND r.created_at >= ?
        GROUP BY rm.room_type
        ORDER BY revenue DESC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $startDate);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $revenueByType = [];
    while ($row = $result->fetch_assoc()) {
        $revenueByType[] = $row;
    }
    $stmt->close();
    
    return [
        'revenue_trend' => $revenueData,
        'revenue_by_type' => $revenueByType,
        'period' => $period,
        'start_date' => $startDate
    ];
}

function getOccupancyData($conn, $period) {
    $startDate = getPeriodStartDate($period);
    
    // Occupancy rate by day
    $query = "
        SELECT 
            DATE(r.check_in_date) as date,
            COUNT(DISTINCT r.room_id) as occupied_rooms,
            (SELECT COUNT(*) FROM rooms) as total_rooms,
            ROUND((COUNT(DISTINCT r.room_id) * 100.0 / (SELECT COUNT(*) FROM rooms)), 2) as occupancy_rate
        FROM reservations r
        WHERE r.status IN ('CHECKED_IN', 'CONFIRMED')
        AND r.check_in_date >= ?
        GROUP BY DATE(r.check_in_date)
        ORDER BY date
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $startDate);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $occupancyData = [];
    while ($row = $result->fetch_assoc()) {
        $occupancyData[] = $row;
    }
    $stmt->close();
    
    // Occupancy by room type
    $query = "
        SELECT 
            rm.room_type,
            COUNT(DISTINCT r.room_id) as occupied_count,
            (SELECT COUNT(*) FROM rooms WHERE room_type = rm.room_type) as total_count,
            ROUND((COUNT(DISTINCT r.room_id) * 100.0 / (SELECT COUNT(*) FROM rooms WHERE room_type = rm.room_type)), 2) as occupancy_rate
        FROM reservations r
        JOIN rooms rm ON r.room_id = rm.room_id
        WHERE r.status IN ('CHECKED_IN', 'CONFIRMED')
        AND r.check_in_date >= ?
        GROUP BY rm.room_type
        ORDER BY occupancy_rate DESC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $startDate);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $occupancyByType = [];
    while ($row = $result->fetch_assoc()) {
        $occupancyByType[] = $row;
    }
    $stmt->close();
    
    return [
        'occupancy_trend' => $occupancyData,
        'occupancy_by_type' => $occupancyByType,
        'period' => $period,
        'start_date' => $startDate
    ];
}

function getRecentActivity($conn, $userId, $userRole) {
    $activities = [];
    
    if (in_array($userRole, ['ADMIN', 'MANAGER'])) {
        // Get recent reservations
        $result = $conn->query("
            SELECT 
                'reservation' as type,
                r.reservation_id as id,
                CONCAT('New reservation #', r.reservation_id) as title,
                u.full_name as user,
                r.created_at as timestamp
            FROM reservations r
            JOIN users u ON r.user_id = u.user_id
            ORDER BY r.created_at DESC
            LIMIT 10
        ");
        
        while ($row = $result->fetch_assoc()) {
            $activities[] = $row;
        }
        
        // Get new users
        $result = $conn->query("
            SELECT 
                'user' as type,
                user_id as id,
                CONCAT('New user: ', full_name) as title,
                username as user,
                created_at as timestamp
            FROM users
            ORDER BY created_at DESC
            LIMIT 10
        ");
        
        while ($row = $result->fetch_assoc()) {
            $activities[] = $row;
        }
        
        // Sort by timestamp
        usort($activities, function($a, $b) {
            return strtotime($b['timestamp']) - strtotime($a['timestamp']);
        });
        
        // Limit to 10 most recent
        $activities = array_slice($activities, 0, 10);
        
    } elseif ($userRole == 'RECEPTION') {
        // Get recent check-ins/check-outs
        $result = $conn->query("
            SELECT 
                CASE 
                    WHEN status = 'CHECKED_IN' THEN 'checkin'
                    WHEN status = 'CHECKED_OUT' THEN 'checkout'
                    ELSE 'reservation'
                END as type,
                reservation_id as id,
                CONCAT('Reservation #', reservation_id, ' - ', status) as title,
                (SELECT full_name FROM users WHERE user_id = r.user_id) as user,
                updated_at as timestamp
            FROM reservations r
            WHERE status IN ('CHECKED_IN', 'CHECKED_OUT')
            ORDER BY updated_at DESC
            LIMIT 10
        ");
        
        while ($row = $result->fetch_assoc()) {
            $activities[] = $row;
        }
        
    } else {
        // Get user's recent activity
        $stmt = $conn->prepare("
            SELECT 
                'reservation' as type,
                reservation_id as id,
                CONCAT('Reservation #', reservation_id, ' - ', status) as title,
                '' as user,
                updated_at as timestamp
            FROM reservations
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT 10
        ");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        while ($row = $result->fetch_assoc()) {
            $activities[] = $row;
        }
        $stmt->close();
    }
    
    return $activities;
}

function getPeriodStartDate($period) {
    $today = new DateTime();
    
    switch ($period) {
        case 'today':
            return $today->format('Y-m-d');
        case 'week':
            return $today->modify('-1 week')->format('Y-m-d');
        case 'month':
            return $today->modify('-1 month')->format('Y-m-d');
        case 'year':
            return $today->modify('-1 year')->format('Y-m-d');
        default:
            return $today->modify('-1 month')->format('Y-m-d');
    }
}
?>