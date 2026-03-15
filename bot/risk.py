"""
리스크 관리 — 포지션 사이즈 계산, 손절/익절
"""
import os
from dotenv import load_dotenv

load_dotenv()

RISK_PER_TRADE = float(os.getenv("RISK_PER_TRADE", "0.02"))   # 잔고의 2%
STOP_LOSS_PCT = float(os.getenv("STOP_LOSS_PCT", "0.015"))     # 1.5% 손절
MAX_DAILY_LOSS_PCT = float(os.getenv("MAX_DAILY_LOSS_PCT", "0.05"))  # 5% 최대 일일 손실


def calc_position_size(balance_usdt: float, current_price: float, stop_loss_pct: float = None) -> float:
    """
    고정 리스크 기반 포지션 사이즈 계산
    size = (잔고 * 리스크%) / (진입가 * 손절%)
    """
    sl_pct = stop_loss_pct or STOP_LOSS_PCT
    risk_amount = balance_usdt * RISK_PER_TRADE
    contracts = risk_amount / (current_price * sl_pct)
    # 최소 0.001 BTC, 소수점 3자리까지
    return max(0.001, round(contracts, 3))


def check_daily_loss_limit(daily_pnl: float, starting_balance: float) -> bool:
    """
    일일 손실 한도 초과 여부 확인
    True이면 거래 중단해야 함
    """
    if starting_balance <= 0:
        return False
    loss_pct = abs(daily_pnl) / starting_balance
    return daily_pnl < 0 and loss_pct >= MAX_DAILY_LOSS_PCT


def calc_stop_loss_price(entry_price: float, side: str, stop_loss_pct: float = None) -> float:
    """손절가 계산"""
    sl_pct = stop_loss_pct or STOP_LOSS_PCT
    if side == "buy":
        return entry_price * (1 - sl_pct)
    return entry_price * (1 + sl_pct)


def calc_take_profit_price(entry_price: float, side: str, take_profit_pct: float = 0.03) -> float:
    """익절가 계산"""
    if side == "buy":
        return entry_price * (1 + take_profit_pct)
    return entry_price * (1 - take_profit_pct)


def validate_decision(decision: dict, confidence_threshold: float = 0.65) -> tuple[bool, str]:
    """
    AI 판단 유효성 검사
    Returns: (is_valid, reason)
    """
    action = decision.get("action", "hold")

    if action == "hold":
        return True, "HOLD — 진입 없음"

    confidence = decision.get("confidence", 0)
    if confidence < confidence_threshold:
        return False, f"신뢰도 부족: {confidence:.2f} < {confidence_threshold}"

    if action not in ("buy", "sell", "close"):
        return False, f"알 수 없는 액션: {action}"

    return True, "유효한 신호"
