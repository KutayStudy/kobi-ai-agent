Türkçe versiyon: [README.md](./README.md)

# KobiOS

AI-powered SME operations management platform.

KobiOS is a modern AI-powered operational system prototype designed to manage customer communication, inventory monitoring, cargo tracking, and operational workflows for SMEs and cooperatives.

The project was developed as part of the YZTA AI Hackathon.

---

# Problem

Many SMEs and cooperatives still manage their operational workflows manually.

This leads to:

- customer support overload,
- delayed cargo operations,
- critical inventory problems,
- operational inefficiencies,
- scalability challenges.

KobiOS combines these processes into a unified AI-powered operational intelligence layer.

---

# Features

## AI Customer Assistant

Customers can query order and cargo status using natural language.

Example:

> “Where is my order #128?”

---

## Operations Dashboard

Managers can monitor:

- order visibility
- critical inventory status
- problematic cargo operations
- operational alerts

through a single dashboard.

---

## Cargo Management

- delayed cargo detection
- delivery issue monitoring
- operational cargo visibility

---

## Inventory & Stock Management

- critical inventory detection
- operational risk analysis
- reorder recommendations

---

## Supplier Draft Generation

The system can automatically generate supplier request drafts for critical products.

---

## AI Demand Forecasting

KobiOS analyzes historical sales data to generate:

- weekly demand forecasts,
- stock depletion risks,
- operational risk scores.

---

## Morning Operations Report

Generates AI-powered daily operational summaries.

---

# Technology Stack

## Frontend

- React
- Vite
- TailwindCSS

## Backend

- FastAPI
- Python
- SQLModel
- SQLite

## AI Layer

- Gemini API

---

# System Flow

```text
Customer Query
      ↓
FastAPI Backend
      ↓
Operational Services
      ↓
Order / Cargo / Forecast Logic
      ↓
Gemini AI Layer
      ↓
Operational Response
```

---

# API Endpoints

| Endpoint | Description |
|---|---|
| POST /chat | AI customer assistant |
| GET /dashboard | Operations dashboard data |
| GET /cargo/delays | Problematic cargo operations |
| GET /orders | Order list |
| GET /analytics/forecast | Demand forecasting and AI insights |
| GET /workflow/morning-report | Morning operations report |
| POST /supplier/draft/{id} | Supplier draft generation |

---

# Screenshots

## Operations Dashboard

![Operations Dashboard](./screenshots/dashboard-overview.png)

KobiOS centralizes critical inventory alerts, operational warnings, problematic cargo operations, and workflow visibility into a single operational control panel.

---

## AI Demand Forecasting

![AI Forecast](./screenshots/ai-forecast.png)

Historical sales data is analyzed to generate weekly demand forecasts, stock depletion risks, and reorder recommendations.

---

## AI Operational Insights

![AI Insight](./screenshots/ai-insight.png)

The AI layer analyzes operational risks and generates actionable summaries for managers.

---

## Morning Operations Report

![Morning Report](./screenshots/morning-report.png)

Critical workflows and operational priorities are automatically summarized for daily operations.

---

## Supplier Draft Generation

![Supplier Draft](./screenshots/supplier-draft.png)

The platform automatically generates supplier request drafts for products with critical stock levels.

---

## Customer Assistant

![Customer Assistant](./screenshots/customer-assistant.png)

Customers can query order and cargo information through a natural-language AI assistant.

---

# Installation

## Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

---

## Frontend

```bash
npm install
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

---

# Technical Highlights

- Modular FastAPI architecture
- AI-assisted operational workflows
- Forecasting layer
- Operational intelligence dashboard
- AI-generated operational insights
- Responsive frontend
- Lazy-loaded AI components

---

# Future Improvements

- ERP integrations
- live cargo API integrations
- advanced ML forecasting models
- authentication system
- cloud deployment

---

# License

MIT License