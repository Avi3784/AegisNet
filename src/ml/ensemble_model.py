import pandas as pd
import xgboost as xgb
import lightgbm as lgb
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import RobustScaler
import joblib
from src.config import DATA_PROCESSED, MODEL_DIR, FEATURE_COLUMNS
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def train_ensemble():
    logger.info("Loading processed dataset...")
    df = pd.read_csv(DATA_PROCESSED / "full_df.csv")
    
    X = df[FEATURE_COLUMNS].values
    y = df["binary_label"].values

    logger.info("Scaling features...")
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Save the scaler so the pipeline can use it
    joblib.dump(scaler, MODEL_DIR / "scaler.pkl")

    logger.info("Initializing models...")
    xgb_clf = xgb.XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, n_jobs=-1)
    lgb_clf = lgb.LGBMClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, n_jobs=-1)
    rf_clf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)

    logger.info("Creating Voting Ensemble (Hard Voting)...")
    ensemble = VotingClassifier(
        estimators=[
            ('xgb', xgb_clf),
            ('lgb', lgb_clf),
            ('rf', rf_clf)
        ],
        voting='hard' # Majority wins
    )

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)
    
    logger.info("Training Ensemble Model (this may take a few minutes)...")
    ensemble.fit(X_train, y_train)
    
    logger.info(f"Ensemble Test Accuracy: {ensemble.score(X_test, y_test):.4f}")

    logger.info("Saving Ensemble Model...")
    joblib.dump(ensemble, MODEL_DIR / "ensemble_model.pkl")
    logger.info(f"Model saved to {MODEL_DIR / 'ensemble_model.pkl'}")

if __name__ == "__main__":
    train_ensemble()
