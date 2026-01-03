from datetime import datetime, date
from typing import Optional
from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import uuid
from fastapi_sqlalchemy import db
import traceback

from app.models.model_base import Base
from app.models.model_user import User, UserRoleEnum, GenderEnum
from app.models.model_reader import Reader
from app.models.model_reading_card import ReadingCard, CardTypeEnum, CardStatusEnum
from app.models.model_librarian import Librarian
from app.models.model_manager import Manager
from app.models.model_book import Book
from app.models.model_book_title import BookTitle
from app.models.model_publisher import Publisher
from app.models.model_borrow import BorrowSlip, BorrowSlipDetail, BorrowStatusEnum
from app.models.model_acquisition import AcquisitionSlip, AcquisitionSlipDetail
from app.models.model_penalty import PenaltySlip, PenaltyTypeEnum, PenaltyStatusEnum

from app.core.security import (
    verify_password,
    create_access_token,
    decode_access_token,
    get_password_hash,
)
from app.schemas.sche_base import DataResponse

import pytz
from app.core.config import settings

tz_vn = pytz.timezone("Asia/Ho_Chi_Minh")

class AuthService:
    def __init__(self):
        # OAuth2 schemes cho từng role, có API_PREFIX
        self.reader_oauth2 = OAuth2PasswordBearer(
            tokenUrl=f"{settings.API_PREFIX}/auth/reader/login",
            scheme_name="ReaderAuth"
        )

        self.librarian_oauth2 = OAuth2PasswordBearer(
            tokenUrl=f"{settings.API_PREFIX}/auth/librarian/login",
            scheme_name="LibrarianAuth"
        )

        self.manager_oauth2 = OAuth2PasswordBearer(
            tokenUrl=f"{settings.API_PREFIX}/auth/manager/login",
            scheme_name="ManagerAuth"
        )

        # Reusable OAuth2 cho các endpoint không phân biệt role cụ thể
        # Mặc định dùng reader_oauth2
        self.reusable_oauth2 = self.reader_oauth2

    def authenticate(self, username: str, password: str, role: str) -> Optional[User]:
        """Authenticate user with username, password and role."""
        try:
            user = (
                db.session.query(User)
                .filter(User.username == username)
                .first()
            )

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid username or password"
                )

            if not verify_password(password, user.password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid username or password"
                )

            if user.role.value.lower() != role.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Account is not authorized as {role}"
                )

            return user

        except HTTPException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )

    def login(self, username: str, password: str, role: str) -> DataResponse:
        """Handle user login and return JWT token."""
        try:
            user = self.authenticate(username, password, role)

            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            # Update last login
            user.last_login = datetime.utcnow()
            db.session.commit()

            # Generate token
            token_data = {
                "user_id": user.user_id,
                "role": user.role.value
            }
            token = create_access_token(token_data)

            return DataResponse().success_response({
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "user_id": user.user_id,
                    "username": user.username,
                    "full_name": user.full_name,
                    "role": user.role.value
                }
            })

        except HTTPException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"{type(e).__name__}: {str(e)}"
            )

    def register_reader(
            self,
            full_name: str,
            email: str,
            username: str,
            password: str,
            dob: Optional[date] = None,
            gender: Optional[str] = None,
            phone: Optional[str] = None,
            address: Optional[str] = None,
            reader_type: str = "standard"
    ) -> DataResponse:
        """Register a new reader with associated reading card."""
        try:
            # Check existing user
            existing_user = db.session.query(User).filter(
                (User.email == email) | (User.username == username)
            ).first()

            if existing_user:
                if existing_user.email == email:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already exists"
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Username already exists"
                    )

            # Validate and convert gender
            gender_enum = None
            if gender:
                try:
                    gender_enum = GenderEnum[gender.lower()]
                except KeyError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid gender. Must be one of: male, female, other"
                    )

            # Create user
            user_id = str(uuid.uuid4())
            new_user = User(
                user_id=user_id,
                username=username,
                password=get_password_hash(password),
                full_name=full_name,
                email=email,
                phone_number=phone,
                dob=dob,
                address=address,
                gender=gender_enum,
                role=UserRoleEnum.reader
            )
            db.session.add(new_user)

            # Create reader
            reader_id = str(uuid.uuid4())
            new_reader = Reader(
                reader_id=reader_id,
                user_id=user_id,
                total_borrowed=0
            )
            db.session.add(new_reader)

            # Determine card type and fee
            is_vip = reader_type.lower() == "vip"
            card_type = CardTypeEnum.vip if is_vip else CardTypeEnum.standard
            card_fee = 100000 if is_vip else 50000

            # Create reading card
            card_id = str(uuid.uuid4())
            new_card = ReadingCard(
                card_id=card_id,
                reader_id=reader_id,
                card_type=card_type,
                fee=card_fee,
                register_date=datetime.utcnow().date(),
                register_office="Main Library",
                status=CardStatusEnum.active
            )
            db.session.add(new_card)

            db.session.commit()

            return DataResponse().success_response({
                "user_id": user_id,
                "reader_id": reader_id,
                "card_id": card_id,
                "username": username,
                "email": email,
                "reader_type": reader_type,
                "card_fee": card_fee
            })

        except HTTPException:
            db.session.rollback()
            raise
        except Exception as e:
            db.session.rollback()
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )

    def get_current_user(self, token: str) -> User:
        """Get current user from JWT token."""
        try:
            payload = decode_access_token(token)
            user_id = payload.get("user_id")

            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: user_id not found"
                )

            user = (
                db.session.query(User)
                .filter(User.user_id == user_id)
                .first()
            )

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            return user

        except HTTPException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

    def get_current_reader(self, token: str) -> tuple[User, Reader]:
        """Get current user and verify they are a reader. Returns (user, reader)."""
        user = self.get_current_user(token)

        if user.role != UserRoleEnum.reader:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a reader"
            )

        reader = db.session.query(Reader).filter(
            Reader.user_id == user.user_id
        ).first()

        if not reader:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reader profile not found"
            )

        return user, reader

    def get_current_librarian(self, token: str) -> tuple[User, Librarian]:
        """Get current user and verify they are a librarian. Returns (user, librarian)."""
        user = self.get_current_user(token)

        if user.role != UserRoleEnum.librarian:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a librarian"
            )

        librarian = db.session.query(Librarian).filter(
            Librarian.user_id == user.user_id
        ).first()

        if not librarian:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Librarian profile not found"
            )

        return user, librarian

    def get_current_manager(self, token: str) -> tuple[User, Manager]:
        """Get current user and verify they are a manager. Returns (user, manager)."""
        user = self.get_current_user(token)

        if user.role != UserRoleEnum.manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a manager"
            )

        manager = db.session.query(Manager).filter(
            Manager.user_id == user.user_id
        ).first()

        if not manager:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manager profile not found"
            )

        return user, manager

    def logout(self, username: str) -> DataResponse:
        """Handle user logout."""
        try:
            user = (
                db.session.query(User)
                .filter(User.username == username)
                .first()
            )

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            user.last_logout = datetime.utcnow()
            db.session.commit()

            return DataResponse().success_response({
                "username": username,
                "logout_time": user.last_logout.isoformat()
            })

        except HTTPException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )