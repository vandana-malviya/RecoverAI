from pydantic import BaseModel
from typing import Optional


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: str
    role: str = "merchant_admin"


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


class User(BaseModel):
    user_id: str
    email: str
    name: str
    merchant_name: str
    role: str = "merchant_admin"


class UserInDB(User):
    hashed_password: str


class LoginRequest(BaseModel):
    email: str
    password: str
