from fastapi import APIRouter
from app.api import api_auth
from app.api import api_book

router = APIRouter()
router.include_router(api_auth.router)
router.include_router(api_book.router)
