#!/bin/bash
sudo mysql -e "CREATE USER IF NOT EXISTS 'hotel_user'@'localhost' IDENTIFIED BY 'HotelAppPass123++'; GRANT ALL PRIVILEGES ON *.* TO 'hotel_user'@'localhost'; FLUSH PRIVILEGES;"
