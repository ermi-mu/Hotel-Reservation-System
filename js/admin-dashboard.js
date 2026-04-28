// Global scope functions for onclick handlers
window.editUser = editUser;
window.deleteUser = deleteUser;
window.editRoom = editRoom;
window.deleteRoom = deleteRoom;

document.addEventListener("DOMContentLoaded", function () {
    if (!AuthUtils.isAuthenticated()) {
        window.location.href = "login.php";
        return;
    }

    // Check if user is admin
    const user = AuthUtils.getCurrentUser();
    if (!user || user.user_role !== "ADMIN") {
        window.location.href = "login.php";
        return;
    }

    initializeAdminDashboard();
});

async function initializeAdminDashboard() {
    // Update user info
    updateUserInfo();

    // Setup event listeners
    setupAdminEventListeners();

    // Load dashboard data (async)
    loadDashboardData();

    // Set current date
    const dateElement = document.getElementById("currentDate");
    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

function updateUserInfo() {
    const user = AuthUtils.getCurrentUser();
    if (!user) return;

    const userName = user.full_name || user.username;
    const userRole = user.user_role;

    // Update welcome message
    const welcomeElement = document.getElementById("welcomeMessage");
    if (welcomeElement) {
        welcomeElement.textContent = `Welcome, ${userName}`;
    }

    // Update user info in sidebar
    const nameElement = document.getElementById("userName");
    const roleElement = document.getElementById("userRole");

    if (nameElement) nameElement.textContent = userName;
    if (roleElement) roleElement.textContent = "System Administrator";
}

async function loadDashboardData() {
    showLoading();

    try {
        // Fetch statistics
        const stats = await API.Dashboard.getStats();
        displayDashboardStats(stats.data);

        // Load users by default as it's the main section
        await loadUsersManagement();
    } catch (error) {
        console.error("Error loading dashboard data:", error);
        if (typeof showNotification === 'function') {
            showNotification("error", "Failed to load dashboard data");
        }
    } finally {
        hideLoading();
    }
}

function displayDashboardStats(stats) {
    const container = document.getElementById("dashboardStats");
    if (!container) return;

    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon primary">
                <i class="fas fa-users"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.totalUsers || 0}</h3>
                <p>Total Users</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon success">
                <i class="fas fa-user-tie"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.totalStaff || 0}</h3>
                <p>Staff Members</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon warning">
                <i class="fas fa-bed"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.totalRooms || 0}</h3>
                <p>Total Rooms</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon danger">
                <i class="fas fa-dollar-sign"></i>
            </div>
            <div class="stat-content">
                <h3>$${stats.totalRevenue || 0}</h3>
                <p>Total Revenue</p>
            </div>
        </div>
    `;
}

async function loadUsersManagement() {
    try {
        const response = await API.User.getAllUsers();
        // API returns { success, message, data: { users: [], pagination: {} } }
        const users = response.data.users || response.data;
        displayUsers(users);
    } catch (error) {
        console.error("Error loading users:", error);
    }
}

function displayUsers(users) {
    const table = document.getElementById("usersTable");
    if (!table) return;
    const container = table.querySelector("tbody");
    if (!container) return;

    const html = users
        .map(
            (user) => `
        <tr>
            <td>${user.full_name}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td><span class="badge bg-${getRoleColor(user.user_role)}">${user.user_role}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td class="table-actions">
                <button class="btn btn-sm btn-primary" onclick="editUser(${user.user_id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.user_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `
        )
        .join("");

    container.innerHTML = html;
}

function getRoleColor(role) {
    switch (role) {
        case 'ADMIN': return 'danger';
        case 'MANAGER': return 'warning';
        case 'RECEPTION': return 'primary';
        default: return 'success';
    }
}

async function loadRoomsManagement() {
    try {
        const response = await API.Room.getAllRooms();
        const rooms = response.data;
        displayRooms(rooms);
    } catch (error) {
        console.error("Error loading rooms:", error);
    }
}

function displayRooms(rooms) {
    const table = document.getElementById("roomsTable");
    if (!table) return;
    const container = table.querySelector("tbody");
    if (!container) return;

    const html = rooms
        .map(
            (room) => `
        <tr>
            <td>${room.room_number}</td>
            <td>${room.room_type}</td>
            <td>
                <span class="badge bg-${room.status === "AVAILABLE" ? "success" : "danger"}">
                    ${room.status}
                </span>
            </td>
            <td>$${room.price_per_night}</td>
            <td class="table-actions">
                <button class="btn btn-sm btn-primary" onclick="editRoom(${room.room_id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteRoom(${room.room_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `
        )
        .join("");

    container.innerHTML = html;
}

function setupAdminEventListeners() {
    // Navigation tabs
    const navLinks = document.querySelectorAll(".sidebar-menu a[data-section]");
    const sections = document.querySelectorAll(".dashboard-section");

    navLinks.forEach((link) => {
        link.addEventListener("click", function (e) {
            e.preventDefault();

            navLinks.forEach((l) => l.classList.remove("active"));
            sections.forEach((s) => s.classList.remove("active"));

            this.classList.add("active");
            const targetId = this.getAttribute("data-section");
            const section = document.getElementById(targetId);
            if (section) {
                section.classList.add("active");

                switch (targetId) {
                    case "dashboard":
                        loadDashboardData();
                        break;
                    case "users":
                        loadUsersManagement();
                        break;
                    case "rooms":
                        loadRoomsManagement();
                        break;
                }
            }
        });
    });

    // Refresh
    const refreshBtn = document.getElementById("refreshDataBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            const activeSection = document.querySelector(".dashboard-section.active").id;
            if (activeSection === 'users') loadUsersManagement();
            else if (activeSection === 'rooms') loadRoomsManagement();
            else loadDashboardData();
        });
    }

    // Add User
    const addUserBtn = document.getElementById("addUserBtn");
    if (addUserBtn) {
        addUserBtn.addEventListener("click", () => {
            const modal = new bootstrap.Modal(document.getElementById("addUserModal"));
            document.getElementById("addUserForm").reset();
            modal.show();
        });
    }

    const addUserForm = document.getElementById("addUserForm");
    if (addUserForm) {
        addUserForm.addEventListener("submit", handleAddUser);
    }

    // Edit User
    const editUserForm = document.getElementById("editUserForm");
    if (editUserForm) {
        editUserForm.addEventListener("submit", handleUpdateUser);
    }

    // Add Room
    const addRoomBtn = document.getElementById("addRoomBtn");
    if (addRoomBtn) {
        addRoomBtn.addEventListener("click", () => {
            const modal = new bootstrap.Modal(document.getElementById("addRoomModal"));
            document.getElementById("addRoomForm").reset();
            modal.show();
        });
    }

    const addRoomForm = document.getElementById("addRoomForm");
    if (addRoomForm) {
        addRoomForm.addEventListener("submit", handleAddRoom);
    }

    // Edit Room
    const editRoomForm = document.getElementById("editRoomForm");
    if (editRoomForm) {
        editRoomForm.addEventListener("submit", handleUpdateRoom);
    }
}

async function handleAddUser(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userData = Object.fromEntries(formData.entries());

    try {
        const response = await API.Auth.register(userData);
        if (response.success) {
            showNotification("success", "User created successfully");
            bootstrap.Modal.getInstance(document.getElementById("addUserModal")).hide();
            loadUsersManagement();
        } else {
            showNotification("error", response.message);
        }
    } catch (error) {
        showNotification("error", "Failed to create user");
    }
}

async function editUser(userId) {
    try {
        const response = await API.User.getUserById(userId);
        const user = response.data;

        const modal = new bootstrap.Modal(document.getElementById("editUserModal"));
        const form = document.getElementById("editUserForm");

        form.querySelector('[name="user_id"]').value = user.user_id;
        form.querySelector('[name="full_name"]').value = user.full_name;
        form.querySelector('[name="email"]').value = user.email;
        form.querySelector('[name="phone"]').value = user.phone || '';
        form.querySelector('[name="user_role"]').value = user.user_role;

        modal.show();
    } catch (error) {
        showNotification("error", "Failed to load user data");
    }
}

async function handleUpdateUser(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userId = formData.get("user_id");
    const userData = Object.fromEntries(formData.entries());
    delete userData.user_id;

    try {
        const response = await API.User.updateUser(userId, userData);
        if (response.success) {
            showNotification("success", "User updated successfully");
            bootstrap.Modal.getInstance(document.getElementById("editUserModal")).hide();
            loadUsersManagement();
        } else {
            showNotification("error", response.message);
        }
    } catch (error) {
        showNotification("error", "Failed to update user");
    }
}

async function deleteUser(userId) {
    BookingUI.showConfirm({
        title: "Delete User",
        message: "Are you sure you want to delete this user? This will also delete their reservations, payments, and services.",
        confirmText: "Delete",
        onConfirm: async () => {
            showLoading();
            try {
                const response = await API.User.deleteUser(userId);
                if (response.success) {
                    showNotification("success", "User deleted successfully");
                    loadUsersManagement();
                } else {
                    showNotification("error", response.message);
                }
            } catch (error) {
                showNotification("error", "Failed to delete user");
            } finally {
                hideLoading();
            }
        }
    });
}

async function handleAddRoom(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const roomData = Object.fromEntries(formData.entries());

    try {
        const response = await API.Room.createRoom(roomData);
        if (response.success) {
            showNotification("success", "Room added successfully");
            bootstrap.Modal.getInstance(document.getElementById("addRoomModal")).hide();
            loadRoomsManagement();
        } else {
            showNotification("error", response.message);
        }
    } catch (error) {
        showNotification("error", "Failed to add room");
    }
}

async function editRoom(roomId) {
    try {
        const response = await API.Room.getRoomById(roomId);
        const room = response.data;

        const modal = new bootstrap.Modal(document.getElementById("editRoomModal"));
        const form = document.getElementById("editRoomForm");

        form.querySelector('[name="room_id"]').value = room.room_id;
        form.querySelector('[name="room_number"]').value = room.room_number;
        form.querySelector('[name="room_type"]').value = room.room_type;
        form.querySelector('[name="price_per_night"]').value = room.price_per_night;
        form.querySelector('[name="capacity"]').value = room.capacity;
        form.querySelector('[name="status"]').value = room.status;

        modal.show();
    } catch (error) {
        showNotification("error", "Failed to load room data");
    }
}

async function handleUpdateRoom(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const roomId = formData.get("room_id");
    const roomData = Object.fromEntries(formData.entries());
    delete roomData.room_id;

    try {
        const response = await API.Room.updateRoom(roomId, roomData);
        if (response.success) {
            showNotification("success", "Room updated successfully");
            bootstrap.Modal.getInstance(document.getElementById("editRoomModal")).hide();
            loadRoomsManagement();
        } else {
            showNotification("error", response.message);
        }
    } catch (error) {
        showNotification("error", "Failed to update room");
    }
}

async function deleteRoom(roomId) {
    BookingUI.showConfirm({
        title: "Delete Room",
        message: "Are you sure you want to delete this room? This will also delete all its reservations, payments, and services.",
        confirmText: "Delete",
        onConfirm: async () => {
            showLoading();
            try {
                const response = await API.Room.deleteRoom(roomId);
                if (response.success) {
                    showNotification("success", "Room deleted successfully");
                    loadRoomsManagement();
                } else {
                    showNotification("error", response.message);
                }
            } catch (error) {
                showNotification("error", "Failed to delete room");
            } finally {
                hideLoading();
            }
        }
    });
}

// Generic helper to show loading
function showLoading() {
    if (typeof LoadingUI !== 'undefined') LoadingUI.show();
}

function hideLoading() {
    if (typeof LoadingUI !== 'undefined') LoadingUI.hide();
}
// [Eyuel commit 1] incremental JS improvement
// [Eyuel commit 11] incremental JS improvement
// [Eyuel commit 21] incremental JS improvement
// [Eyuel commit 31] incremental JS improvement
