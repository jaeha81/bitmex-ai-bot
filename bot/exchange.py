"""
BitMEX 거래소 연결 — ccxt (HMAC 서명 자동 처리)
"""
import os
import ccxt
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

SYMBOL = os.getenv("TRADE_SYMBOL", "BTC/USDT:USDT")
USE_TESTNET = os.getenv("USE_TESTNET", "false").lower() == "true"


def get_exchange() -> ccxt.bitmex:
    exchange = ccxt.bitmex({
        "apiKey": os.getenv("BITMEX_API_KEY"),
        "secret": os.getenv("BITMEX_SECRET"),
        "enableRateLimit": True,
    })
    if USE_TESTNET:
        exchange.set_sandbox_mode(True)
    return exchange


def fetch_ohlcv(timeframe: str = "3m", limit: int = 100) -> pd.DataFrame:
    """캔들 데이터 조회"""
    exchange = get_exchange()
    raw = exchange.fetch_ohlcv(SYMBOL, timeframe=timeframe, limit=limit)
    df = pd.DataFrame(raw, columns=["timestamp", "open", "high", "low", "close", "volume"])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    df = df.set_index("timestamp")
    return df


def fetch_balance() -> dict:
    """잔고 조회"""
    exchange = get_exchange()
    balance = exchange.fetch_balance()
    usdt = balance.get("USDT", {})
    return {
        "total": usdt.get("total", 0),
        "free": usdt.get("free", 0),
        "used": usdt.get("used", 0),
    }


def fetch_position() -> dict | None:
    """현재 포지션 조회"""
    exchange = get_exchange()
    positions = exchange.fetch_positions([SYMBOL])
    for pos in positions:
        if pos["symbol"] == SYMBOL and pos["contracts"] and pos["contracts"] != 0:
            return {
                "side": pos["side"],
                "contracts": pos["contracts"],
                "entry_price": pos["entryPrice"],
                "unrealized_pnl": pos["unrealizedPnl"],
                "liquidation_price": pos["liquidationPrice"],
                "leverage": pos["leverage"],
            }
    return None


def place_order(side: str, amount: float, order_type: str = "market", price: float = None) -> dict:
    """주문 실행"""
    exchange = get_exchange()
    if order_type == "market":
        order = exchange.create_order(SYMBOL, "market", side, amount)
    else:
        order = exchange.create_order(SYMBOL, "limit", side, amount, price)
    return {
        "order_id": order["id"],
        "symbol": order["symbol"],
        "side": order["side"],
        "amount": order["amount"],
        "price": order.get("price"),
        "status": order["status"],
    }


def close_position() -> dict | None:
    """포지션 전량 청산"""
    pos = fetch_position()
    if not pos:
        return None
    close_side = "sell" if pos["side"] == "long" else "buy"
    return place_order(close_side, abs(pos["contracts"]))


def set_leverage(leverage: int = 1):
    """레버리지 설정"""
    exchange = get_exchange()
    exchange.set_leverage(leverage, SYMBOL)
