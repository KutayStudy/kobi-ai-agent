from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app.database import create_db_and_tables, get_session
from app.seed import seed_data
from app.models import Order, Product, Alert,Cargo
from app.services.order_service import get_order_status
from app.services.inventory_service import check_low_stock
from app.services.analytics_service import generate_forecast

from app.ai.gemini_service import (generate_analytics_insight,generate_customer_response,generate_dashboard_summary,generate_supplier_draft,generate_morning_report,detect_intent)

app = FastAPI(title="KOBI AI Operation Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    seed_data()

@app.post("/chat")
def chat(message: str, session: Session = Depends(get_session)):
    intent_data = detect_intent(message)
    intent = intent_data.get("intent")
    order_id = intent_data.get("order_id")
    product_id = intent_data.get("product_id")

    if intent == "track_order":
        if not order_id:
            return {"intent": intent, "answer": "Siparişinizi sorgulayabilmem için sipariş numaranızı paylaşır mısınız?", "agent_trace": intent_data}

        order_result = get_order_status(session, order_id)

        if not order_result["found"]:
            return {"intent": intent, "answer": "Bu sipariş numarasına ait kayıt bulamadım.", "data": order_result, "agent_trace": intent_data}

        answer = generate_customer_response(order_result)

        return {"intent": intent, "answer": answer, "data": order_result, "agent_trace": intent_data}

    if intent == "inventory_check":
        low_stock_products = check_low_stock(session)

        low_stock_data = [{"id": product.id, "name": product.name, "stock": product.stock, "critical_stock": product.critical_stock, "price": product.price} for product in low_stock_products]

        return {"intent": intent, "answer": f"{len(low_stock_data)} ürün kritik stok seviyesinde görünüyor.", "low_stock_products": low_stock_data, "agent_trace": intent_data}

    if intent == "supplier_draft":
        if not product_id:
            return {"intent": intent, "answer": "Tedarik taslağı oluşturabilmem için ürün ID bilgisini paylaşır mısınız?", "agent_trace": intent_data}

        product = session.get(Product, product_id)

        if not product:
            return {"intent": intent, "answer": "Bu ürün ID'sine ait ürün bulunamadı.", "agent_trace": intent_data}

        product_data = {"id": product.id, "name": product.name, "stock": product.stock, "critical_stock": product.critical_stock, "price": product.price, "suggested_reorder_quantity": max(product.critical_stock * 2 - product.stock, product.critical_stock)}

        draft = generate_supplier_draft(product_data)

        return {"intent": intent, "answer": "Tedarikçi taslağı oluşturuldu.", "product": product_data, "supplier_draft": draft, "agent_trace": intent_data}

    if intent == "dashboard_summary":
        dashboard_data = get_dashboard_data(session)

        ai_summary = generate_dashboard_summary(dashboard_data)

        return {"intent": intent, "answer": ai_summary, "dashboard": dashboard_data, "agent_trace": intent_data}

    return {"intent": "unknown", "answer": "Bu talebi anlayamadım. Sipariş durumu, stok kontrolü veya tedarik taslağı için yardımcı olabilirim.", "agent_trace": intent_data}


@app.get("/dashboard")
def dashboard(session: Session = Depends(get_session)):
    return get_dashboard_data(session)


@app.get("/dashboard/summary")
def dashboard_summary(session: Session = Depends(get_session)):
    dashboard_data = get_dashboard_data(session)
    ai_summary = generate_dashboard_summary(dashboard_data)

    return {"ai_summary": ai_summary}


@app.post("/inventory/check")
def inventory_check(session: Session = Depends(get_session)):
    low_stock_products = check_low_stock(session)

    low_stock_data = [{"id": product.id, "name": product.name, "stock": product.stock, "critical_stock": product.critical_stock, "price": product.price} for product in low_stock_products]

    return {"message": "Stok kontrolü tamamlandı.", "low_stock_products": low_stock_data}


@app.post("/supplier/draft/{product_id}")
def supplier_draft(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)

    if not product:
        return {"error": "Ürün bulunamadı."}

    product_data = {"id": product.id, "name": product.name, "stock": product.stock, "critical_stock": product.critical_stock, "price": product.price, "suggested_reorder_quantity": max(product.critical_stock * 2 - product.stock, product.critical_stock)}

    draft = generate_supplier_draft(product_data)

    return {"product": product_data, "supplier_draft": draft}


@app.get("/workflow/morning-report")
def morning_report(session: Session = Depends(get_session)):
    orders = session.exec(select(Order)).all()
    products = session.exec(select(Product)).all()
    alerts = session.exec(select(Alert).where(Alert.resolved == False)).all()

    critical_products = [product for product in products if product.stock <= product.critical_stock]

    orders_data = [{"id": order.id, "customer_name": order.customer_name, "product_id": order.product_id, "quantity": order.quantity, "status": order.status, "cargo_tracking_no": order.cargo_tracking_no} for order in orders]

    critical_products_data = [{"id": product.id, "name": product.name, "stock": product.stock, "critical_stock": product.critical_stock, "price": product.price} for product in critical_products]

    alerts_data = [{"id": alert.id, "type": alert.type, "message": alert.message, "resolved": alert.resolved, "created_at": alert.created_at} for alert in alerts]

    workflow_data = {"orders": orders_data, "critical_products": critical_products_data, "alerts": alerts_data}

    report = generate_morning_report(workflow_data)

    return {"title": "Sabah Operasyon Raporu", "report": report, "workflow_data": workflow_data}


def get_dashboard_data(session: Session):
    orders = session.exec(select(Order)).all()
    products = session.exec(select(Product)).all()
    alerts = session.exec(select(Alert).where(Alert.resolved == False)).all()

    critical_products = [product for product in products if product.stock <= product.critical_stock]

    critical_products_data = [{"id": product.id, "name": product.name, "stock": product.stock, "critical_stock": product.critical_stock, "price": product.price} for product in critical_products]

    alerts_data = [{"id": alert.id, "type": alert.type, "message": alert.message, "resolved": alert.resolved, "created_at": alert.created_at} for alert in alerts]

    return {"total_orders": len(orders),"total_products": len(products),"critical_stock_count": len(critical_products_data),"active_alert_count": len(alerts_data),"critical_products": critical_products_data,"alerts": alerts_data}

@app.get("/analytics/forecast")
def analytics_forecast(session: Session = Depends(get_session)):
    analytics_data = generate_forecast(session)
    ai_insight = generate_analytics_insight(analytics_data)

    return {"top_expected_products": analytics_data["top_expected_products"],"risk_sorted_products": analytics_data["risk_sorted_products"],"operational_metrics": analytics_data["operational_metrics"],"ai_insight": ai_insight}

@app.get("/orders")
def get_orders(session: Session = Depends(get_session)):
    orders = session.exec(select(Order)).all()
    return [{"id": order.id,"customer_name": order.customer_name,"product_id": order.product_id,"quantity": order.quantity,"status": order.status,"cargo_tracking_no": order.cargo_tracking_no} for order in orders]

@app.get("/cargo/delays")
def get_cargo_delays(session: Session = Depends(get_session)):
    delayed_orders = []
    orders = session.exec(select(Order)).all()

    for order in orders:
        cargo = session.exec(select(Cargo).where(Cargo.tracking_no == order.cargo_tracking_no)).first()

        if not cargo:
            continue

        if cargo.delayed or order.status == "Teslimat Sorunu":
            delayed_orders.append({"order_id": order.id,"customer_name": order.customer_name,"cargo_status": cargo.status,"estimated_delivery": cargo.estimated_delivery,"problem": "Teslimat Sorunu" if order.status == "Teslimat Sorunu" else "Gecikme"})

    return delayed_orders
