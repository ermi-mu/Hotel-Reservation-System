<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../includes/functions.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

// Check authentication
requireAuth();

$userId = $_SESSION['user_id'];
$userRole = $_SESSION['user_role'];

switch ($method) {
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $reservationId = $data['reservation_id'] ?? null;
        $amount = $data['amount'] ?? null;
        
        if (!$reservationId || !$amount) {
            jsonResponse(false, 'Missing required fields: reservation_id, amount');
        }

        // Verify reservation exists
        $stmt = $conn->prepare("SELECT user_id, status FROM reservations WHERE reservation_id = ?");
        $stmt->bind_param("i", $reservationId);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();

        if (!$res) {
            jsonResponse(false, 'Reservation not found');
        }

        if ($userRole == 'CLIENT' && $res['user_id'] != $userId) {
            jsonResponse(false, 'Insufficient permissions', null, 403);
        }

        // Stripe Integration
        require_once __DIR__ . '/../config/secrets.php';
        $stripeSecretKey = STRIPE_SECRET_KEY;
        
        // We'll use CURL to create a Stripe Checkout Session
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.stripe.com/v1/checkout/sessions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => 'usd',
                    'product_data' => [
                        'name' => 'Hotel Reservation #' . $reservationId,
                    ],
                    'unit_amount' => $amount * 100, // Stripe uses cents
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => BASE_URL . '/api/payment-success.php?session_id={CHECKOUT_SESSION_ID}&reservation_id=' . $reservationId,
            'cancel_url' => BASE_URL . '/client-dashboard.html',
            'client_reference_id' => $reservationId
        ]));
        curl_setopt($ch, CURLOPT_USERPWD, $stripeSecretKey . ':');


        $response = curl_exec($ch);
        $result = json_decode($response, true);
        curl_close($ch);

        if (isset($result['url'])) {
            jsonResponse(true, 'Redirecting to checkout', [
                'checkout_url' => $result['url']
            ]);
        } else {
            jsonResponse(false, 'Stripe Error: ' . ($result['error']['message'] ?? 'Unknown error'));
        }
        break;


    case 'GET':
        $reservationId = $_GET['reservation_id'] ?? null;
        
        if (!$reservationId) {
            jsonResponse(false, 'Missing reservation ID');
        }

        $stmt = $conn->prepare("SELECT * FROM payments WHERE reservation_id = ?");
        $stmt->bind_param("i", $reservationId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $payments = [];
        while ($row = $result->fetch_assoc()) {
            $payments[] = $row;
        }

        jsonResponse(true, 'Payments retrieved', $payments);
        $stmt->close();
        break;

    default:
        jsonResponse(false, 'Method not allowed', null, 405);
}

closeDBConnection($conn);
?>
