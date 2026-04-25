<?php
session_start();
$_SESSION['user_id'] = 1;
$_SESSION['user_role'] = 'CLIENT';
$_SERVER['REQUEST_METHOD'] = 'GET';
require 'api/reservation.php';
