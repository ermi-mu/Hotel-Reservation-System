<?php
require_once 'config/database.php';

$conn = getDBConnection();

echo "Checking for missing columns in users table...\n";

$result = $conn->query("SHOW COLUMNS FROM users LIKE 'google_id'");
if ($result->num_rows == 0) {
    echo "Adding google_id column...\n";
    if ($conn->query("ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE DEFAULT NULL AFTER user_role")) {
        echo "google_id column added successfully.\n";
    } else {
        echo "Error adding google_id column: " . $conn->error . "\n";
    }
} else {
    echo "google_id column already exists.\n";
}

$result = $conn->query("SHOW COLUMNS FROM users LIKE 'facebook_id'");
if ($result->num_rows == 0) {
    echo "Adding facebook_id column...\n";
    if ($conn->query("ALTER TABLE users ADD COLUMN facebook_id VARCHAR(255) UNIQUE DEFAULT NULL AFTER google_id")) {
        echo "facebook_id column added successfully.\n";
    } else {
        echo "Error adding facebook_id column: " . $conn->error . "\n";
    }
} else {
    echo "facebook_id column already exists.\n";
}

// Check for payments table
$result = $conn->query("SHOW TABLES LIKE 'payments'");
if ($result->num_rows == 0) {
    echo "Creating payments table...\n";
    $sql = "CREATE TABLE IF NOT EXISTS payments (
        payment_id INT AUTO_INCREMENT PRIMARY KEY,
        reservation_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(100) UNIQUE,
        status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
    )";
    if ($conn->query($sql)) {
        echo "payments table created successfully.\n";
    } else {
        echo "Error creating payments table: " . $conn->error . "\n";
    }
} else {
    echo "payments table already exists.\n";
}

$conn->close();
echo "Cleanup complete.\n";
?>
