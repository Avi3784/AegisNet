import os
import json
import joblib
import logging
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import RobustScaler
from sklearn.metrics import classification_report, f1_score, precision_score, recall_score, accuracy_score
import xgboost as xgb
from src.config import DATA_PROCESSED, MODEL_DIR, FEATURE_COLUMNS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def train_and_evaluate():
    data_path = DATA_PROCESSED / "full_df.csv"
    if not data_path.exists():
        raise FileNotFoundError(f"Processed dataset not found at {data_path}. Run prepare_dataset.py first.")
        
    logger.info("Loading processed dataset...")
    df = pd.read_csv(data_path)
    
    X = df[FEATURE_COLUMNS]
    y = df['binary_label']
    
    logger.info("Splitting dataset into 80/20 train/test...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    logger.info("Applying RobustScaler...")
    scaler = RobustScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    logger.info("Training XGBoost Classifier...")
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        use_label_encoder=False,
        eval_metric='logloss',
        n_jobs=-1
    )
    
    model.fit(
        X_train_scaled, 
        y_train,
        eval_set=[(X_test_scaled, y_test)],
        verbose=10
    )
    
    logger.info("Evaluating model...")
    y_pred = model.predict(X_test_scaled)
    
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    
    metrics = {
        "accuracy": float(acc),
        "f1_score": float(f1),
        "precision": float(prec),
        "recall": float(rec)
    }
    
    logger.info(f"Metrics: {json.dumps(metrics, indent=2)}")
    
    logger.info("Saving model and scaler...")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    scaler_path = MODEL_DIR / "scaler.pkl"
    joblib.dump(scaler, scaler_path)
    
    model_path = MODEL_DIR / "aegis_xgb.json"
    model.save_model(model_path)
    
    metrics_path = MODEL_DIR / "metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=4)
        
    logger.info("Training pipeline complete.")

if __name__ == "__main__":
    train_and_evaluate()
