"""
AI 매매 판단 — Claude Sonnet (Anthropic API)
"""
import os
import json
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """당신은 BitMEX 선물 자동매매 AI 트레이더입니다.
BTC/USDT 무기한 선물 거래를 담당하며, 기술 지표와 시장 상황을 분석하여 매매 판단을 합니다.

판단 기준:
- RSI: 30 이하 과매도(매수 고려), 70 이상 과매수(매도 고려)
- MACD: 히스토그램 방향 전환 확인
- EMA: 20 > 50이면 상승 추세, 20 < 50이면 하락 추세
- 볼린저밴드: 상단 근접 시 과매수, 하단 근접 시 과매도
- 거래량: 평균 대비 2배 이상이면 강한 신호

리스크 원칙:
- 불확실한 시장에서는 HOLD (포지션 없음 유지)
- 명확한 신호 2개 이상 일치 시만 진입
- 손익비 2:1 이상인 경우만 진입

반드시 JSON 형식으로만 응답하세요:
{
  "action": "buy" | "sell" | "hold" | "close",
  "confidence": 0.0~1.0,
  "reason": "판단 근거 (한국어, 2-3문장)",
  "entry_price": null | 숫자,
  "stop_loss_pct": 0.015,
  "take_profit_pct": 0.03
}"""


def get_ai_decision(indicators: dict, position: dict | None, balance: dict) -> dict:
    """
    현재 지표와 포지션을 분석하여 AI 매매 판단 반환
    """
    position_info = "현재 포지션 없음"
    if position:
        position_info = (
            f"현재 포지션: {position['side'].upper()} "
            f"{position['contracts']} 계약, "
            f"진입가: ${position['entry_price']:,.2f}, "
            f"미실현PnL: {position['unrealized_pnl']:.4f} USDT"
        )

    user_message = f"""
현재 시장 데이터 (BTC/USDT 3분봉):

[가격]
- 현재가: ${indicators['current_price']:,.2f}
- 변동률: {indicators['price_change_pct']:+.4f}%

[기술 지표]
- RSI(14): {indicators['rsi']}
- MACD: {indicators['macd']} (Signal: {indicators['macd_signal']}, Hist: {indicators['macd_histogram']})
- EMA20: ${indicators['ema20']:,.2f} | EMA50: ${indicators['ema50']:,.2f}
- 볼린저밴드: Upper ${indicators['bb_upper']:,.2f} | Mid ${indicators['bb_mid']:,.2f} | Lower ${indicators['bb_lower']:,.2f}
- BB 폭: {indicators['bb_width']}

[거래량]
- 현재/평균 비율: {indicators['volume_ratio']}x

[계정]
- USDT 잔고: ${balance['total']:,.2f} (가용: ${balance['free']:,.2f})
- {position_info}

매매 판단을 JSON으로 응답하세요.
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    response_text = message.content[0].text.strip()

    # JSON 파싱
    try:
        # 코드 블록 제거
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        decision = json.loads(response_text)
    except json.JSONDecodeError:
        decision = {
            "action": "hold",
            "confidence": 0.0,
            "reason": "AI 응답 파싱 실패 — 안전을 위해 HOLD",
            "entry_price": None,
            "stop_loss_pct": 0.015,
            "take_profit_pct": 0.03,
        }

    decision["raw_response"] = message.content[0].text
    decision["input_tokens"] = message.usage.input_tokens
    decision["output_tokens"] = message.usage.output_tokens
    return decision
