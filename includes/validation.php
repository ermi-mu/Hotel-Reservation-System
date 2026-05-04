<?php
// Comprehensive input validation functions

class Validator {
    
    // Validate email
    public static function validateEmail($email) {
        if (empty($email)) {
            return ['valid' => false, 'message' => 'Email is required'];
        }
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['valid' => false, 'message' => 'Invalid email format'];
        }
        
        // Check email length
        if (strlen($email) > 100) {
            return ['valid' => false, 'message' => 'Email is too long (max 100 characters)'];
        }
        
        return ['valid' => true, 'message' => 'Email is valid'];
    }
    
    // Validate password
    public static function validatePassword($password) {
        if (empty($password)) {
            return ['valid' => false, 'message' => 'Password is required'];
        }
        
        if (strlen($password) < 8) {
            return ['valid' => false, 'message' => 'Password must be at least 8 characters long'];
        }
        
        if (!preg_match('/[A-Z]/', $password)) {
            return ['valid' => false, 'message' => 'Password must contain at least one uppercase letter'];
        }
        
        if (!preg_match('/[a-z]/', $password)) {
            return ['valid' => false, 'message' => 'Password must contain at least one lowercase letter'];
        }
        
        if (!preg_match('/[0-9]/', $password)) {
            return ['valid' => false, 'message' => 'Password must contain at least one number'];
        }
        
        if (!preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)) {
            return ['valid' => false, 'message' => 'Password must contain at least one special character'];
        }
        
        return ['valid' => true, 'message' => 'Password is valid'];
    }
    
    // Validate username
    public static function validateUsername($username) {
        if (empty($username)) {
            return ['valid' => false, 'message' => 'Username is required'];
        }
        
        if (strlen($username) < 3) {
            return ['valid' => false, 'message' => 'Username must be at least 3 characters long'];
        }
        
        if (strlen($username) > 50) {
            return ['valid' => false, 'message' => 'Username is too long (max 50 characters)'];
        }
        
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
            return ['valid' => false, 'message' => 'Username can only contain letters, numbers, and underscores'];
        }
        
        return ['valid' => true, 'message' => 'Username is valid'];
    }
    
    // Validate full name
    public static function validateFullName($fullName) {
        if (empty($fullName)) {
            return ['valid' => false, 'message' => 'Full name is required'];
        }
        
        if (strlen($fullName) < 2) {
            return ['valid' => false, 'message' => 'Full name must be at least 2 characters long'];
        }
        
        if (strlen($fullName) > 100) {
            return ['valid' => false, 'message' => 'Full name is too long (max 100 characters)'];
        }
        
        if (!preg_match('/^[a-zA-Z\s\-\'\.]+$/', $fullName)) {
            return ['valid' => false, 'message' => 'Full name can only contain letters, spaces, hyphens, apostrophes, and periods'];
        }
        
        return ['valid' => true, 'message' => 'Full name is valid'];
    }
    
    // Validate phone number
    public static function validatePhone($phone) {
        if (empty($phone)) {
            return ['valid' => true, 'message' => 'Phone is optional']; // Phone is optional
        }
        
        // Remove all non-digit characters
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
        
        if (strlen($cleanPhone) < 10) {
            return ['valid' => false, 'message' => 'Phone number must be at least 10 digits'];
        }
        
        if (strlen($cleanPhone) > 15) {
            return ['valid' => false, 'message' => 'Phone number is too long'];
        }
        
        return ['valid' => true, 'message' => 'Phone number is valid'];
    }
    
    // Validate date
    public static function validateDate($date, $format = 'Y-m-d') {
        if (empty($date)) {
            return ['valid' => false, 'message' => 'Date is required'];
        }
        
        $d = DateTime::createFromFormat($format, $date);
        if (!$d || $d->format($format) !== $date) {
            return ['valid' => false, 'message' => "Invalid date format. Expected: $format"];
        }
        
        return ['valid' => true, 'message' => 'Date is valid'];
    }
    
    // Validate date range (check-in < check-out)
    public static function validateDateRange($checkIn, $checkOut) {
        $checkInResult = self::validateDate($checkIn);
        $checkOutResult = self::validateDate($checkOut);
        
        if (!$checkInResult['valid']) {
            return $checkInResult;
        }
        
        if (!$checkOutResult['valid']) {
            return $checkOutResult;
        }
        
        $checkInDate = new DateTime($checkIn);
        $checkOutDate = new DateTime($checkOut);
        $today = new DateTime();
        
        // Check-in must be today or in the future
        if ($checkInDate < $today->setTime(0, 0, 0)) {
            return ['valid' => false, 'message' => 'Check-in date must be today or in the future'];
        }
        
        // Check-out must be after check-in
        if ($checkOutDate <= $checkInDate) {
            return ['valid' => false, 'message' => 'Check-out date must be after check-in date'];
        }
        
        // Maximum stay length (30 days)
        $interval = $checkInDate->diff($checkOutDate);
        if ($interval->days > 30) {
            return ['valid' => false, 'message' => 'Maximum stay length is 30 days'];
        }
        
        return ['valid' => true, 'message' => 'Date range is valid'];
    }
    
    // Validate room data
    public static function validateRoomData($data) {
        $errors = [];
        
        // Room number
        if (empty($data['room_number'])) {
            $errors['room_number'] = 'Room number is required';
        } elseif (strlen($data['room_number']) > 10) {
            $errors['room_number'] = 'Room number is too long (max 10 characters)';
        }
        
        // Room type
        if (empty($data['room_type'])) {
            $errors['room_type'] = 'Room type is required';
        } elseif (strlen($data['room_type']) > 50) {
            $errors['room_type'] = 'Room type is too long (max 50 characters)';
        }
        
        // Price
        if (!isset($data['price_per_night']) || $data['price_per_night'] <= 0) {
            $errors['price_per_night'] = 'Price per night must be greater than 0';
        } elseif ($data['price_per_night'] > 10000) {
            $errors['price_per_night'] = 'Price per night is too high';
        }
        
        // Capacity
        if (!isset($data['capacity']) || $data['capacity'] < 1) {
            $errors['capacity'] = 'Capacity must be at least 1';
        } elseif ($data['capacity'] > 10) {
            $errors['capacity'] = 'Capacity is too high (max 10)';
        }
        
        // Status (if provided)
        if (isset($data['status']) && !in_array($data['status'], ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'CLEANING'])) {
            $errors['status'] = 'Invalid status value';
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    // Validate reservation data
    public static function validateReservationData($data) {
        $errors = [];
        
        // Required fields
        $requiredFields = ['user_id', 'room_id', 'check_in_date', 'check_out_date'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required';
            }
        }
        
        // Validate dates if provided
        if (isset($data['check_in_date']) && isset($data['check_out_date'])) {
            $dateResult = self::validateDateRange($data['check_in_date'], $data['check_out_date']);
            if (!$dateResult['valid']) {
                $errors['date_range'] = $dateResult['message'];
            }
        }
        
        // Validate price
        if (isset($data['total_price']) && $data['total_price'] <= 0) {
            $errors['total_price'] = 'Total price must be greater than 0';
        }
        
        // Validate status (if provided)
        if (isset($data['status']) && !in_array($data['status'], ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'])) {
            $errors['status'] = 'Invalid status value';
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    // Validate service data
    public static function validateServiceData($data) {
        $errors = [];
        
        // Service name
        if (empty($data['service_name'])) {
            $errors['service_name'] = 'Service name is required';
        } elseif (strlen($data['service_name']) > 100) {
            $errors['service_name'] = 'Service name is too long (max 100 characters)';
        }
        
        // Price
        if (!isset($data['price']) || $data['price'] <= 0) {
            $errors['price'] = 'Price must be greater than 0';
        } elseif ($data['price'] > 10000) {
            $errors['price'] = 'Price is too high';
        }
        
        // Category (if provided)
        if (isset($data['category']) && strlen($data['category']) > 50) {
            $errors['category'] = 'Category is too long (max 50 characters)';
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    // Validate user data for registration
    public static function validateRegistrationData($data) {
        $errors = [];
        
        // Username
        $usernameResult = self::validateUsername($data['username'] ?? '');
        if (!$usernameResult['valid']) {
            $errors['username'] = $usernameResult['message'];
        }
        
        // Password
        $passwordResult = self::validatePassword($data['password'] ?? '');
        if (!$passwordResult['valid']) {
            $errors['password'] = $passwordResult['message'];
        }
        
        // Email
        $emailResult = self::validateEmail($data['email'] ?? '');
        if (!$emailResult['valid']) {
            $errors['email'] = $emailResult['message'];
        }
        
        // Full name
        $fullNameResult = self::validateFullName($data['full_name'] ?? '');
        if (!$fullNameResult['valid']) {
            $errors['full_name'] = $fullNameResult['message'];
        }
        
        // Phone (optional)
        if (!empty($data['phone'])) {
            $phoneResult = self::validatePhone($data['phone']);
            if (!$phoneResult['valid']) {
                $errors['phone'] = $phoneResult['message'];
            }
        }
        
        // User role
        if (isset($data['user_role']) && !in_array($data['user_role'], ['CLIENT', 'RECEPTION', 'MANAGER', 'ADMIN'])) {
            $errors['user_role'] = 'Invalid user role';
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    // Validate user data for update
    public static function validateUpdateUserData($data) {
        $errors = [];
        
        // Email (if provided)
        if (isset($data['email']) && !empty($data['email'])) {
            $emailResult = self::validateEmail($data['email']);
            if (!$emailResult['valid']) {
                $errors['email'] = $emailResult['message'];
            }
        }
        
        // Full name (if provided)
        if (isset($data['full_name']) && !empty($data['full_name'])) {
            $fullNameResult = self::validateFullName($data['full_name']);
            if (!$fullNameResult['valid']) {
                $errors['full_name'] = $fullNameResult['message'];
            }
        }
        
        // Phone (if provided)
        if (isset($data['phone']) && !empty($data['phone'])) {
            $phoneResult = self::validatePhone($data['phone']);
            if (!$phoneResult['valid']) {
                $errors['phone'] = $phoneResult['message'];
            }
        }
        
        // Password (if provided)
        if (isset($data['password']) && !empty($data['password'])) {
            $passwordResult = self::validatePassword($data['password']);
            if (!$passwordResult['valid']) {
                $errors['password'] = $passwordResult['message'];
            }
        }
        
        // User role (if provided)
        if (isset($data['user_role']) && !in_array($data['user_role'], ['CLIENT', 'RECEPTION', 'MANAGER', 'ADMIN'])) {
            $errors['user_role'] = 'Invalid user role';
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    // Sanitize all inputs in an array
    public static function sanitizeArray($data) {
        $sanitized = [];
        
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $sanitized[$key] = self::sanitizeArray($value);
            } else {
                $sanitized[$key] = self::sanitizeInput($value);
            }
        }
        
        return $sanitized;
    }
    
    // Sanitize single input
    public static function sanitizeInput($input) {
        if (is_null($input)) {
            return null;
        }
        
        // Convert to string if not already
        $input = (string)$input;
        
        // Trim whitespace
        $input = trim($input);
        
        // Remove backslashes
        $input = stripslashes($input);
        
        // Convert special characters to HTML entities
        $input = htmlspecialchars($input, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        
        return $input;
    }
    
    // Validate and sanitize numeric input
    public static function validateNumeric($value, $min = null, $max = null) {
        if (!is_numeric($value)) {
            return ['valid' => false, 'message' => 'Value must be numeric'];
        }
        
        $value = (float)$value;
        
        if ($min !== null && $value < $min) {
            return ['valid' => false, 'message' => "Value must be at least $min"];
        }
        
        if ($max !== null && $value > $max) {
            return ['valid' => false, 'message' => "Value must be at most $max"];
        }
        
        return ['valid' => true, 'message' => 'Value is valid', 'value' => $value];
    }
    
    // Validate integer
    public static function validateInteger($value, $min = null, $max = null) {
        $result = self::validateNumeric($value, $min, $max);
        
        if (!$result['valid']) {
            return $result;
        }
        
        if (!is_int($value) && !ctype_digit((string)$value)) {
            return ['valid' => false, 'message' => 'Value must be an integer'];
        }
        
        return ['valid' => true, 'message' => 'Value is valid', 'value' => (int)$value];
    }
}

// Helper function to validate API input
function validateApiInput($data, $rules) {
    $validator = new Validator();
    $errors = [];
    $sanitizedData = [];
    
    foreach ($rules as $field => $rule) {
        $value = $data[$field] ?? null;
        $isRequired = strpos($rule, 'required') !== false;
        
        if ($isRequired && (is_null($value) || $value === '')) {
            $errors[$field] = "$field is required";
            continue;
        }
        
        if (!is_null($value) && $value !== '') {
            // Sanitize the value
            $sanitizedValue = Validator::sanitizeInput($value);
            $sanitizedData[$field] = $sanitizedValue;
            
            // Apply validation rules
            if (strpos($rule, 'email') !== false) {
                $result = Validator::validateEmail($sanitizedValue);
                if (!$result['valid']) {
                    $errors[$field] = $result['message'];
                }
            }
            
            if (strpos($rule, 'numeric') !== false) {
                $result = Validator::validateNumeric($sanitizedValue);
                if (!$result['valid']) {
                    $errors[$field] = $result['message'];
                } else {
                    $sanitizedData[$field] = $result['value'];
                }
            }
            
            if (strpos($rule, 'integer') !== false) {
                $result = Validator::validateInteger($sanitizedValue);
                if (!$result['valid']) {
                    $errors[$field] = $result['message'];
                } else {
                    $sanitizedData[$field] = $result['value'];
                }
            }
            
            if (strpos($rule, 'date') !== false) {
                $result = Validator::validateDate($sanitizedValue);
                if (!$result['valid']) {
                    $errors[$field] = $result['message'];
                }
            }
            
            // Add min/max length validation
            if (preg_match('/min:(\d+)/', $rule, $matches)) {
                $min = $matches[1];
                if (strlen($sanitizedValue) < $min) {
                    $errors[$field] = "$field must be at least $min characters";
                }
            }
            
            if (preg_match('/max:(\d+)/', $rule, $matches)) {
                $max = $matches[1];
                if (strlen($sanitizedValue) > $max) {
                    $errors[$field] = "$field must be at most $max characters";
                }
            }
        } else {
            $sanitizedData[$field] = $value;
        }
    }
    
    return [
        'valid' => empty($errors),
        'errors' => $errors,
        'data' => $sanitizedData
    ];
}
?>