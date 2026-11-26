"""Train the paper's static XGBoost pathway and save inference artifacts.

This script deliberately trains only the XGBoost flow classifier. The
Bi-LSTM/VAE temporal pathway and calibrated late-fusion logic are separate
research milestones and are not represented by this artifact.
"""
import json
import logging

import joblib
import pandas as pd
import xgboost as xgb
from sklearn.metrics import (
    accuracy_score, confusion_matrix, f1_score, precision_score,
    recall_score, roc_auc_score,
)
from sklearn.preprocessing import RobustScaler
from src.config import DATA_PROCESSED, MODEL_DIR, FEATURE_COLUMNS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def train_ensemble():
    data_path = DATA_PROCESSED / "full_df.csv"
    if not data_path.exists():
        raise FileNotFoundError(f"Processed dataset not found: {data_path}")

    df = pd.read_csv(data_path)
    missing = [column for column in FEATURE_COLUMNS + ["binary_label"] if column not in df.columns]
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")
    if "timestamp" not in df.columns:
        raise ValueError(
            "Chronological evaluation requires a timestamp column. Re-run "
            "src/ml/prepare_dataset.py with source files that contain Timestamp."
        )

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["timestamp"]).sort_values("timestamp", kind="stable").reset_index(drop=True)
    split_index = int(len(df) * 0.8)
    if split_index <= 0 or split_index >= len(df):
        raise ValueError("Dataset is too small for an 80/20 chronological split.")

    train_df = df.iloc[:split_index]
    test_df = df.iloc[split_index:]
    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df["binary_label"].astype(int)
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["binary_label"].astype(int)
    if y_train.nunique() < 2:
        raise ValueError("Training partition must contain both benign and attack samples.")

    scaler = RobustScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train_scaled, y_train)

    predictions = model.predict(X_test_scaled)
    probabilities = model.predict_proba(X_test_scaled)[:, 1]
    tn, fp, fn, tp = confusion_matrix(y_test, predictions, labels=[0, 1]).ravel()
    metrics = {
        "dataset_file": data_path.name,
        "split": "chronological_80_20_before_temporal_windowing",
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "train_start": str(train_df["timestamp"].min()),
        "train_end": str(train_df["timestamp"].max()),
        "test_start": str(test_df["timestamp"].min()),
        "test_end": str(test_df["timestamp"].max()),
        "feature_columns": FEATURE_COLUMNS,
        "threshold": 0.5,
        "accuracy": float(accuracy_score(y_test, predictions)),
        "precision": float(precision_score(y_test, predictions, zero_division=0)),
        "recall": float(recall_score(y_test, predictions, zero_division=0)),
        "f1": float(f1_score(y_test, predictions, zero_division=0)),
        "false_positive_rate": float(fp / (fp + tn)) if (fp + tn) else None,
        "roc_auc": float(roc_auc_score(y_test, probabilities)) if y_test.nunique() == 2 else None,
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(scaler, MODEL_DIR / "scaler.pkl")
    joblib.dump(model, MODEL_DIR / "ensemble_model.pkl")
    with open(MODEL_DIR / "metrics.json", "w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)
    logger.info("Saved XGBoost model, scaler, and chronological evaluation metrics to %s", MODEL_DIR)
    logger.info("Evaluation metrics: %s", json.dumps(metrics, indent=2))
    return metrics


if __name__ == "__main__":
    train_ensemble()