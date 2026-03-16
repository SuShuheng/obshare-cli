"""
Encryption utilities for ObShare CLI
Based on Fernet (AES-128-CBC + HMAC-SHA256)
"""

import base64
import hashlib
import platform
import os
import json
from typing import Optional, Any, Dict

try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False


class CryptoUtils:
    """Encryption utilities for secure credential storage"""

    SENSITIVE_FIELDS = ['appId', 'appSecret', 'folderToken', 'userId']
    _cache: Dict[str, Any] = {}
    _debug_enabled = False

    @classmethod
    def set_debug_enabled(cls, enabled: bool) -> None:
        """Enable or disable debug logging"""
        cls._debug_enabled = enabled

    @classmethod
    def debug(cls, *args: Any) -> None:
        """Print debug message if enabled"""
        if cls._debug_enabled:
            print("[DEBUG]", *args)

    @classmethod
    def _get_device_identifier(cls) -> str:
        """Generate a device-specific identifier for key derivation"""
        device_info = [
            platform.node(),
            platform.system(),
            platform.machine(),
            os.environ.get('USERNAME', os.environ.get('USER', 'unknown')),
            'obshare-cli-v1'
        ]
        return '|'.join(device_info)

    @classmethod
    def _derive_key(cls, password: str, salt: bytes) -> bytes:
        """Derive a Fernet-compatible key from password and salt"""
        if not CRYPTO_AVAILABLE:
            raise RuntimeError("cryptography library not installed")

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key

    @classmethod
    def encrypt(cls, plaintext: str) -> str:
        """
        Encrypt a plaintext string
        Returns encrypted string with salt prefix (base64 encoded)
        """
        if not plaintext or not plaintext.strip():
            return plaintext

        if not CRYPTO_AVAILABLE:
            cls.debug("Cryptography not available, returning plaintext")
            return plaintext

        try:
            # Generate random salt
            salt = os.urandom(16)

            # Derive key from device identifier
            device_id = cls._get_device_identifier()
            key = cls._derive_key(device_id, salt)

            # Create Fernet cipher and encrypt
            fernet = Fernet(key)
            encrypted = fernet.encrypt(plaintext.encode())

            # Combine salt + encrypted data and encode as base64
            combined = salt + encrypted
            return base64.urlsafe_b64encode(combined).decode()

        except Exception as e:
            cls.debug(f"Encryption failed: {e}")
            return plaintext

    @classmethod
    def decrypt(cls, encrypted_data: str) -> str:
        """
        Decrypt an encrypted string
        Returns original plaintext
        """
        if not encrypted_data or not encrypted_data.strip():
            return encrypted_data

        if not cls.is_encrypted_data(encrypted_data):
            return encrypted_data

        if not CRYPTO_AVAILABLE:
            cls.debug("Cryptography not available, returning encrypted data")
            return encrypted_data

        try:
            # Decode base64
            combined = base64.urlsafe_b64decode(encrypted_data.encode())

            # Extract salt (first 16 bytes) and encrypted data
            salt = combined[:16]
            encrypted = combined[16:]

            # Derive key from device identifier
            device_id = cls._get_device_identifier()
            key = cls._derive_key(device_id, salt)

            # Create Fernet cipher and decrypt
            fernet = Fernet(key)
            decrypted = fernet.decrypt(encrypted)

            return decrypted.decode()

        except Exception as e:
            cls.debug(f"Decryption failed: {e}")
            return encrypted_data

    @classmethod
    def is_encrypted_data(cls, data: str) -> bool:
        """Check if a string is encrypted data"""
        if not data:
            return False

        # Check if it's valid base64
        try:
            decoded = base64.urlsafe_b64decode(data.encode())
            # Encrypted data should have at least salt (16) + some encrypted content
            return len(decoded) >= 32
        except Exception:
            return False

    @classmethod
    def encrypt_sensitive_settings(cls, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Encrypt sensitive fields in settings dict"""
        result = settings.copy()

        for field in cls.SENSITIVE_FIELDS:
            if field in result and result[field] and isinstance(result[field], str):
                if not cls.is_encrypted_data(result[field]):
                    result[field] = cls.encrypt(result[field])

        return result

    @classmethod
    def decrypt_sensitive_settings(cls, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Decrypt sensitive fields in settings dict"""
        result = settings.copy()

        for field in cls.SENSITIVE_FIELDS:
            if field in result and result[field] and isinstance(result[field], str):
                if cls.is_encrypted_data(result[field]):
                    result[field] = cls.decrypt(result[field])

        return result

    @classmethod
    def clear_cache(cls) -> None:
        """Clear the internal cache"""
        cls._cache.clear()
