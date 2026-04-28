// payments.js - Handles payment processing for the client dashboard

document.addEventListener('DOMContentLoaded', function () {
    // Initial check for payments
    initPaymentListeners();
});

function initPaymentListeners() {
    // This will be called when the dashboard loads or when sections change
}

async function showPaymentModal(reservationId, amount) {
    const modalDiv = document.getElementById('paymentModal');
    if (!modalDiv) {
        // Create modal if it doesn't exist (though we'll add it to HTML)
        console.error('Payment modal not found in DOM');
        return;
    }

    document.getElementById('payReservationId').value = reservationId;
    document.getElementById('payAmount').textContent = `$${parseFloat(amount).toFixed(2)}`;

    const modal = new bootstrap.Modal(modalDiv);
    modal.show();
}

async function processPayment() {
    const reservationId = document.getElementById('payReservationId').value;
    const amount = document.getElementById('payAmount').textContent.replace('$', '');
    const payBtn = document.getElementById('confirmPayBtn');

    // Show loading state
    const originalText = payBtn.innerHTML;
    payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecting...';
    payBtn.disabled = true;

    try {
        const paymentData = {
            reservation_id: parseInt(reservationId),
            amount: parseFloat(amount)
        };

        const result = await HotelAPI.createPayment(paymentData);

        if (result.success && result.data.checkout_url) {
            // Redirect to Stripe Checkout
            window.location.href = result.data.checkout_url;
        } else {
            throw new Error(result.message || 'Failed to initialize payment');
        }
    } catch (error) {
        if (typeof Notifications !== 'undefined') {
            Notifications.show(error.message, 'error');
        } else {
            alert(error.message);
        }
    } finally {
        payBtn.innerHTML = originalText;
        payBtn.disabled = false;
    }
}

// [Eyuel commit 9] incremental JS improvement
