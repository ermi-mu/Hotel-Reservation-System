<?php
require_once __DIR__ . '/../includes/functions.php';

$sessionId = $_GET['session_id'] ?? '';
$reservationId = $_GET['reservation_id'] ?? '';

if (empty($sessionId) || empty($reservationId)) {
    die("Invalid request");
}

$conn = getDBConnection();

// Stripe Integration
require_once __DIR__ . '/../config/secrets.php';
$stripeSecretKey = STRIPE_SECRET_KEY;

// Verify the session with Stripe

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.stripe.com/v1/checkout/sessions/' . $sessionId);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_USERPWD, $stripeSecretKey . ':');

$response = curl_exec($ch);
$session = json_decode($response, true);
curl_close($ch);

if (isset($session['payment_status']) && $session['payment_status'] === 'paid') {
    // Payment was successful
    $amountTotal = $session['amount_total'] / 100;
    $transactionId = $session['payment_intent'];
    $paymentMethod = 'Stripe - Card';

    // Check if payment already recorded
    $stmt = $conn->prepare("SELECT payment_id FROM payments WHERE transaction_id = ?");
    $stmt->bind_param("s", $transactionId);
    $stmt->execute();
    if ($stmt->get_result()->num_rows == 0) {
        // Record payment
        $stmt = $conn->prepare("INSERT INTO payments (reservation_id, amount, payment_method, transaction_id, status) VALUES (?, ?, ?, ?, 'COMPLETED')");
        $stmt->bind_param("idss", $reservationId, $amountTotal, $paymentMethod, $transactionId);
        $stmt->execute();

        // Update reservation status
        $stmt = $conn->prepare("UPDATE reservations SET status = 'CONFIRMED' WHERE reservation_id = ?");
        $stmt->bind_param("i", $reservationId);
        $stmt->execute();
        $stmt->close();
    }

    // Redirect to dashboard with success message
    header('Location: ' . BASE_URL . '/client-dashboard.html?payment=success');
} else {
    // Payment failed or incomplete
    header('Location: ' . BASE_URL . '/client-dashboard.html?payment=failed');
}


closeDBConnection($conn);
?>
