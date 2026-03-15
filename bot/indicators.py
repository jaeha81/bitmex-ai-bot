"""
기술 지표 계산 — pandas-ta
RSI / MACD / EMA / 볼린저밴드
"""
import pandas as pd
import pandas_ta as ta


def calculate_indicators(df: pd.DataFrame) -> dict:
    """
    OHLCV 데이터프레임을 받아 주요 기술 지표 딕셔너리 반환
    """
    close = df["close"]
    high = df["high"]
    low = df["low"]

    # RSI (14)
    rsi_series = ta.rsi(close, length=14)
    rsi = float(rsi_series.iloc[-1]) if rsi_series is not None else None

    # MACD (12, 26, 9)
    macd_df = ta.macd(close, fast=12, slow=26, signal=9)
    if macd_df is not None and not macd_df.empty:
        macd_val = float(macd_df["MACD_12_26_9"].iloc[-1])
        macd_signal = float(macd_df["MACDs_12_26_9"].iloc[-1])
        macd_hist = float(macd_df["MACDh_12_26_9"].iloc[-1])
    else:
        macd_val = macd_signal = macd_hist = None

    # EMA (20, 50)
    ema20_series = ta.ema(close, length=20)
    ema50_series = ta.ema(close, length=50)
    ema20 = float(ema20_series.iloc[-1]) if ema20_series is not None else None
    ema50 = float(ema50_series.iloc[-1]) if ema50_series is not None else None

    # 볼린저밴드 (20, 2)
    bb_df = ta.bbands(close, length=20, std=2)
    if bb_df is not None and not bb_df.empty:
        bb_upper = float(bb_df["BBU_20_2.0"].iloc[-1])
        bb_mid = float(bb_df["BBM_20_2.0"].iloc[-1])
        bb_lower = float(bb_df["BBL_20_2.0"].iloc[-1])
        bb_width = float(bb_df["BBB_20_2.0"].iloc[-1])
    else:
        bb_upper = bb_mid = bb_lower = bb_width = None

    # 현재가 및 변동
    current_price = float(close.iloc[-1])
    prev_price = float(close.iloc[-2]) if len(close) > 1 else current_price
    price_change_pct = ((current_price - prev_price) / prev_price) * 100

    # 거래량 추이
    volume = df["volume"]
    vol_current = float(volume.iloc[-1])
    vol_avg = float(volume.tail(20).mean())
    vol_ratio = vol_current / vol_avg if vol_avg > 0 else 1.0

    return {
        "current_price": current_price,
        "price_change_pct": round(price_change_pct, 4),
        "rsi": round(rsi, 2) if rsi is not None else None,
        "macd": round(macd_val, 4) if macd_val is not None else None,
        "macd_signal": round(macd_signal, 4) if macd_signal is not None else None,
        "macd_histogram": round(macd_hist, 4) if macd_hist is not None else None,
        "ema20": round(ema20, 2) if ema20 is not None else None,
        "ema50": round(ema50, 2) if ema50 is not None else None,
        "bb_upper": round(bb_upper, 2) if bb_upper is not None else None,
        "bb_mid": round(bb_mid, 2) if bb_mid is not None else None,
        "bb_lower": round(bb_lower, 2) if bb_lower is not None else None,
        "bb_width": round(bb_width, 4) if bb_width is not None else None,
        "volume_ratio": round(vol_ratio, 2),
    }
