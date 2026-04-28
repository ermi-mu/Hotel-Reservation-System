<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Testing connection to 127.0.0.1...\n";
$time_start = microtime(true);

$conn = new mysqli('127.0.0.1', 'hotel_user', 'HotelAppPass123++', 'hotel_management');

if ($conn->connect_error) {
    echo "Connection failed: " . $conn->connect_error . "\n";
} else {
    echo "Connected successfully!\n";
    $time_end = microtime(true);
    echo "Time taken: " . ($time_end - $time_start) . " seconds\n";
    
    $res = $conn->query("SELECT COUNT(*) as count FROM rooms");
    if ($res) {
        $row = $res->fetch_assoc();
        echo "Room count: " . $row['count'] . "\n";
    } else {
        echo "Query failed: " . $conn->error . "\n";
    }
    
    $conn->close();
}
?>

