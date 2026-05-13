from sqlmodel import Session, select
from app.models import Product


MOCK_3_MONTH_SALES_HISTORY = {
    1: {
        "weekly_sales": [18, 20, 21, 24, 26, 28, 29, 31, 32, 34, 35, 37],
        "category": "Taze Gıda"
    },
    2: {
        "weekly_sales": [9, 10, 11, 12, 12, 13, 14, 14, 15, 16, 16, 17],
        "category": "Zeytinyağı"
    },
    3: {
        "weekly_sales": [7, 8, 7, 9, 8, 8, 9, 7, 8, 9, 8, 8],
        "category": "Sos"
    },
    4: {
        "weekly_sales": [10, 12, 13, 15, 17, 19, 20, 22, 24, 25, 27, 29],
        "category": "Kuru Gıda"
    }
}


def calculate_average(values: list[int]):
    return sum(values) / len(values)


def calculate_trend_percentage(weekly_sales: list[int]):
    first_4_weeks_avg = calculate_average(weekly_sales[:4])
    last_4_weeks_avg = calculate_average(weekly_sales[-4:])

    if first_4_weeks_avg == 0:
        return 0

    return round(((last_4_weeks_avg - first_4_weeks_avg) / first_4_weeks_avg) * 100, 1)


def calculate_expected_next_week_demand(weekly_sales: list[int]):
    last_4_weeks_avg = calculate_average(weekly_sales[-4:])
    trend_percentage = calculate_trend_percentage(weekly_sales)

    if trend_percentage >= 35:
        multiplier = 1.25
    elif trend_percentage >= 20:
        multiplier = 1.15
    elif trend_percentage >= 10:
        multiplier = 1.08
    elif trend_percentage <= -10:
        multiplier = 0.90
    else:
        multiplier = 1.0

    return round(last_4_weeks_avg * multiplier)


def calculate_stockout_days(current_stock: int, expected_next_week_demand: int):
    daily_demand = expected_next_week_demand / 7

    if daily_demand <= 0:
        return None

    return round(current_stock / daily_demand)


def calculate_risk_score(current_stock: int, expected_next_week_demand: int, stockout_days, trend_percentage: float):
    if expected_next_week_demand <= 0:
        return 0

    demand_gap = max(expected_next_week_demand - current_stock, 0)
    demand_gap_score = min((demand_gap / expected_next_week_demand) * 55, 55)

    stockout_score = 0

    if stockout_days is not None:
        if stockout_days <= 3:
            stockout_score = 30
        elif stockout_days <= 7:
            stockout_score = 22
        elif stockout_days <= 14:
            stockout_score = 12

    trend_score = 0

    if trend_percentage >= 35:
        trend_score = 15
    elif trend_percentage >= 20:
        trend_score = 10
    elif trend_percentage >= 10:
        trend_score = 5

    return round(min(demand_gap_score + stockout_score + trend_score, 100))


def calculate_risk_level(risk_score: int):
    if risk_score >= 70:
        return "high"

    if risk_score >= 40:
        return "medium"

    return "low"


def calculate_reorder_quantity(current_stock: int, expected_next_week_demand: int, critical_stock: int):
    target_stock = max(expected_next_week_demand * 2, critical_stock * 2)
    reorder_quantity = target_stock - current_stock

    return max(round(reorder_quantity), 0)


def create_suggested_action(risk_level: str, stockout_days, suggested_reorder_quantity: int):
    if risk_level == "high":
        return f"Acil stok yenileme önerilir. Yaklaşık {suggested_reorder_quantity} adetlik tedarik planı oluşturulmalıdır."

    if risk_level == "medium":
        return f"Stok seviyesi yakından izlenmeli. Kısa vadede {suggested_reorder_quantity} adetlik yenileme planlanabilir."

    return "Stok seviyesi şu an yeterli görünüyor. Düzenli takip önerilir."


def calculate_operational_metrics(forecast: list[dict]):
    high_risk_count = len([item for item in forecast if item["risk_level"] == "high"])
    medium_risk_count = len([item for item in forecast if item["risk_level"] == "medium"])
    total_expected_demand = sum(item["expected_next_week_demand"] for item in forecast)
    total_current_stock = sum(item["current_stock"] for item in forecast)
    average_risk_score = round(sum(item["risk_score"] for item in forecast) / len(forecast), 1) if forecast else 0

    return {"high_risk_product_count": high_risk_count,"medium_risk_product_count": medium_risk_count,"total_expected_next_week_demand": total_expected_demand,"total_current_stock": total_current_stock,"average_risk_score": average_risk_score,"stock_coverage_ratio": round(total_current_stock / total_expected_demand, 2) if total_expected_demand else None}


def generate_forecast(session: Session):
    products = session.exec(select(Product)).all()
    forecast = []

    for product in products:
        sales_data = MOCK_3_MONTH_SALES_HISTORY.get(product.id)

        if not sales_data:
            continue

        weekly_sales = sales_data["weekly_sales"]
        trend_percentage = calculate_trend_percentage(weekly_sales)
        expected_next_week_demand = calculate_expected_next_week_demand(weekly_sales)
        stockout_days = calculate_stockout_days(product.stock, expected_next_week_demand)
        risk_score = calculate_risk_score(product.stock, expected_next_week_demand, stockout_days, trend_percentage)
        risk_level = calculate_risk_level(risk_score)
        suggested_reorder_quantity = calculate_reorder_quantity(product.stock, expected_next_week_demand, product.critical_stock)

        forecast.append({"product_id": product.id,"product": product.name,"category": sales_data["category"],"current_stock": product.stock,"critical_stock": product.critical_stock,"last_12_weeks_sales": weekly_sales,"last_4_weeks_average_sales": round(calculate_average(weekly_sales[-4:]), 1),"three_month_trend_percentage": trend_percentage,"expected_next_week_demand": expected_next_week_demand,"daily_demand_estimate": round(expected_next_week_demand / 7, 1),"estimated_stockout_days": stockout_days, "risk_score": risk_score,"risk_level": risk_level,"suggested_reorder_quantity": suggested_reorder_quantity,"suggested_action": create_suggested_action(risk_level, stockout_days, suggested_reorder_quantity)})

    forecast.sort(key=lambda item: item["expected_next_week_demand"], reverse=True)

    top_expected_products = forecast[:5]
    risk_sorted_products = sorted(forecast, key=lambda item: item["risk_score"], reverse=True)
    operational_metrics = calculate_operational_metrics(forecast)

    return {"top_expected_products": top_expected_products,"risk_sorted_products": risk_sorted_products,"operational_metrics": operational_metrics}