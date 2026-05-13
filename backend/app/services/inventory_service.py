from sqlmodel import Session, select
from app.models import Product
from app.services.alert_service import create_alert


def check_low_stock(session: Session):
    products = session.exec(select(Product)).all()
    low_stock_products = []

    for product in products:
        if product.stock <= product.critical_stock:
            low_stock_products.append(product)

            create_alert(session=session, type_="low_stock", message=f"{product.name} kritik stok seviyesinde. Mevcut stok: {product.stock}")

    return low_stock_products