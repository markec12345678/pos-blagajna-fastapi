from fastapi import APIRouter
router = APIRouter(prefix="/finance-v3", tags=["Finance V3"])

@router.get("/cash-flow")
def cash_flow():
    return {
        "inflow_today": 3245.80,
        "outflow_today": 1820.40,
        "net_today": 1425.40,
        "inflow_month": 72450.80,
        "outflow_month": 48200.50,
        "net_month": 24250.30,
        "daily_trend": [
            {"day": "Pon", "in": 2800, "out": 1900},
            {"day": "Tor", "in": 2950, "out": 1850},
            {"day": "Sre", "in": 3100, "out": 2100},
            {"day": "Čet", "in": 3200, "out": 1750},
            {"day": "Pet", "in": 3800, "out": 2200},
            {"day": "Sob", "in": 4200, "out": 2400},
            {"day": "Ned", "in": 3245, "out": 1820},
        ]
    }

@router.get("/pnl")
def pnl():
    return {
        "revenue": 72450.80,
        "cogs": 23500.20,
        "gross_profit": 48950.60,
        "labor": 18200.00,
        "overhead": 8400.00,
        "marketing": 1200.00,
        "net_profit": 21150.60,
        "gross_margin": 67.6,
        "net_margin": 29.2,
        "yoy_growth": 12.4
    }

@router.get("/balance")
def balance():
    return {
        "assets": {"cash": 45200.00, "inventory": 12400.00, "equipment": 85000.00, "total": 142600.00},
        "liabilities": {"payables": 8200.00, "loans": 35000.00, "total": 43200.00},
        "equity": 99400.00,
        "current_ratio": 3.2,
        "debt_to_equity": 0.43
    }

@router.get("/ratios")
def financial_ratios():
    return {
        "liquidity": {"current": 3.2, "quick": 2.8, "cash": 1.9},
        "profitability": {"gross_margin": 67.6, "net_margin": 29.2, "roe": 21.3},
        "efficiency": {"inventory_turnover": 8.4, "receivable_days": 12, "payable_days": 28},
        "leverage": {"debt_ratio": 0.30, "interest_coverage": 8.5},
        "benchmarks": {"industry_avg_margin": 22.0, "our_vs_industry": "+7.2pp"}
    }
