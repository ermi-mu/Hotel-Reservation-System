/**
 * Toast Notification System
 * Modern, attractive notifications for the Hotel Management System
 */
class Toast {
    static container = null;

    static init() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    }

    static show(type, message, duration = 3000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast-item ${type}`;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <i class="${icons[type] || icons.info} toast-icon"></i>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
            <div class="toast-progress">
                <div class="toast-progress-bar"></div>
            </div>
        `;

        this.container.appendChild(toast);

        // Auto remove
        const timeout = setTimeout(() => this.remove(toast), duration);

        // Manual close
        toast.querySelector('.toast-close').onclick = () => {
            clearTimeout(timeout);
            this.remove(toast);
        };
    }

    static remove(toast) {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        toast.addEventListener('animationend', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }

    static success(msg) { this.show('success', msg); }
    static error(msg) { this.show('error', msg); }
    static warning(msg) { this.show('warning', msg); }
    static info(msg) { this.show('info', msg); }
}

// Global helper for all dashboards
window.showNotification = (type, message) => {
    // Standardize type (api uses 'error' but toast uses 'error' - wait, they are same)
    // Some places use 'danger' but toast uses 'error'
    const mappedType = type === 'danger' ? 'error' : type;
    Toast.show(mappedType, message);
};

// Override standard showMessage if it exists in window
if (typeof window.showMessage !== 'undefined') {
    const originalShowMessage = window.showMessage;
    window.showMessage = (type, message) => {
        showNotification(type, message);
    };
}
// [Eyuel commit 8] incremental JS improvement
// [Eyuel commit 18] incremental JS improvement
// [Eyuel commit 28] incremental JS improvement
// [Eyuel commit 38] incremental JS improvement
// [Eyuel commit 48] incremental JS improvement
