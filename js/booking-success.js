/**
 * BookingUI Utility
 * Handles premium success screens for reservations and confirmations
 */
const BookingUI = {
    showSuccess(data) {
        // data expected: { title, subtitle, reservationId, roomNumber, totalAmount, checkIn, checkOut, actionText, onAction }

        const backdrop = document.createElement('div');
        backdrop.className = 'success-card-backdrop';

        const cardHTML = `
            <div class="success-card">
                <div class="success-icon-wrapper">
                    <i class="fas fa-check"></i>
                </div>
                <h2>${data.title || 'Success!'}</h2>
                <p>${data.subtitle || 'Your request has been processed.'}</p>
                
                <div class="receipt-details">
                    <div class="receipt-row">
                        <span class="receipt-label">Reservation ID</span>
                        <span class="receipt-value">#${data.reservationId}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">Room Number</span>
                        <span class="receipt-value">${data.roomNumber}</span>
                    </div>
                    ${data.checkIn ? `
                    <div class="receipt-row">
                        <span class="receipt-label">Stay Period</span>
                        <span class="receipt-value">${data.checkIn} - ${data.checkOut}</span>
                    </div>
                    ` : ''}
                    <div class="receipt-row">
                        <span class="receipt-label">Total Paid</span>
                        <span class="receipt-value receipt-total">$${data.totalAmount}</span>
                    </div>
                </div>
                
                <div class="success-actions">
                    <button class="btn-success-main" id="successCardAction">
                        ${data.actionText || 'Continue'}
                    </button>
                </div>
            </div>
        `;

        backdrop.innerHTML = cardHTML;
        document.body.appendChild(backdrop);

        const actionBtn = backdrop.querySelector('#successCardAction');
        actionBtn.onclick = () => {
            backdrop.style.opacity = '0';
            backdrop.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                backdrop.remove();
                if (typeof data.onAction === 'function') data.onAction();
            }, 300);
        };
    },

    showConfirm(data) {
        // data expected: { title, message, onConfirm, onCancel, confirmText, cancelText }

        const backdrop = document.createElement('div');
        backdrop.className = 'success-card-backdrop';

        const cardHTML = `
            <div class="success-card">
                <div class="success-icon-wrapper" style="background: #fff5f5;">
                    <i class="fas fa-question" style="color: #e74c3c;"></i>
                </div>
                <h2>${data.title || 'Confirm Action'}</h2>
                <p>${data.message || 'Are you sure you want to proceed?'}</p>
                
                <div class="success-actions" style="margin-top: 2rem;">
                    <button class="btn btn-secondary" id="confirmCancel" style="flex: 1; border-radius: 12px; padding: 0.8rem;">
                        ${data.cancelText || 'Cancel'}
                    </button>
                    <button class="btn btn-danger" id="confirmProceed" style="flex: 2; border-radius: 12px; padding: 0.8rem; background: #e74c3c; color: white; border: none; font-weight: 600;">
                        ${data.confirmText || 'Proceed'}
                    </button>
                </div>
            </div>
        `;

        backdrop.innerHTML = cardHTML;
        document.body.appendChild(backdrop);

        const proceedBtn = backdrop.querySelector('#confirmProceed');
        const cancelBtn = backdrop.querySelector('#confirmCancel');

        proceedBtn.onclick = () => {
            backdrop.remove();
            if (typeof data.onConfirm === 'function') data.onConfirm();
        };

        cancelBtn.onclick = () => {
            backdrop.remove();
            if (typeof data.onCancel === 'function') data.onCancel();
        };
    }
};
