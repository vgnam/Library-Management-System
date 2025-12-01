from fastapi import APIRouter

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ===============================================================
# GET NOTIFICATIONS (Placeholder)
# ===============================================================
@router.get("/", summary="Get Notifications")
def get_notifications():
    return {"message": "Notification service is not implemented yet"}