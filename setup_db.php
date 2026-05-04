<?php
// setup_db.php
require_once 'config/database.php';

$sql = file_get_contents('database/schema.sql');

// Extract individual queries (this is a simple split, might need improvement for complex SQL)
$queries = array_filter(array_map('trim', explode(';', $sql)));

$conn = getDBConnection(false);

echo "Starting database setup...\n";

foreach ($queries as $query) {
    if (empty($query)) continue;
    
    if ($conn->query($query) === TRUE) {
        echo "Successfully executed: " . substr($query, 0, 50) . "...\n";
    } else {
        echo "Error executing query: " . $conn->error . "\n";
        echo "Query: " . $query . "\n";
    }
}

$conn->close();
echo "Database setup completed.\n";
?>
