import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.ingestion.jobs import WildfireIngestionJob
from app.services.repository import FireEventRepository


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    repository = FireEventRepository(settings.data_dir)
    ingestion_job = WildfireIngestionJob(settings, repository)
    task: asyncio.Task[None] | None = None

    if settings.ingestion_enabled:
        await ingestion_job.ingest_once()
        task = asyncio.create_task(ingestion_job.run_forever())

    app.state.repository = repository
    app.state.ingestion_job = ingestion_job
    yield

    ingestion_job.stop()
    if task:
        task.cancel()


settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)
