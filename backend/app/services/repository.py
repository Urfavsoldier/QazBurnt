import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.schemas import FireDetection


class FireEventRepository:
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self.path = data_dir / "fire_events.jsonl"
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def upsert_many(self, events: list[FireDetection]) -> None:
        existing = {event.id: event for event in self.list_all()}
        for event in events:
            existing[event.id] = event
        with self.path.open("w", encoding="utf-8") as file:
            for event in sorted(existing.values(), key=lambda item: item.timestamp):
                file.write(event.model_dump_json() + "\n")

    def list_all(self) -> list[FireDetection]:
        if not self.path.exists():
            return []
        events: list[FireDetection] = []
        with self.path.open("r", encoding="utf-8") as file:
            for line in file:
                if not line.strip():
                    continue
                try:
                    events.append(FireDetection.model_validate(json.loads(line)))
                except Exception:
                    continue
        return events

    def recent(self, hours: int = 24, limit: int = 250) -> list[FireDetection]:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        events = [event for event in self.list_all() if event.timestamp >= cutoff]
        return sorted(events, key=lambda item: item.timestamp, reverse=True)[:limit]
