import json
import logging
import time
from pathlib import Path
import bcrypt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.config import PROJECT_ROOT
from src.backend.models import Base, User, Flow, Threat, Blocklist, Settings, MLFeedback

logger = logging.getLogger(__name__)

DB_PATH = PROJECT_ROOT / "data" / "aegis.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_users(db)
        finally:
            db.close()
        logger.info("Database initialized successfully with SQLAlchemy.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")

def seed_users(db):
    if db.query(User).count() == 0:
        admin_hash = hash_password("admin123")
        analyst_hash = hash_password("analyst123")
        db.add(User(username="admin", password_hash=admin_hash, role="admin"))
        db.add(User(username="analyst", password_hash=analyst_hash, role="analyst"))
        db.commit()
        logger.info("Seeded default users (admin/admin123, analyst/analyst123)")

def insert_flow(flow_data):
    db = SessionLocal()
    try:
        flow_info = flow_data.get("flow", {})
        flow = Flow(
            timestamp=flow_data.get("timestamp"),
            src_ip=flow_info.get("src_ip"),
            src_port=flow_info.get("src_port"),
            dst_ip=flow_info.get("dst_ip"),
            dst_port=flow_info.get("dst_port"),
            protocol=flow_info.get("protocol"),
            flags=flow_info.get("flags"),
            prediction=flow_info.get("prediction")
        )
        db.add(flow)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to insert flow: {e}")
    finally:
        db.close()

def insert_threat(threat_data):
    db = SessionLocal()
    try:
        cog = threat_data.get("cognitive_report", {})
        mitigation = json.dumps(cog.get("Recommended_Mitigation", []))
        threat = Threat(
            timestamp=threat_data.get("timestamp"),
            attack_type=threat_data.get("attack_type"),
            threat_analysis=cog.get("Threat_Analysis", ""),
            confidence=cog.get("Confidence_Validation", ""),
            mitigation_json=mitigation
        )
        db.add(threat)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to insert threat: {e}")
    finally:
        db.close()

def insert_block(ip, reason, timestamp):
    db = SessionLocal()
    try:
        existing = db.query(Blocklist).filter(Blocklist.ip == ip).first()
        if not existing:
            block = Blocklist(timestamp=timestamp, ip=ip, reason=reason)
            db.add(block)
            db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to insert block: {e}")
    finally:
        db.close()

def get_recent_flows(limit=100):
    db = SessionLocal()
    try:
        rows = db.query(Flow).order_by(Flow.timestamp.desc()).limit(limit).all()
        result = []
        for row in rows:
            result.append({
                "type": "flow",
                "timestamp": row.timestamp,
                "flow": {
                    "src_ip": row.src_ip,
                    "src_port": row.src_port,
                    "dst_ip": row.dst_ip,
                    "dst_port": row.dst_port,
                    "protocol": row.protocol,
                    "flags": row.flags,
                    "prediction": row.prediction
                }
            })
        return result[::-1]
    finally:
        db.close()

def get_recent_threats(limit=100):
    db = SessionLocal()
    try:
        rows = db.query(Threat).order_by(Threat.timestamp.desc()).limit(limit).all()
        result = []
        for row in rows:
            mitigation = []
            if row.mitigation_json:
                try:
                    mitigation = json.loads(row.mitigation_json)
                except Exception:
                    mitigation = []
            result.append({
                "type": "threat",
                "timestamp": row.timestamp,
                "attack_type": row.attack_type,
                "cognitive_report": {
                    "Threat_Analysis": row.threat_analysis or "",
                    "Confidence_Validation": row.confidence or "",
                    "Recommended_Mitigation": mitigation
                }
            })
        return result
    finally:
        db.close()

def get_blocklist():
    db = SessionLocal()
    try:
        rows = db.query(Blocklist).order_by(Blocklist.timestamp.desc()).all()
        result = []
        for row in rows:
            result.append({
                "type": "block",
                "timestamp": row.timestamp,
                "ip": row.ip,
                "reason": row.reason
            })
        return result
    finally:
        db.close()

def get_setting(key: str):
    db = SessionLocal()
    try:
        setting = db.query(Settings).filter(Settings.key == key).first()
        return setting.value if setting else None
    finally:
        db.close()

def set_setting(key: str, value: str):
    db = SessionLocal()
    try:
        setting = db.query(Settings).filter(Settings.key == key).first()
        if setting:
            setting.value = value
        else:
            setting = Settings(key=key, value=value)
            db.add(setting)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to set setting {key}: {e}")
    finally:
        db.close()

def insert_ml_feedback(threat_id: int, is_true_positive: bool = True, timestamp: int = None):
    if timestamp is None:
        timestamp = int(time.time() * 1000)
    db = SessionLocal()
    try:
        fb = MLFeedback(threat_id=threat_id, is_true_positive=is_true_positive, timestamp=timestamp)
        db.add(fb)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to insert ML feedback: {e}")
    finally:
        db.close()
