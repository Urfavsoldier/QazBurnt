# QazBurnt Backend

FastAPI service for active fire ingestion, weather normalization, explainable wildfire risk scoring, and lightweight spread simulation for Kazakhstan.

## Run

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

For frontend API mode set the root `.env` value:

```env
NEXT_PUBLIC_QAZBURNT_DATA_MODE=api
NEXT_PUBLIC_QAZBURNT_API_BASE_URL=http://127.0.0.1:8000
```

## Data Providers

- NASA FIRMS active fire detections via `FIRMS_MAP_KEY`
- Open-Meteo forecast/current weather API
- Realistic mock fallback when `MOCK_MODE=true` or external providers fail and `MOCK_FALLBACK=true`

## Endpoints

- `GET /health`
- `GET /fires/live?lat=50.08&lon=79.12&radius_km=120`
- `GET /fires/history?hours=72`
- `GET /weather/current?lat=50.08&lon=79.12`
- `GET /risk/predict?lat=50.08&lon=79.12&radius_km=120`
- `POST /risk/score`
- `POST /simulation/run`

The simulation returns anisotropic 6h, 12h, and 24h forecast polygons, estimated area, impacted settlements, and a short explanation of the directional ellipse model.
