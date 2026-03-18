# BitMEX AI 자동매매봇

BitMEX XBTUSDT 자동매매봇 + 수동 트레이딩 웹앱

## 구성

| 폴더 | 역할 | 배포 |
|------|------|------|
| `bot/` | Python FastAPI 봇 서버 (AI 판단 + 자동매매) | Railway |
| `dashboard/` | Next.js 14 PWA 대시보드 (모바일 홈화면 설치) | Vercel |
| `apps/api/` | Fastify 수동 트레이딩 API 서버 | Railway |
| `apps/web/` | Vite + React 수동 트레이딩 PWA | Vercel |

---

## 아키텍처

```
[스마트폰 PWA]
     ↓ HTTPS
[Vercel — Next.js 14 대시보드]
  실시간 PnL / AI 판단 로그 / 봇 ON/OFF
     ↓ REST API (5초 폴링)
[Railway — Python FastAPI 봇 서버]
  APScheduler 3분 루프
  ccxt → BitMEX XBTUSDT
  pandas-ta 지표 계산
  Claude Sonnet AI 판단
  SQLite 기록
     ↓ ccxt HMAC 서명
[BitMEX 서브계정]
  실제 USDT 잔고
  자동 주문 실행
```

---

## 로컬 실행

### Bot (Python)
```bash
cd bot
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env     # 환경변수 입력
python main.py
# → http://localhost:8000
```

### Dashboard (Next.js)
```bash
cd dashboard
npm install
cp .env.example .env.local  # NEXT_PUBLIC_BOT_URL 설정
npm run dev
# → http://localhost:3000
```

### 수동 트레이딩 API (선택)
```bash
cd apps/api
npm install
npm run db:init
npm run user:create -- admin "비밀번호"
npm run dev
# → http://localhost:8787
```

---

## 배포

### 1. Railway (봇 서버)
1. railway.app → New Project → GitHub 연결
2. Root Directory: `bot`
3. Start Command: `python main.py`
4. Environment Variables: GitHub Secrets에서 주입

### 2. Vercel (대시보드)
1. vercel.com → New Project → GitHub 연결
2. Root Directory: `dashboard`
3. Framework: Next.js
4. Environment Variables: `NEXT_PUBLIC_BOT_URL=https://Railway에서받은URL`

---

## GitHub Secrets 등록 목록

```
BITMEX_API_KEY         ← BitMEX 서브계정 API Key
BITMEX_SECRET          ← BitMEX 서브계정 Secret
ANTHROPIC_API_KEY      ← Anthropic API Key
BOT_SECRET             ← 대시보드 ↔ 봇 인증 토큰
RAILWAY_TOKEN          ← Railway 배포 토큰
VERCEL_TOKEN           ← Vercel 배포 토큰
```

---

## 보안 원칙

- `.env` 파일은 절대 GitHub에 업로드 금지
- BitMEX API Key는 **Withdraw 권한 OFF**
- `BOT_SECRET`으로 대시보드 ↔ 봇 API 인증
- 레버리지 1x 확인 후 봇 첫 실행

---

## 모바일 PWA 설치

- **iPhone**: Safari → 공유(□↑) → "홈 화면에 추가"
- **Android**: Chrome → 메뉴 → "앱 설치"

---

## 비용 예상

| 서비스 | 월 비용 |
|--------|---------|
| Railway | $0~5 |
| Vercel | $0 |
| Anthropic API | $3~8 |
| **합계** | **$3~13/월** |

---

## 📊 개발 현황 <!-- jh-progress -->

| 항목 | 내용 |
|------|------|
| **진행률** | `█████████████░░░░░░░` **65%** |
| **레포** | [bitmex-ai-bot](https://github.com/jaeha81/bitmex-ai-bot) |

> 진행률: 65%
