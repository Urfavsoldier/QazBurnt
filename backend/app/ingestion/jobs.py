import asyncio
import logging

from app.core.config import Settings
from app.schemas import FireDetection
from app.services.firms import fetch_live_fires
from app.services.repository import FireEventRepository

logger = logging.getLogger(__name__)


class WildfireIngestionJob:
    def __init__(self, settings: Settings, repository: FireEventRepository) -> None:
        self.settings = settings
        self.repository = repository
        self._stop = asyncio.Event()

    async def ingest_once(self) -> tuple[list[FireDetection], str]:
        events, mode = await fetch_live_fires(self.settings)
        self.repository.upsert_many(events)
        return events, mode

    async def run_forever(self) -> None:
        while not self._stop.is_set():
            try:
                events, mode = await self.ingest_once()
                logger.info("Ingested %s fire detections via %s mode.", len(events), mode)
            except Exception:
                logger.exception("Wildfire ingestion failed.")
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=self.settings.ingestion_interval_seconds)
            except TimeoutError:
                continue

    def stop(self) -> None:
        self._stop.set()
