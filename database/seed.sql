USE hotel_management;

-- Clear existing data if any (optional, be careful)
-- DELETE FROM booking_services;
-- DELETE FROM reservations;
-- DELETE FROM services;
-- DELETE FROM rooms;

-- Seed Rooms
INSERT IGNORE INTO rooms (room_number, room_type, description, price_per_night, capacity, status) VALUES
('101', 'Standard', 'Elegance and comfort in perfect harmony, featuring bespoke furnishings and a tranquil atmosphere.', 250.00, 2, 'AVAILABLE'),
('102', 'Standard', 'Cozy and well-appointed room perfect for short stays.', 250.00, 2, 'AVAILABLE'),
('201', 'Deluxe', 'Expansive living space with breathtaking views and meticulously crafted amenities for your indulgence.', 450.00, 3, 'AVAILABLE'),
('202', 'Deluxe', 'Premium comfort with a mix of modern and classic decor.', 450.00, 3, 'AVAILABLE'),
('301', 'Suite', 'The pinnacle of luxury, offering a private haven of sophistication and unrivaled panoramic city views.', 850.00, 4, 'AVAILABLE');

-- Seed Services
INSERT IGNORE INTO services (service_name, description, price, category) VALUES
('Fine Dining', 'A symphony of flavors crafted by Michelin-starred chefs in an intimate, elegant setting.', 120.00, 'Food & Beverage'),
('Soul Spa', 'Transformative wellness journeys designed to rejuvenate your body and tranquilize your mind.', 150.00, 'Wellness'),
('Luxury Chauffeur', 'Travel in style with our fleet of premium vehicles and professional drivers.', 80.00, 'Transportation'),
('Laundry Service', 'Professional cleaning and pressing for your finest garments.', 30.00, 'General'),
('Room Service', 'Available 24/7 for your convenience.', 25.00, 'Food & Beverage');

-- Insert default users for all roles (password is 'password' for all: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi)
INSERT IGNORE INTO users (username, password, email, full_name, user_role) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@grandhotel.com', 'System Administrator', 'ADMIN'),
('manager', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager@grandhotel.com', 'Grand Manager', 'MANAGER'),
('reseption', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'reception@grandhotel.com', 'Front Desk', 'RECEPTION'),
('client', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client@grandhotel.com', 'Valued Guest', 'CLIENT'),
