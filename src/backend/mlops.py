import asyncio
import xgboost as xgb
import joblib
import pandas as pd
import logging
from src.config import MODEL_DIR, FEATURE_COLUMNS

logger = logging.getLogger(__name__)

async def retrain_model_incremental(feedback_data):
    """
    Loads MODEL_DIR / ensemble_model.pkl, creates an xgb.DMatrix from the feedback flow features, 
    trains it for a few rounds with xgb_model=existing_model, and saves it back.
    """
    try:
        model_path = MODEL_DIR / "ensemble_model.pkl"
        scaler_path = MODEL_DIR / "scaler.pkl"
        
        features = feedback_data.get("features")
        if not features:
            logger.warning("No features provided for retraining")
            return
            
        clean = {}
        for col in FEATURE_COLUMNS:
            val = float(features.get(col, 0.0))
            clean[col] = 1e9 if val == float('inf') else val
            
        df = pd.DataFrame([clean])[FEATURE_COLUMNS]
        scaler = joblib.load(scaler_path)
        scaled_features = scaler.transform(df)
        
        # Label is 1 for threat, 0 for benign
        label = 1 if feedback_data.get("is_true_positive", True) else 0
        
        dtrain = xgb.DMatrix(scaled_features, label=[label])
        
        existing_model = joblib.load(model_path)
        
        # Get booster if scikit-learn API is used, otherwise use as is
        if hasattr(existing_model, 'get_booster'):
            xgb_model = existing_model.get_booster()
            params = existing_model.get_params() if hasattr(existing_model, 'get_params') else {'objective': 'binary:logistic'}
            # Convert compatible params or default to simple params to avoid native mismatch
            xgb_params = {'objective': 'binary:logistic'}
            booster = xgb.train(xgb_params, dtrain, num_boost_round=5, xgb_model=xgb_model)
            existing_model._Booster = booster
            joblib.dump(existing_model, model_path)
        else:
            booster = xgb.train({'objective': 'binary:logistic'}, dtrain, num_boost_round=5, xgb_model=existing_model)
            joblib.dump(booster, model_path)
            
        logger.info(f"Model retrained incrementally with threat_id {feedback_data.get('threat_id')}")
        
    except Exception as e:
        logger.error(f"Error retraining model: {e}")
