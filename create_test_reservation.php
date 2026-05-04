<?php
require_once 'includes/functions.php';
$conn = getDBConnection();

$userId = 4; // tester1
$roomId = 1; // Room 101
$checkIn = '2026-03-20';
$checkOut = '2026-03-22';
$guests = 2;
$totalPrice = 200.00;

$stmt = $conn->prepare("
    INSERT INTO reservations (user_id, room_id, check_in_date, check_out_date, guests, total_price, status) 
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
");
$stmt->bind_param("iissis", $userId, $roomId, $checkIn, $checkOut, $guests, $totalPrice);

if ($stmt->execute()) {
    echo "Reservation created successfully for user_id $userId\n";
} else {
    echo "Error: " . $stmt->error . "\n";
}

$stmt->close();
closeDBConnection($conn);
?>
