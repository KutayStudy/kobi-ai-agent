from sqlmodel import Session, select
from app.database import engine
from app.models import Product, Order, Cargo


def seed_data():
    with Session(engine) as session:
        existing_products = session.exec(select(Product)).all()

        if existing_products:
            return

        product1 = Product(id=1, name="Organik Dağ Domatesi 5KG", stock=18, critical_stock=40, price=320.0)
        product2 = Product(id=2, name="Soğuk Sıkım Zeytinyağı 2L", stock=11, critical_stock=20, price=540.0)
        product3 = Product(id=3, name="El Yapımı Acı Biber Sosu", stock=76, critical_stock=15, price=95.0)
        product4 = Product(id=4, name="Kooperatif Üretimi Kuru İncir Kutusu", stock=7, critical_stock=25, price=410.0)

        cargo1 = Cargo(tracking_no="TRK128", status="Transfer merkezinde yoğunluk nedeniyle bekliyor", estimated_delivery="2 gün gecikmeli", delayed=True)
        cargo2 = Cargo(tracking_no="TRK452", status="Dağıtıma çıktı", estimated_delivery="Bugün 18:00", delayed=False)
        cargo3 = Cargo(tracking_no="TRK777", status="Teslimat şubesine ulaştı ancak adres doğrulanamadı", estimated_delivery="Belirsiz", delayed=True)

        order1 = Order(id=128, customer_name="Ayşe Demir", product_id=1, quantity=3, status="Kargoda", cargo_tracking_no="TRK128")
        order2 = Order(id=452, customer_name="Mehmet Korkmaz", product_id=2, quantity=1, status="Dağıtıma Hazır", cargo_tracking_no="TRK452")
        order3 = Order(id=777, customer_name="Zehra Kaya", product_id=4, quantity=2, status="Teslimat Sorunu", cargo_tracking_no="TRK777")

        session.add(product1)
        session.add(product2)
        session.add(product3)
        session.add(product4)

        session.add(cargo1)
        session.add(cargo2)
        session.add(cargo3)

        session.add(order1)
        session.add(order2)
        session.add(order3)

        session.commit()