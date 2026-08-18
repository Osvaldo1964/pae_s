<?php

namespace Config;

class Config
{
    // Base URL of the project
    // Adjust this according to the environment (localhost vs Hostinger)
    public const BASE_URL = 'http://localhost/pae/';
    public const APP_VERSION = '1.9.21';

    // API URL
    public const API_URL = self::BASE_URL . 'api/';

    // Absolute paths for storage (relative to the file location or system root)
    public static function getUploadDir()
    {
        return __DIR__ . '/../../app/assets/img/logos/';
    }
}
