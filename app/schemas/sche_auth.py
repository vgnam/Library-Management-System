from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    username: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
