"""
SQLite 데이터베이스 — 거래 기록 / AI 판단 로그
"""
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker

DB_URL = os.getenv("DATABASE_URL", "sqlite:///./bot_data.db")

engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String, nullable=True)
    symbol = Column(String, nullable=False)
    side = Column(String, nullable=False)          # buy / sell / close
    amount = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=True)
    stop_loss_price = Column(Float, nullable=True)
    take_profit_price = Column(Float, nullable=True)
    pnl = Column(Float, nullable=True)
    status = Column(String, nullable=False, default="open")  # open / closed / failed
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)


class AILog(Base):
    __tablename__ = "ai_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    confidence = Column(Float, nullable=True)
    reason = Column(Text, nullable=True)
    indicators = Column(Text, nullable=True)   # JSON
    executed = Column(Boolean, default=False)
    skip_reason = Column(String, nullable=True)
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class BotState(Base):
    __tablename__ = "bot_state"

    id = Column(Integer, primary_key=True, index=True)
    is_running = Column(Boolean, default=False)
    starting_balance = Column(Float, nullable=True)
    daily_pnl = Column(Float, default=0.0)
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)
    # 봇 상태 초기 레코드
    db = SessionLocal()
    try:
        if not db.query(BotState).first():
            db.add(BotState(is_running=False))
            db.commit()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def save_ai_log(action: str, confidence: float, reason: str, indicators: str,
                executed: bool, skip_reason: str = None,
                input_tokens: int = None, output_tokens: int = None):
    db = SessionLocal()
    try:
        log = AILog(
            action=action, confidence=confidence, reason=reason,
            indicators=indicators, executed=executed, skip_reason=skip_reason,
            input_tokens=input_tokens, output_tokens=output_tokens,
        )
        db.add(log)
        db.commit()
    finally:
        db.close()


def save_trade(symbol: str, side: str, amount: float, entry_price: float,
               stop_loss_price: float = None, take_profit_price: float = None,
               order_id: str = None) -> int:
    db = SessionLocal()
    try:
        trade = Trade(
            order_id=order_id, symbol=symbol, side=side, amount=amount,
            entry_price=entry_price, stop_loss_price=stop_loss_price,
            take_profit_price=take_profit_price, status="open",
        )
        db.add(trade)
        db.commit()
        db.refresh(trade)
        return trade.id
    finally:
        db.close()


def close_trade(trade_id: int, pnl: float):
    db = SessionLocal()
    try:
        trade = db.query(Trade).filter(Trade.id == trade_id).first()
        if trade:
            trade.pnl = pnl
            trade.status = "closed"
            trade.closed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


def get_bot_state() -> BotState:
    db = SessionLocal()
    try:
        return db.query(BotState).first()
    finally:
        db.close()


def update_bot_state(**kwargs):
    db = SessionLocal()
    try:
        state = db.query(BotState).first()
        for k, v in kwargs.items():
            setattr(state, k, v)
        state.updated_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()
