"""
Ingestion API — MVP Step 1

Endpoints:
  POST /v1/models              register a model, get back an API key
  POST /v1/predictions         log a prediction (auth: X-API-Key header)
  POST /v1/labels              attach a delayed ground-truth label
  GET  /v1/models/{model_id}/predictions   raw feed (debugging / MVP dashboard)
  GET  /v1/models/{model_id}/stats         pre-computed rolling stats (from cron job)

Run:
  uvicorn app.main:app --reload
"""

import secrets
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database import engine, get_db, Base
from  app  import models, schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ML Model Monitoring Dashboard — Ingestion API")

# Frontend dev server (Vite) needs CORS access to call this API from the browser
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- auth helper ----------
def verify_api_key(model_id: str, x_api_key: str, db: Session):
    model = db.query(models.ModelRegistration).filter_by(model_id=model_id).first()
    if not model or model.api_key != x_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key for this model_id")
    return model


# ---------- model registration ----------
@app.post("/v1/models", response_model=schemas.ModelOut)
def register_model(payload: schemas.ModelCreate, db: Session = Depends(get_db)):
    existing = db.query(models.ModelRegistration).filter_by(model_id=payload.model_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="model_id already registered")

    record = models.ModelRegistration(
        model_id=payload.model_id,
        name=payload.name,
        version=payload.version,
        api_key=secrets.token_hex(16),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ---------- prediction ingestion ----------
@app.post("/v1/predictions", response_model=schemas.PredictionOut)
def log_prediction(
    payload: schemas.PredictionIn,
    db: Session = Depends(get_db),
    x_api_key: str = Header(...),
):
    verify_api_key(payload.model_id, x_api_key, db)

    record = models.Prediction(
        model_id=payload.model_id,
        input_features=payload.input_features,
        prediction=payload.prediction,
        latency_ms=payload.latency_ms,
        timestamp=payload.timestamp or datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ---------- delayed label ingestion ----------
@app.post("/v1/labels")
def log_label(payload: schemas.LabelIn, db: Session = Depends(get_db)):
    prediction = db.query(models.Prediction).filter_by(id=payload.prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="prediction_id not found")

    label = models.Label(prediction_id=payload.prediction_id, actual_label=payload.actual_label)
    db.add(label)
    db.commit()
    return {"status": "ok"}


# ---------- raw feed (debugging + simple dashboard read) ----------
@app.get("/v1/models/{model_id}/predictions")
def get_predictions(model_id: str, limit: int = 100, db: Session = Depends(get_db)):
    rows = (
        db.query(models.Prediction)
        .filter_by(model_id=model_id)
        .order_by(models.Prediction.timestamp.desc())
        .limit(limit)
        .all()
    )
    return rows


# ---------- pre-computed stats (written by jobs/compute_stats.py) ----------
@app.get("/v1/models/{model_id}/stats")
def get_stats(model_id: str, limit: int = 50, db: Session = Depends(get_db)):
    rows = (
        db.query(models.StatSnapshot)
        .filter_by(model_id=model_id)
        .order_by(models.StatSnapshot.window_start.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(rows))  # chronological order for charting


# ---------- list all registered models (for dashboard home) ----------
@app.get("/v1/models")
def list_models(db: Session = Depends(get_db)):
    return db.query(models.ModelRegistration).all()


# ---------- baseline capture (Step 4: reference distribution for drift) ----------
@app.post("/v1/models/{model_id}/baseline")
def capture_baseline(model_id: str, payload: schemas.BaselineCaptureIn, db: Session = Depends(get_db)):
    recent = (
        db.query(models.Prediction)
        .filter_by(model_id=model_id)
        .order_by(models.Prediction.timestamp.desc())
        .limit(payload.from_recent)
        .all()
    )
    if not recent:
        raise HTTPException(status_code=400, detail="No predictions logged yet to build a baseline from")

    # collect per-feature numeric values across the sample
    feature_values = {}
    for row in recent:
        for k, v in row.input_features.items():
            if isinstance(v, (int, float)):
                feature_values.setdefault(k, []).append(v)

    # wipe old baseline for this model, write fresh one
    db.query(models.Baseline).filter_by(model_id=model_id).delete()
    for feature_name, values in feature_values.items():
        db.add(models.Baseline(model_id=model_id, feature_name=feature_name, values=values))
    db.commit()

    return {"status": "ok", "features_captured": list(feature_values.keys()), "sample_size": len(recent)}


@app.get("/v1/models/{model_id}/baseline")
def get_baseline(model_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.Baseline).filter_by(model_id=model_id).all()
    return [{"feature_name": r.feature_name, "sample_size": len(r.values)} for r in rows]


# ---------- alert rules ----------
@app.post("/v1/models/{model_id}/alert-rules")
def create_alert_rule(model_id: str, payload: schemas.AlertRuleIn, db: Session = Depends(get_db)):
    rule = models.AlertRule(model_id=model_id, **payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@app.get("/v1/models/{model_id}/alert-rules")
def list_alert_rules(model_id: str, db: Session = Depends(get_db)):
    return db.query(models.AlertRule).filter_by(model_id=model_id).all()


@app.get("/v1/models/{model_id}/alerts")
def list_alerts(model_id: str, limit: int = 50, db: Session = Depends(get_db)):
    rows = (
        db.query(models.Alert)
        .filter_by(model_id=model_id)
        .order_by(models.Alert.fired_at.desc())
        .limit(limit)
        .all()
    )
    return rows


# ---------- model comparison (v1 vs v2, side by side) ----------
@app.get("/v1/compare")
def compare_models(model_ids: str, limit: int = 50, db: Session = Depends(get_db)):
    """
    model_ids: comma-separated, e.g. ?model_ids=fraud-v1,fraud-v2
    """
    ids = [m.strip() for m in model_ids.split(",") if m.strip()]
    result = {}
    for mid in ids:
        rows = (
            db.query(models.StatSnapshot)
            .filter_by(model_id=mid)
            .order_by(models.StatSnapshot.window_start.desc())
            .limit(limit)
            .all()
        )
        result[mid] = list(reversed(rows))
    return result
