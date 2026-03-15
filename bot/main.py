"""
BitMEX AI 자동매매봇 — 메인 엔트리포인트
APScheduler 3분 루프 + FastAPI 서버 동시 실행
"""
import os
import json
import logging
import asyncio
import uvicorn
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv

from exchange import fetch_ohlcv, fetch_balance, fetch_position, place_order, close_position, set_leverage
from indicators import calculate_indicators
from ai_agent import get_ai_decision
from risk import calc_position_size, check_daily_loss_limit, calc_stop_loss_price, calc_take_profit_price, validate_decision
from database import init_db, save_ai_log, save_trade, close_trade, get_bot_state, update_bot_state
from api_server import app, get_bot_enabled

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

SYMBOL = os.getenv("TRADE_SYMBOL", "BTC/USDT:USDT")
LEVERAGE = int(os.getenv("LEVERAGE", "1"))

# 현재 열린 트레이드 ID 추적
_open_trade_id: int | None = None


async def trading_cycle():
    """3분마다 실행되는 AI 매매 사이클"""
    global _open_trade_id

    if not get_bot_enabled():
        logger.info("봇 일시 정지 중 — 스킵")
        return

    logger.info("=== AI 매매 사이클 시작 ===")

    try:
        # 1. 데이터 수집
        df = fetch_ohlcv(timeframe="3m", limit=100)
        indicators = calculate_indicators(df)
        balance = fetch_balance()
        position = fetch_position()

        logger.info(f"현재가: ${indicators['current_price']:,.2f} | RSI: {indicators['rsi']} | 잔고: ${balance['total']:.2f}")

        # 2. 일일 손실 한도 확인
        state = get_bot_state()
        if state and check_daily_loss_limit(state.daily_pnl, state.starting_balance or balance['total']):
            logger.warning("일일 손실 한도 도달 — 자동 중단")
            update_bot_state(is_running=False)
            return

        # 3. AI 판단
        decision = get_ai_decision(indicators, position, balance)
        action = decision.get("action", "hold")
        confidence = decision.get("confidence", 0)
        reason = decision.get("reason", "")

        logger.info(f"AI 판단: {action.upper()} (신뢰도: {confidence:.2f})")
        logger.info(f"근거: {reason}")

        # 4. 유효성 검사
        is_valid, validate_reason = validate_decision(decision)

        executed = False
        skip_reason = None

        if not is_valid:
            skip_reason = validate_reason
            logger.info(f"진입 스킵: {skip_reason}")
        elif action == "hold":
            skip_reason = "HOLD — AI가 진입하지 않기로 결정"
            logger.info(skip_reason)
        elif action == "close" and position:
            # 포지션 청산
            result = close_position()
            if result:
                pnl = position.get("unrealized_pnl", 0)
                if _open_trade_id:
                    close_trade(_open_trade_id, pnl)
                    _open_trade_id = None
                update_bot_state(
                    daily_pnl=(state.daily_pnl or 0) + pnl,
                )
                executed = True
                logger.info(f"포지션 청산 완료 | PnL: {pnl:.4f} USDT")
        elif action in ("buy", "sell") and not position:
            # 신규 진입
            current_price = indicators["current_price"]
            stop_loss_pct = decision.get("stop_loss_pct", 0.015)
            take_profit_pct = decision.get("take_profit_pct", 0.03)

            amount = calc_position_size(balance["free"], current_price, stop_loss_pct)
            sl_price = calc_stop_loss_price(current_price, action, stop_loss_pct)
            tp_price = calc_take_profit_price(current_price, action, take_profit_pct)

            order = place_order(action, amount)
            _open_trade_id = save_trade(
                symbol=SYMBOL, side=action, amount=amount,
                entry_price=current_price,
                stop_loss_price=sl_price,
                take_profit_price=tp_price,
                order_id=order.get("order_id"),
            )
            update_bot_state(total_trades=(state.total_trades or 0) + 1)
            executed = True
            logger.info(f"주문 실행: {action.upper()} {amount} @ ${current_price:,.2f}")
        elif action in ("buy", "sell") and position:
            skip_reason = "이미 포지션 보유 중 — 신규 진입 스킵"
            logger.info(skip_reason)

        # 5. 포지션 손절/익절 모니터링
        if position and _open_trade_id:
            db_state = get_bot_state()
            entry = position.get("entry_price", 0)
            current = indicators["current_price"]
            pos_side = position.get("side", "")

            # 손절 체크
            sl_trigger = False
            if pos_side == "long" and current <= entry * (1 - 0.015):
                sl_trigger = True
            elif pos_side == "short" and current >= entry * (1 + 0.015):
                sl_trigger = True

            if sl_trigger:
                logger.warning("손절 트리거 — 포지션 청산")
                result = close_position()
                if result:
                    pnl = position.get("unrealized_pnl", 0)
                    close_trade(_open_trade_id, pnl)
                    _open_trade_id = None
                    update_bot_state(daily_pnl=(state.daily_pnl or 0) + pnl)
                    executed = True

        # 6. AI 로그 저장
        save_ai_log(
            action=action,
            confidence=confidence,
            reason=reason,
            indicators=json.dumps(indicators),
            executed=executed,
            skip_reason=skip_reason,
            input_tokens=decision.get("input_tokens"),
            output_tokens=decision.get("output_tokens"),
        )

    except Exception as e:
        logger.error(f"매매 사이클 오류: {e}", exc_info=True)


async def main():
    # DB 초기화
    init_db()

    # 레버리지 설정
    try:
        set_leverage(LEVERAGE)
        logger.info(f"레버리지 설정: {LEVERAGE}x")
    except Exception as e:
        logger.warning(f"레버리지 설정 실패 (무시): {e}")

    # 봇 시작 상태 기록
    try:
        balance = fetch_balance()
        update_bot_state(is_running=True, starting_balance=balance["total"], daily_pnl=0.0)
    except Exception as e:
        logger.warning(f"초기 잔고 조회 실패: {e}")
        update_bot_state(is_running=True)

    logger.info("🤖 BitMEX AI 자동매매봇 시작")
    logger.info(f"심볼: {SYMBOL} | 레버리지: {LEVERAGE}x | 3분 루프")

    # APScheduler 설정
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        trading_cycle,
        "interval",
        minutes=3,
        next_run_time=datetime.now(),  # 즉시 첫 실행
    )
    scheduler.start()

    # FastAPI 서버 실행
    port = int(os.getenv("API_PORT", "8000"))
    config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="warning")
    server = uvicorn.Server(config)

    logger.info(f"🌐 API 서버: http://0.0.0.0:{port}")
    await server.serve()


if __name__ == "__main__":
    asyncio.run(main())
