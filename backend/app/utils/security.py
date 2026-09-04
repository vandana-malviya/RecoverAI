import hashlib
import hmac
import os

SECRET_SALT = b"recoverai_razorpay_secure_salt_2026"


def hash_password(password: str) -> str:
    """Securely hashes passwords using PBKDF2 HMAC SHA-256."""
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        SECRET_SALT,
        100000
    )
    return key.hex()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against hashed password in constant time."""
    candidate_hash = hash_password(plain_password)
    return hmac.compare_digest(candidate_hash, hashed_password)
