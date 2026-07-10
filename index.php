<?php
// Root Router
// If user requests /app, let Apache/Htaccess handle it (or if index.html, it loads directly)
// If root is requested, we include the Landing Page

include 'landing/index.php';
