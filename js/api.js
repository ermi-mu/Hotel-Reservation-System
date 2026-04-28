// api.js - Updated version
const API_BASE_URL = "api/"; // Pointing to local PHP backend

// Common API functions
class HotelAPI {
  static async request(endpoint, method = "GET", data = null) {
    const headers = {
      "Content-Type": "application/json",
    };

    const config = {
      method,
      headers,
      credentials: 'include'
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    try {
      console.log(`API Request: ${method} ${endpoint}`, data);

      let url = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, config);

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      let result;

      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        result = await response.text();
        try {
          result = JSON.parse(result);
        } catch (e) {
          // Not JSON
        }
      }

      if (!response.ok) {
        throw new Error(result.message || result || "API request failed");
      }

      return result;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // Auth endpoints
  static async login(credentials) {
    return this.request("auth.php?action=login", "POST", credentials);
  }

  static async register(userData) {
    return this.request("auth.php?action=register", "POST", userData);
  }

  static async logout() {
    return this.request("auth.php?action=logout", "POST");
  }

  static async getCurrentUser() {
    return this.request("auth.php?action=profile");
  }

  static async socialLogin(provider, socialData) {
    return this.request(`auth.php?action=${provider}-login`, "POST", socialData);
  }

  // Payment endpoints
  static async createPayment(paymentData) {
    return this.request("payments.php", "POST", paymentData);
  }

  static async getPaymentStatus(reservationId) {
    return this.request(`payments.php?reservation_id=${reservationId}`);
  }

  // Room endpoints
  static async getRooms(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`rooms.php${query ? `?${query}` : ""}`);
  }

  static async getRoomById(id) {
    return this.request(`rooms.php?id=${id}`);
  }

  static async createRoom(roomData) {
    return this.request("rooms.php", "POST", roomData);
  }

  static async updateRoom(id, roomData) {
    return this.request(`rooms.php?id=${id}`, "PUT", roomData);
  }

  static async deleteRoom(id) {
    return this.request(`rooms.php?id=${id}`, "DELETE");
  }

  // Reservation endpoints
  static async getReservations(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`reservation.php${query ? `?${query}` : ""}`);
  }

  static async getReservationById(id) {
    return this.request(`reservation.php?id=${id}`);
  }

  static async createReservation(reservationData) {
    return this.request("reservation.php", "POST", reservationData);
  }

  static async updateReservation(id, reservationData) {
    return this.request(`reservation.php?id=${id}`, "PUT", reservationData);
  }

  static async cancelReservation(id) {
    return this.request(`reservation.php?id=${id}`, "PUT", { status: 'CANCELLED' });
  }

  // User endpoints
  static async getUsers() {
    return this.request("users.php");
  }

  static async getUserById(id) {
    return this.request(`users.php?id=${id}`);
  }

  static async updateUser(id, userData) {
    return this.request(`users.php?id=${id}`, "PUT", userData);
  }

  static async deleteUser(id) {
    return this.request(`users.php?id=${id}`, "DELETE");
  }

  // Dashboard endpoints
  static async getDashboardStats() {
    return this.request("dashboard.php?action=stats");
  }

  static async getRevenueData(period = "month") {
    return this.request(`dashboard.php?action=revenue&period=${period}`);
  }

  static async getTodayCheckIns() {
    return this.request("dashboard.php?action=today-checkins");
  }

  static async getTodayCheckOuts() {
    return this.request("dashboard.php?action=today-checkouts");
  }
  // Booking Services endpoints
  static async getReservationServices(reservationId) {
    return this.request(`booking_services.php${reservationId ? `?reservation_id=${reservationId}` : ""}`);
  }

  static async addServicesToReservation(reservationId, servicesData) {
    return this.request('booking_services.php', 'POST', { reservation_id: reservationId, services: servicesData });
  }
}

// Auth utility functions
const AuthUtils = {
  isAuthenticated: () => !!localStorage.getItem("user"),
  getCurrentUser: () => JSON.parse(localStorage.getItem("user")),
  getCurrentUserRole: () => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user ? user.user_role : null;
  },
  getToken: () => localStorage.getItem("token")
};

// Backward compatibility for dashboard files using API namespace
const API = {
  Auth: {
    login: (creds) => HotelAPI.login(creds),
    register: (data) => HotelAPI.register(data),
    logout: () => HotelAPI.logout(),
    me: () => HotelAPI.getCurrentUser()
  },
  Room: {
    getAllRooms: (params) => HotelAPI.getRooms(params),
    getRoomById: (id) => HotelAPI.getRoomById(id),
    getAvailableRooms: (checkIn, checkOut) => HotelAPI.getRooms({ checkIn, checkOut }),
    createRoom: (data) => HotelAPI.createRoom(data),
    updateRoom: (id, data) => HotelAPI.updateRoom(id, data),
    deleteRoom: (id) => HotelAPI.deleteRoom(id)
  },
  Reservation: {
    getAllReservations: (params) => HotelAPI.getReservations(params),
    getReservationById: (id) => HotelAPI.getReservationById(id),
    createReservation: (data) => HotelAPI.createReservation(data),
    updateReservation: (id, data) => HotelAPI.updateReservation(id, data),
    cancel: (id) => HotelAPI.cancelReservation(id),
    updateReservationStatus: (id, status) => HotelAPI.updateReservation(id, { status }),
    checkIn: (id) => HotelAPI.updateReservation(id, { status: 'CHECKED_IN' }),
    checkOut: (id) => HotelAPI.updateReservation(id, { status: 'CHECKED_OUT' })
  },
  User: {
    getAllUsers: () => HotelAPI.getUsers(),
    getUserById: (id) => HotelAPI.getUserById(id),
    updateUser: (id, data) => HotelAPI.updateUser(id, data),
    deleteUser: (id) => HotelAPI.deleteUser(id),
    updateProfile: (data) => HotelAPI.updateUser('me', data)
  },
  Dashboard: {
    getStats: () => HotelAPI.getDashboardStats(),
    getRevenueData: (period) => HotelAPI.getRevenueData(period),
    getRoomOccupancy: () => HotelAPI.request("dashboard.php?action=occupancy"),
    getTodayCheckIns: () => HotelAPI.getTodayCheckIns(),
    getTodayCheckOuts: () => HotelAPI.getTodayCheckOuts(),
    getRecentReservations: () => HotelAPI.getReservations({ limit: 10 })
  },
  Service: {
    getAllServices: () => HotelAPI.request("services.php"),
    getReservationServices: (id) => HotelAPI.getReservationServices(id),
    addServicesToReservation: (id, services) => HotelAPI.addServicesToReservation(id, services)
  }
};
// [Eyuel commit 2] incremental JS improvement
// [Eyuel commit 12] incremental JS improvement
