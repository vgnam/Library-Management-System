from app.core.security import get_password_hash

password = "hashed_pass11"
hashed_password = get_password_hash(password)
print(hashed_password)
