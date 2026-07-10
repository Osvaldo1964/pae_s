<?php

namespace Utils;

class JWT
{
    private static $algorithm = 'HS256';

    private static function getSecret()
    {
        Env::load(__DIR__ . '/../.env');
        return Env::get('JWT_SECRET', 'PAE_SECRET_KEY_CHANGE_ME_IN_PROD');
    }

    public static function encode($payload)
    {
        $header = json_encode(['typ' => 'JWT', 'alg' => self::$algorithm]);
        $payload = json_encode($payload);

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecret(), true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function decode($token)
    {
        $tokenParts = explode('.', $token);
        if (count($tokenParts) != 3)
            return null;

        $header = base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[0]));
        $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[1]));
        $signature_provided = $tokenParts[2];

        // Verify Signature
        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecret(), true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        if ($base64UrlSignature === $signature_provided) {
            $payload_decoded = json_decode($payload, true);

            // Check expiration if present
            if (isset($payload_decoded['exp']) && $payload_decoded['exp'] < time()) {
                error_log("JWT Expired: " . $token);
                return null;
            }

            return $payload_decoded;
        }
        return null;
    }
}
