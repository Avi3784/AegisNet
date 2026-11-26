"""Legacy feedback hook.

Single analyst labels must not mutate the production model. Feedback is
stored for a separately reviewed, batch retraining and evaluation process.
"""
import logging

logger = logging.getLogger(__name__)


async def retrain_model_incremental(feedback_data):
    """Reject unsafe single-sample online updates; retain API compatibility."""
    logger.warning(
        "Online model mutation is disabled. Feedback for threat_id=%s was not used to train a model.",
        feedback_data.get("threat_id"),
    )
    return False