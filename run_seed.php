<?php
require_once 'config/database.php';

$sql = file_get_contents('database/seed.sql');
$queries = array_filter(array_map('trim', explode(';', $sql)));

$conn = getDBConnection();

echo "Starting database seeding...\n";

foreach ($queries as $query) {
    if (empty($query)) continue;
    
    if ($conn->query($query) === TRUE) {
        echo "Successfully executed query.\n";
    } else {
        echo "Error executing query: " . $conn->error . "\n";
    }
}

$conn->close();
echo "Database seeding completed.\n";
?>
