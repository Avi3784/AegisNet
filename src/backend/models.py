from sqlalchemy import Column, Integer, BigInteger, String, Text, Boolean
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)

class Flow(Base):
    __tablename__ = "flows"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(BigInteger, index=True)
    src_ip = Column(String)
    src_port = Column(Integer)
    dst_ip = Column(String)
    dst_port = Column(Integer)
    protocol = Column(String)
    flags = Column(String)
    prediction = Column(Integer)

class Threat(Base):
    __tablename__ = "threats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(BigInteger, index=True)
    attack_type = Column(String)
    threat_analysis = Column(Text)
    confidence = Column(String)
    mitigation_json = Column(Text)

class Blocklist(Base):
    __tablename__ = "blocklist"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(BigInteger, index=True)
    ip = Column(String, unique=True, nullable=False)
    reason = Column(String)

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text)

class MLFeedback(Base):
    __tablename__ = "ml_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    threat_id = Column(Integer, nullable=True)
    is_true_positive = Column(Boolean, default=True)
    timestamp = Column(BigInteger)
