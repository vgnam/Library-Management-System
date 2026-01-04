import logging

import uvicorn
from fastapi import FastAPI
from fastapi_sqlalchemy import DBSessionMiddleware
from starlette.middleware.cors import CORSMiddleware

from app.api.api_router import router
from app.models import Base
from app.db.base import engine
from app.core.config import settings
from app.helpers.exception_handler import CustomException, http_exception_handler

logging.config.fileConfig(settings.LOGGING_CONFIG_FILE, disable_existing_loggers=False)
Base.metadata.create_all(bind=engine)


def get_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME, docs_url="/docs", redoc_url='/re-docs',
        openapi_url=f"{settings.API_PREFIX}/openapi.json",
        description='''
        Base frame with FastAPI micro framework + Postgresql
            - Login/Register with JWT
            - Permission
            - CRUD User
            - Unit testing with Pytest
            - Dockerize
        '''
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.add_middleware(DBSessionMiddleware, db_url=settings.DATABASE_URL)
    application.include_router(router, prefix=settings.API_PREFIX)
    application.add_exception_handler(CustomException, http_exception_handler)

    return application


app = get_application()
if __name__ == '__main__':
    # from fastapi import FastAPI
    # from fastapi.routing import APIRoute
    # @app.on_event("startup")
    # def print_routes():
    #     print("\n📌 Registered API Routes:")
    #     for route in app.routes:
    #         if isinstance(route, APIRoute):
    #             methods = ",".join(route.methods)
    #             print(f"{methods:10} {route.path}")
    #
    # from fastapi_sqlalchemy import db
    # from app.services.srv_history import HistoryService
    # from app.services.srv_return import ReturnService
    # reader_id = "3262551a-efc6-441e-8d1f-3f30807a7f90"
    # history_service = HistoryService()
    #
    # with db():
    #     overdue = history_service.get_currently_borrowed_books(reader_id)
    #     print("\nRetruned Books:", overdue)

    uvicorn.run(app, host="0.0.0.0", port=8000)
