from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ModelBase(BaseModel):
    model_config = ConfigDict(protected_namespaces=())


class ModelCreate(ModelBase):
    model_id: str
    name: str
    version: str


class ModelOut(ModelBase):
    model_id: str
    name: str
    version: str
    api_key: str

    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)


class PredictionIn(ModelBase):
    model_id: str
    input_features: dict
    prediction: float
    latency_ms: float
    timestamp: Optional[datetime] = None


class PredictionOut(ModelBase):
    id: str
    model_id: str
    timestamp: datetime

    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)


class LabelIn(ModelBase):
    prediction_id: str
    actual_label: float


class AlertRuleIn(ModelBase):
    metric: str        # "p95_latency_ms" | "psi" | "accuracy"
    operator: str       # "gt" | "lt"
    threshold: float
    feature_name: Optional[str] = None


class BaselineCaptureIn(ModelBase):
    # Optional: capture from the last N logged predictions instead of raw data
    from_recent: Optional[int] = 500
