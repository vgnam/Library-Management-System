from fastapi import APIRouter
from app.api import api_auth, api_search, api_borrow, api_return, api_history, api_notification

router = APIRouter()
router.include_router(api_auth.router)
router.include_router(api_search.router)
router.include_router(api_borrow.router)
router.include_router(api_return.router)
router.include_router(api_history.router)
router.include_router(api_notification.router)