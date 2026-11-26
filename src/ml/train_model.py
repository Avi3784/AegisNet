"""Canonical training entry point for AegisNet's static XGBoost pathway."""
from src.ml.ensemble_model import train_ensemble


def train_and_evaluate():
    """Train and evaluate XGBoost using the shared chronological protocol."""
    return train_ensemble()


if __name__ == "__main__":
    train_and_evaluate()