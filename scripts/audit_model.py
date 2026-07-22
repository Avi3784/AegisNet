import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import cross_val_score, StratifiedKFold, train_test_split
from sklearn.metrics import confusion_matrix, classification_report
from sklearn.preprocessing import RobustScaler
from src.config import DATA_PROCESSED, FEATURE_COLUMNS
import json
import os

def run_audit():
    print("Loading dataset for audit...")
    df = pd.read_csv(DATA_PROCESSED / "full_df.csv")
    
    X = df[FEATURE_COLUMNS].values
    y = df["binary_label"].values
    
    print("Scaling features...")
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X)
    
    print("Initializing XGBoost Model...")
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        n_jobs=-1
    )
    
    print("Running 5-Fold Cross-Validation (This may take a minute)...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(model, X_scaled, y, cv=cv, scoring='accuracy')
    
    print(f"\nCV Accuracy Scores: {scores}")
    print(f"Mean CV Accuracy: {np.mean(scores):.4f}")
    print(f"CV Standard Deviation: {np.std(scores):.4f}")
    
    print("\nTraining on 80% split for Confusion Matrix...")
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)
    model.fit(X_train, y_train)
    
    train_acc = model.score(X_train, y_train)
    test_acc = model.score(X_test, y_test)
    
    print(f"Train Accuracy: {train_acc:.4f}")
    print(f"Test Accuracy: {test_acc:.4f}")
    gap = train_acc - test_acc
    print(f"Train/Test Gap: {gap:.4f} (If > 0.05, possible overfitting)")
    
    y_pred = model.predict(X_test)
    cm = confusion_matrix(y_test, y_pred)
    print("\nConfusion Matrix (Test Set):")
    print(cm)
    
    report = classification_report(y_test, y_pred, target_names=["NORMAL", "THREAT"], output_dict=True)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["NORMAL", "THREAT"]))
    
    # Feature Importances
    importances = model.feature_importances_
    feature_importance_dict = {FEATURE_COLUMNS[i]: float(importances[i]) for i in range(len(FEATURE_COLUMNS))}
    sorted_importances = dict(sorted(feature_importance_dict.items(), key=lambda item: item[1], reverse=True))
    
    print("\nTop 5 Most Important Features:")
    for k, v in list(sorted_importances.items())[:5]:
        print(f"  {k}: {v:.4f}")
        
    audit_results = {
        "cv_mean_accuracy": float(np.mean(scores)),
        "cv_std_accuracy": float(np.std(scores)),
        "train_accuracy": float(train_acc),
        "test_accuracy": float(test_acc),
        "overfitting_gap": float(gap),
        "feature_importances": sorted_importances,
        "classification_report": report
    }
    
    with open("models/model_health_report.json", "w") as f:
        json.dump(audit_results, f, indent=4)
        
    print("\nAudit complete. Results saved to models/model_health_report.json")

if __name__ == "__main__":
    run_audit()
