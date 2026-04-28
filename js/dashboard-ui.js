/**
 * dashboard-ui.js
 * Shared UI logic for all dashboards (Client, Reception, Manager)
 */
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        if (!sidebar) return;
        sidebar.classList.toggle('active');
        if (sidebarOverlay) {
            sidebarOverlay.classList.toggle('active');
        }
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', toggleSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // Close sidebar when clicking on a menu link (on mobile)
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                toggleSidebar();
            }
        });
    });
});

function showLoading() {
    let loadingDiv = document.getElementById("loadingOverlay");

    if (!loadingDiv) {
        loadingDiv = document.createElement("div");
        loadingDiv.id = "loadingOverlay";
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        loadingDiv.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loadingDiv);
    }
}

function hideLoading() {
    const loadingDiv = document.getElementById("loadingOverlay");
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function showMessage(type, text) {
    if (typeof showNotification === 'function') {
        showNotification(type, text);
        return;
    }

    // Fallback if notifications.js didn't load
    const existingMessage = document.querySelector(".alert");
    if (existingMessage) existingMessage.remove();

    const messageDiv = document.createElement("div");
    messageDiv.className = `alert alert-${type === 'error' ? 'danger' : type} fixed-top mt-5 mx-3`;
    messageDiv.style.cssText = "z-index: 9999; position: fixed; top: 80px; right: 20px; max-width: 300px;";
    messageDiv.innerHTML = `<button type="button" class="btn-close" onclick="this.parentElement.remove()"></button> ${text}`;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 5000);
}
// [Eyuel commit 5] incremental JS improvement
// [Eyuel commit 15] incremental JS improvement
