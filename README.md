# Grand Hotel Management System

A premium, full-stack hotel management system built with HTML, CSS, JavaScript, and PHP. This system provides a comprehensive suite of features for Guests, Staff, Managers, and Administrators.

## 📸 Screenshots

### Home Page
![Login Page](docs/images/home_page.png)
### Login Page
![Login Page](docs/images/login.png)

### Admin Dashboard (User & System Management)
![Admin Dashboard](docs/images/admin_dashboard.png)

### Manager Dashboard (Analytics & Operations)
![Manager Dashboard](docs/images/manager_dashboard.png)

## 🚀 Key Features.

### 🔐 Multi-Role Authentication
- **Admin**: Full system access, hardware management, and staff/manager creation.
- **Manager**: Operational oversight, analytics, and reservation management.
- **Reception**: Check-in/out, service management, and guest interaction.
- **Client**: Room booking, service requests, and profile management.

### 📋 Role-Based Access Control (RBAC)
- **Staff Privacy**: Only Administrators can view, add, or remove staff members.
- **Dynamic Dashboards**: Each role gets a tailored dashboard with relevant tools and data.

### 🏨 Comprehensive Management
- **User Management**: Admin can manage all accounts and roles.
- **Room Management**: Manage availability, pricing, and room types.
- **Real-time Analytics**: Visualized revenue, occupancy, and guest statistics.

## 🛠 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd hotel
   ```

2. **Database Setup**:
   - Create a MySQL database named `hotel_management`.
   - Configure your credentials in `config/database.php`.
   - Run the seeding script to initialize data and create the admin user:
     ```bash
     php run_seed.php
     ```

3. **Start the server**:
   ```bash
   php -S localhost:8000
   ```

## 🔑 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `admin` | `password` |
| **Manager** | `manager` | `password` |
| **Reception** | `reseption` | `password` |
| **Client** | `client` | `password` |


## 🧪 Tech Stack
- **Frontend**: Vanilla CSS (Custom UI), Bootstrap 5, FontAwesome, JavaScript (ES6+).
- **Backend**: PHP 7.4+, MySQL.
- **Security**: Password hashing (Bcrypt), Role-based redirection, Backend RBAC.
