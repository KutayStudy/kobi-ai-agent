import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from app.ai.fallbacks import *

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-3.1-flash-lite-preview")


def generate_customer_response(order_data: dict):
    prompt = f"""
    Sen yapay zeka destekli bir KOBİ operasyon asistanısın.

    Görevin:
    - Müşteriye sipariş durumu hakkında bilgi vermek
    - Gecikme varsa durumu sakin ve profesyonel şekilde açıklamak
    - Gereksiz detay vermemek
    - Kısa, doğal ve güven veren cevap üretmek

    Kurallar:
    - Maksimum 3 cümle yaz.
    - Teknik terim kullanma.
    - JSON yazma.
    - Maddeleme yapma.
    - Eğer gecikme varsa işletme ekibinin bilgilendirildiğini belirt.
    - Eğer teslim tarihi varsa mutlaka söyle.
    - Türkçe yaz.

    Sipariş bilgileri:
    {order_data}
    """

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print("GEMINI CUSTOMER ERROR:", e)
        return fallback_customer_response(order_data)


def generate_dashboard_summary(dashboard_data: dict):
    prompt = f"""
    Sen bir operasyon yöneticisi asistanısın.

    Aşağıdaki işletme verilerini analiz et ve yöneticinin göreceği kısa bir operasyon özeti oluştur.

    Kurallar:
    - En fazla 5 tane kısa madde yaz.
    - En kritik problemi en başa koy.
    - Kritik stokları belirt.
    - Geciken kargoları belirt.
    - Gerekirse aksiyon önerisi ver.
    - Sayıları kullan.
    - Gereksiz açıklama yapma.
    - Türkçe yaz.
    - "Sayın Yönetici" gibi resmi girişler yazma.
    - Direkt operasyon özetinden başla.
    - Markdown kullanma, yıldızlı kalın yazı yazma.

    Veriler:
    {dashboard_data}
    """

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print("GEMINI DASHBOARD ERROR:", e)
        return fallback_dashboard_summary(dashboard_data)


def generate_supplier_draft(product_data: dict):
    prompt = f"""
    Sen bir KOBİ stok ve tedarik asistanısın.

    Aşağıdaki ürün kritik stok seviyesine düşmüş.

    Görevin:
    - Ürün için yenileme miktarı öner.
    - Kısa bir tedarikçi mail taslağı yaz.
    - Profesyonel ama sade Türkçe kullan.

    Kurallar:
    - Önce önerilen sipariş miktarını yaz.
    - Sonra mail taslağını yaz.
    - Mail taslağında konu başlığı da üret.
    - Gereksiz uzun yazma.
    - Markdown kullanma.
    - Türkçe konuş.
    - Hiç resmi selamlama yazma, Merhaba diyip direkt konuya gir.
    - "Önerilen sipariş miktarı: X adet" şeklinde başla.

    Ürün verisi:
    {product_data}
    """

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print("GEMINI SUPPLIER ERROR:", e)
        return fallback_supplier_draft(product_data)


def detect_intent(message: str):
    prompt = f"""
    Sen bir KOBİ operasyon asistanının intent sınıflandırma modülüsün.

    Kullanıcı mesajını analiz et ve sadece geçerli JSON döndür.

    Intent seçenekleri:
    - track_order: Kullanıcı sipariş/kargo durumunu soruyorsa
    - inventory_check: Kullanıcı stokları kontrol etmek istiyorsa
    - supplier_draft: Kullanıcı kritik stok için tedarikçi maili/sipariş taslağı istiyorsa
    - dashboard_summary: Kullanıcı genel operasyon özeti istiyorsa
    - unknown: Diğer durumlar için

    Kurallar:
    - Sadece JSON döndür.
    - Markdown kullanma.
    - Açıklama yazma.
    - order_id yoksa null döndür.
    - product_id yoksa null döndür.
    - Eğer kullanıcı tedarikçi maili veya sipariş taslağı istiyorsa ve mesajda sayı varsa bu sayı product_id kabul edilir.
    - Eğer kullanıcı sipariş durumunu soruyorsa ve mesajda sayı varsa bu sayı order_id kabul edilir.

    JSON formatı:
    {{
        "intent": "track_order",
        "order_id": 128,
        "product_id": null
    }}

    Kullanıcı mesajı:
    {message}
    """

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        return {"intent": data.get("intent", "unknown"), "order_id": data.get("order_id"), "product_id": data.get("product_id")}

    except Exception as e:
        print("GEMINI INTENT ERROR:", e)
        return fallback_intent_detection(message)


def generate_morning_report(workflow_data: dict):
    prompt = f"""
    Sen bir KOBİ operasyon planlama asistanısın.

    Aşağıdaki verilerle işletme için her sabah operasyon raporu hazırla.

    Görevin:
    - Depo görevlisinin hazırlaması gereken işleri yaz.
    - Kargo takibi gereken siparişleri belirt.
    - Yönetici için kritik kararları çıkar.
    - Günün öncelikli aksiyonlarını sırala.

    Kurallar:
    - Türkçe yaz.
    - En fazla 6 madde yaz.
    - Gereksiz açıklama yapma.
    - Markdown kullanma.
    - Her madde kısa ve aksiyon odaklı olsun.
    - Başlık yazma, direkt maddelerle başla.

    Veriler:
    {workflow_data}
    """

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print("GEMINI MORNING REPORT ERROR:", e)
        return fallback_morning_report()
    
def generate_analytics_insight(analytics_data: dict):
    prompt = f"""
    Sen bir KOBİ operasyon analitiği asistanısın.

    Aşağıdaki 3 aylık satış geçmişine dayalı stok ve talep tahmini verilerini analiz et.

    Görevin:
    - Önümüzdeki hafta en çok satılması beklenen ürünleri belirt.
    - Stok tükenme riski yüksek ürünleri önceliklendir.
    - Stok yöneticisine kısa ve uygulanabilir aksiyon önerisi ver.
    - Operasyonel performans metriklerini yorumla.

    Kurallar:
    - Türkçe yaz.
    - En fazla 4 cümle yaz.
    - Markdown kullanma.
    - Sayıları kullan.
    - En riskli ürünleri açıkça belirt.
    - Gereksiz açıklama yapma.

    Analitik veriler:
    {analytics_data}
    """

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print("GEMINI ANALYTICS ERROR:", e)
        return fallback_analytics_insight(analytics_data)