"""
FastAPI REST API — 대시보드에서 봇 데이터 조회
GET /status       — 봇 상태 + 잔고 + 포지션
GET /trades       — 최근 거래 내역
GET /ai-logs      — AI 판단 로그
GET /metrics      — 성과 지표
POST /bot/start   — 봇 시작
POST /bot/stop    — 봇 정지
"""
import os
import json
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc
from dotenv import load_dotenv

from database import SessionLocal, AILog, Trade, BotState, get_bot_state
from exchange import fetch_balance, fetch_position

load_dotenv()

BOT_SECRET = os.getenv("BOT_SECRET", "")

app = FastAPI(title="BitMEX AI Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_secret(x_bot_secret: str = Header(default="")):
    if BOT_SECRET and x_bot_secret != BOT_SECRET:
        raise HTTPException(status_code=401, detail="인증 실패")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/status")
async def get_status(x_bot_secret: str = Header(default="")):
    verify_secret(x_bot_secret)
    try:
        balance = fetch_balance()
        position = fetch_position()
    except Exception as e:
        balance = {"total": 0, "free": 0, "error": str(e)}
        position = None

    state = get_bot_state()

    return {
        "bot_running": state.is_running if state else False,
        "balance": balance,
        "position": position,
        "daily_pnl": state.daily_pnl if state else 0,
        "total_trades": state.total_trades if state else 0,
        "winning_trades": state.winning_trades if state else 0,
    }


@app.get("/trades")
async def get_trades(limit: int = 20, x_bot_secret: str = Header(default="")):
    verify_secret(x_bot_secret)
    db = SessionLocal()
    try:
        trades = (
            db.query(Trade)
            .order_by(desc(Trade.created_at))
            .limit(limit)
            .all()
        )
        return {
            "trades": [
                {
                    "id": t.id,
                    "symbol": t.symbol,
                    "side": t.side,
                    "amount": t.amount,
                    "entry_price": t.entry_price,
                    "pnl": t.pnl,
                    "status": t.status,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                    "closed_at": t.closed_at.isoformat() if t.closed_at else None,
                }
                for t in trades
            ]
        }
    finally:
        db.close()


@app.get("/ai-logs")
async def get_ai_logs(limit: int = 30, x_bot_secret: str = Header(default="")):
    verify_secret(x_bot_secret)
    db = SessionLocal()
    try:
        logs = (
            db.query(AILog)
            .order_by(desc(AILog.created_at))
            .limit(limit)
            .all()
        )
        return {
            "logs": [
                {
                    "id": l.id,
                    "action": l.action,
                    "confidence": l.confidence,
                    "reason": l.reason,
                    "executed": l.executed,
                    "skip_reason": l.skip_reason,
                    "created_at": l.created_at.isoformat() if l.created_at else None,
                }
                for l in logs
            ]
        }
    finally:
        db.close()


@app.get("/metrics")
async def get_metrics(x_bot_secret: str = Header(default="")):
    verify_secret(x_bot_secret)
    db = SessionLocal()
    try:
        total = db.query(Trade).count()
        closed = db.query(Trade).filter(Trade.status == "closed").all()
        wins = [t for t in closed if t.pnl and t.pnl > 0]
        losses = [t for t in closed if t.pnl and t.pnl <= 0]

        total_pnl = sum(t.pnl for t in closed if t.pnl)
        win_rate = len(wins) / len(closed) * 100 if closed else 0
        avg_win = sum(t.pnl for t in wins) / len(wins) if wins else 0
        avg_loss = sum(t.pnl for t in losses) / len(losses) if losses else 0

        return {
            "total_trades": total,
            "closed_trades": len(closed),
            "win_rate": round(win_rate, 2),
            "total_pnl": round(total_pnl, 4),
            "avg_win": round(avg_win, 4),
            "avg_loss": round(avg_loss, 4),
        }
    finally:
        db.close()


# 봇 ON/OFF는 bot_runner 모듈의 전역 플래그로 제어
_bot_enabled = {"value": True}


@app.post("/bot/start")
async def start_bot(x_bot_secret: str = Header(default="")):
    verify_secret(x_bot_secret)
    _bot_enabled["value"] = True
    from database import update_bot_state
    update_bot_state(is_running=True)
    return {"status": "started"}


@app.post("/bot/stop")
async def stop_bot(x_bot_secret: str = Header(default="")):
    verify_secret(x_bot_secret)
    _bot_enabled["value"] = False
    from database import update_bot_state
    update_bot_state(is_running=False)
    return {"status": "stopped"}


def get_bot_enabled() -> bool:
    return _bot_enabled["value"]
