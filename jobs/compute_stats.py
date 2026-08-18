"""
Stats Processor — MVP Step 2 (+ Step 4 stub for drift)

Run this on a schedule (cron, Airflow, or just `while True: sleep(300)` for MVP).
It reads raw predictions for the last window, computes latency/volume/
distribution stats, and writes a StatSnapshot row the API can serve instantly.

Run manually:
    python -m jobs.compute_stats

Run every 5 minutes via cron:
    */5 * * * * cd /path/to/project && python -m jobs.compute_stats
"""

import numpy as np
from datetime import datetime, timedelta

from app.database import SessionLocal
from app import models

WINDOW_MINUTES = 5


def compute_percentiles(latencies):
    if not latencies:
        return None, None, None
    arr = np.array(latencies)
    return (
        float(np.percentile(arr, 50)),
        float(np.percentile(arr, 95)),
        float(np.percentile(arr, 99)),
    )


def compute_histogram(predictions, bins=10):
    if not predictions:
        return {}
    counts, edges = np.histogram(predictions, bins=bins, range=(0, 1))
    return {
        f"{edges[i]:.2f}-{edges[i+1]:.2f}": int(counts[i])
        for i in range(len(counts))
    }


def calculate_psi(baseline: np.ndarray, current: np.ndarray, bins: int = 10) -> float:
    """
    Population Stability Index between a baseline distribution and current window.
    PSI < 0.1  -> no significant shift
    PSI 0.1-0.2 -> moderate shift, watch it
    PSI > 0.2  -> significant drift, alert
    (MVP Step 4 — wired here so the processor is ready when baselines are captured.)
    """
    if len(baseline) == 0 or len(current) == 0:
        return 0.0

    breakpoints = np.linspace(min(baseline.min(), current.min()),
                               max(baseline.max(), current.max()), bins + 1)

    base_counts, _ = np.histogram(baseline, bins=breakpoints)
    curr_counts, _ = np.histogram(current, bins=breakpoints)

    base_pct = np.where(base_counts == 0, 0.0001, base_counts / len(baseline))
    curr_pct = np.where(curr_counts == 0, 0.0001, curr_counts / len(current))

    psi = np.sum((curr_pct - base_pct) * np.log(curr_pct / base_pct))
    return float(psi)


def compute_drift(db, model_id: str, rows) -> dict:
    """Compare current window's feature values against the stored baseline."""
    baselines = db.query(models.Baseline).filter_by(model_id=model_id).all()
    if not baselines:
        return {}

    psi_scores = {}
    for baseline in baselines:
        feature_name = baseline.feature_name
        current_values = [
            r.input_features[feature_name]
            for r in rows
            if feature_name in r.input_features and isinstance(r.input_features[feature_name], (int, float))
        ]
        if not current_values:
            continue
        psi_scores[feature_name] = round(
            calculate_psi(np.array(baseline.values), np.array(current_values)), 4
        )
    return psi_scores


def compute_accuracy(db, rows) -> tuple:
    """Rolling accuracy over predictions in this window that have a label attached."""
    prediction_ids = [r.id for r in rows]
    labels = (
        db.query(models.Label)
        .filter(models.Label.prediction_id.in_(prediction_ids))
        .all()
    )
    if not labels:
        return None, 0

    label_map = {l.prediction_id: l.actual_label for l in labels}
    correct = 0
    for r in rows:
        if r.id in label_map:
            predicted_class = 1 if r.prediction >= 0.5 else 0
            actual_class = 1 if label_map[r.id] >= 0.5 else 0
            correct += int(predicted_class == actual_class)

    accuracy = correct / len(labels)
    return round(accuracy, 4), len(labels)


def evaluate_alerts(db, model_id: str, snapshot: "models.StatSnapshot"):
    """Check this window's snapshot against configured alert rules; write Alert rows."""
    rules = db.query(models.AlertRule).filter_by(model_id=model_id).all()
    for rule in rules:
        value = None
        if rule.metric == "p95_latency_ms":
            value = snapshot.p95_latency_ms
        elif rule.metric == "accuracy":
            value = snapshot.accuracy
        elif rule.metric == "psi" and rule.feature_name and snapshot.psi_scores:
            value = snapshot.psi_scores.get(rule.feature_name)

        if value is None:
            continue

        breached = (rule.operator == "gt" and value > rule.threshold) or \
                   (rule.operator == "lt" and value < rule.threshold)

        if breached:
            db.add(models.Alert(
                model_id=model_id,
                rule_id=rule.id,
                metric=rule.metric,
                value=value,
                threshold=rule.threshold,
                message=f"{rule.metric} = {value} ({'>' if rule.operator == 'gt' else '<'} {rule.threshold})",
            ))


def run():
    db = SessionLocal()
    try:
        window_end = datetime.utcnow()
        window_start = window_end - timedelta(minutes=WINDOW_MINUTES)

        model_ids = [m.model_id for m in db.query(models.ModelRegistration).all()]

        for model_id in model_ids:
            rows = (
                db.query(models.Prediction)
                .filter(
                    models.Prediction.model_id == model_id,
                    models.Prediction.timestamp >= window_start,
                    models.Prediction.timestamp < window_end,
                )
                .all()
            )

            if not rows:
                continue

            latencies = [r.latency_ms for r in rows]
            predictions = [r.prediction for r in rows]

            p50, p95, p99 = compute_percentiles(latencies)
            psi_scores = compute_drift(db, model_id, rows)
            accuracy, labeled_count = compute_accuracy(db, rows)

            snapshot = models.StatSnapshot(
                model_id=model_id,
                window_start=window_start,
                window_end=window_end,
                request_count=len(rows),
                p50_latency_ms=p50,
                p95_latency_ms=p95,
                p99_latency_ms=p99,
                avg_prediction=float(np.mean(predictions)),
                prediction_histogram=compute_histogram(predictions),
                psi_scores=psi_scores or None,
                accuracy=accuracy,
                labeled_count=labeled_count,
            )
            db.add(snapshot)
            db.flush()  # so snapshot has an id / values available before alert check

            evaluate_alerts(db, model_id, snapshot)

            print(f"[{model_id}] window={window_start}->{window_end} "
                  f"n={len(rows)} p95={p95:.1f}ms drift={psi_scores} acc={accuracy}")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
