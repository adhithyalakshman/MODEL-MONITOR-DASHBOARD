"""
Database models — MVP scope only.
Tables:
  - models        : registered models (the "collections" in our Postman analogy)
  - predictions   : every logged prediction (raw event log)
  - labels        : delayed ground-truth labels, linked to a prediction
"""

from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class ModelRegistration(Base):
    __tablename__ = "models"

    id = Column(String, primary_key=True, default=gen_uuid)
    model_id = Column(String, unique=True, index=True, nullable=False)  # e.g. "fraud-detector-v1"
    name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    api_key = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    predictions = relationship("Prediction", back_populates="model")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String, primary_key=True, default=gen_uuid)
    model_id = Column(String, ForeignKey("models.model_id"), index=True, nullable=False)
    input_features = Column(JSON, nullable=False)     # {"age": 34, "income": 52000, ...}
    prediction = Column(Float, nullable=False)
    latency_ms = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    model = relationship("ModelRegistration", back_populates="predictions")
    label = relationship("Label", back_populates="prediction", uselist=False)


class Label(Base):
    __tablename__ = "labels"

    id = Column(String, primary_key=True, default=gen_uuid)
    prediction_id = Column(String, ForeignKey("predictions.id"), unique=True, index=True)
    actual_label = Column(Float, nullable=False)
    received_at = Column(DateTime, default=datetime.utcnow)

    prediction = relationship("Prediction", back_populates="label")


class StatSnapshot(Base):
    """
    Pre-computed rolling stats, written by the cron job (jobs/compute_stats.py).
    The dashboard reads from here instead of aggregating raw predictions live.
    """
    __tablename__ = "stat_snapshots"

    id = Column(String, primary_key=True, default=gen_uuid)
    model_id = Column(String, index=True, nullable=False)
    window_start = Column(DateTime, index=True, nullable=False)
    window_end = Column(DateTime, nullable=False)

    request_count = Column(Integer, default=0)
    p50_latency_ms = Column(Float)
    p95_latency_ms = Column(Float)
    p99_latency_ms = Column(Float)
    avg_prediction = Column(Float)
    prediction_histogram = Column(JSON)   # {"0.0-0.1": 12, "0.1-0.2": 30, ...}

    # Drift + accuracy
    psi_scores = Column(JSON, nullable=True)   # {"age": 0.03, "income": 0.21, ...}
    accuracy = Column(Float, nullable=True)    # rolling accuracy proxy, if labels present
    labeled_count = Column(Integer, default=0)


class Baseline(Base):
    """
    Reference distribution per feature, captured once at onboarding
    (or recomputed on demand). Drift is always measured against this.
    """
    __tablename__ = "baselines"

    id = Column(String, primary_key=True, default=gen_uuid)
    model_id = Column(String, index=True, nullable=False)
    feature_name = Column(String, nullable=False)
    values = Column(JSON, nullable=False)   # raw sample of numeric values used as reference
    created_at = Column(DateTime, default=datetime.utcnow)


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(String, primary_key=True, default=gen_uuid)
    model_id = Column(String, index=True, nullable=False)
    metric = Column(String, nullable=False)     # "p95_latency_ms" | "psi" | "accuracy"
    operator = Column(String, nullable=False)   # "gt" | "lt"
    threshold = Column(Float, nullable=False)
    feature_name = Column(String, nullable=True)  # only used when metric == "psi"
    created_at = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=gen_uuid)
    model_id = Column(String, index=True, nullable=False)
    rule_id = Column(String, ForeignKey("alert_rules.id"), nullable=False)
    metric = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    message = Column(String, nullable=False)
    fired_at = Column(DateTime, default=datetime.utcnow, index=True)
