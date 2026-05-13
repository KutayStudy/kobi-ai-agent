import re


def fallback_customer_response(order_data: dict):
    if not order_data.get("found"):
        return "Bu sipariş numarasına ait kayıt bulamadım."

    if order_data.get("delayed"):
        return f"{order_data['order_id']} numaralı siparişiniz şu anda {order_data['cargo_status']} durumunda görünüyor. Tahmini teslim tarihi: {order_data['estimated_delivery']}. Gecikme riski nedeniyle işletme ekibi bilgilendirildi."

    return f"{order_data['order_id']} numaralı siparişinizin durumu: {order_data['order_status']}. Kargo durumu: {order_data['cargo_status']}. Tahmini teslim: {order_data['estimated_delivery']}."


def fallback_dashboard_summary(dashboard_data: dict):
    return f"{dashboard_data['critical_stock_count']} ürün kritik stok seviyesinde. {dashboard_data['active_alert_count']} aktif operasyon uyarısı bulunuyor."


def fallback_supplier_draft(product_data: dict):
    return f"Önerilen sipariş miktarı: {product_data['critical_stock'] * 2} adet\n\nKonu: {product_data['name']} Sipariş Talebi\n\nMerhaba,\n\n{product_data['name']} ürünü kritik stok seviyesine düşmüştür. Yeni sipariş oluşturmak istiyoruz."


def fallback_intent_detection(message: str):
    match = re.search(r"\b\d+\b", message)
    number = int(match.group()) if match else None
    lower_message = message.lower()

    if "tedarik" in lower_message or "mail" in lower_message or "sipariş taslağı" in lower_message:
        return {"intent": "supplier_draft", "order_id": None, "product_id": number}

    if "stok" in lower_message or "envanter" in lower_message:
        return {"intent": "inventory_check", "order_id": None, "product_id": None}

    if "özet" in lower_message or "dashboard" in lower_message or "operasyon" in lower_message:
        return {"intent": "dashboard_summary", "order_id": None, "product_id": None}

    if number:
        return {"intent": "track_order", "order_id": number, "product_id": None}

    return {"intent": "unknown", "order_id": None, "product_id": None}


def fallback_morning_report():
    return "Bugün kritik stok seviyesindeki ürünlerin kontrol edilmesi ve geciken siparişlerin takip edilmesi önerilir."

def fallback_analytics_insight(analytics_data: dict):
    high_risk_products = [item["product"] for item in analytics_data["risk_sorted_products"] if item["risk_level"] == "high"]

    if high_risk_products:
        return f"Yüksek riskli ürünler: {', '.join(high_risk_products)}. Bu ürünlerde önümüzdeki hafta stok tükenme riski bulunduğu için tedarik süreci öncelikli başlatılmalıdır."

    return "Önümüzdeki hafta için kritik stok tükenme riski düşük görünüyor. Mevcut stok seviyeleri düzenli olarak izlenmelidir."