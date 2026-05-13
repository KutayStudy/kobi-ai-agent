from sqlmodel import Session, select
from app.models import Order, Cargo, Product
from app.services.alert_service import create_alert


def get_order_status(session: Session, order_id: int):
    order = session.get(Order, order_id)

    if not order:
        return {"found": False, "message": "Sipariş bulunamadı."}

    product = session.get(Product, order.product_id)

    cargo = session.exec(select(Cargo).where(Cargo.tracking_no == order.cargo_tracking_no)).first()

    result = {"found": True, "order_id": order.id, "customer_name": order.customer_name, "product_name": product.name if product else "Bilinmeyen ürün", "quantity": order.quantity, "order_status": order.status, "cargo_status": cargo.status if cargo else "Kargo bilgisi yok", "estimated_delivery": cargo.estimated_delivery if cargo else None, "delayed": cargo.delayed if cargo else False}

    if result["delayed"]:
        create_alert(session=session, type_="cargo_delay", message=f"{order.id} numaralı siparişte kargo gecikmesi tespit edildi.")

    return result