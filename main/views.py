from django.shortcuts import render

# Create your views here.

from django.shortcuts import render
import requests
from datetime import datetime
from django.http import JsonResponse
from django.core.cache import cache
import datetime
import re
import bs4
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

CACHE_BCV = {
    "tasa": None,
    "fecha_valor": None,
    "es_futura": False,
    "ultima_actualizacion": None
}

MESES_BCV = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12
}

def home (request):
    return render(request, 'home/index.html')

def tasa(request, moneda, cambio):
    moneda = moneda.lower()
    cambio = cambio.lower()

    diccionario_api = {
        'dolar': {
            'oficial': 'https://ve.dolarapi.com/v1/dolares/oficial',
            'paralelo': 'https://ve.dolarapi.com/v1/dolares/paralelo',
        },
        'euro': {
            'oficial': 'https://ve.dolarapi.com/v1/euros/oficial',
            'paralelo': 'https://ve.dolarapi.com/v1/euros/paralelo',
        }
    }

    url = diccionario_api.get(moneda).get(cambio)

    respuesta = requests.get(url)
    info_api = respuesta.json()

    fecha = datetime.fromisoformat(info_api['fechaActualizacion'].replace('Z', '+00:00'))

    info_tasa = JsonResponse({
                'fuente': info_api['fuente'].capitalize(),
                'nombre': info_api['nombre'],
                'compra': info_api['compra'],
                'venta': info_api['venta'],
                'promedio': info_api['promedio'],
                'fecha_actualizacion': fecha.strftime('%d/%m/%Y'),
            })

    return info_tasa

def promedio_usdt(request):
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "es-LA,es;q=0.9",
        "lang": "en",
        "Origin": "https://p2p.binance.com",
        "Referer": "https://p2p.binance.com/es-LA/trade/buy/USDT?fiat=VES",
        "Cache-Control": "no-cache"
    }

    cache_key = 'binance_p2p_promedio_usdt'
    datos_cacheados = cache.get(cache_key)

    if datos_cacheados:
        return JsonResponse(datos_cacheados)

    url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
    preciosCompra = []
    preciosVenta = []

    try:
        payload = {
            "asset": "USDT",
            "fiat": "VES",
            "tradeType": "BUY",
            "page": 1,
            "rows": 20,
            "merchantCheck": False,
            "publisherType": None
        }
        res = requests.post(url, json=payload, headers=headers)
        if res.status_code == 200:
            for item in res.json().get("data", []):
                preciosCompra.append(float(item["adv"]["price"]))

        payload = {
            "asset": "USDT",
            "fiat": "VES",
            "tradeType": "SELL",
            "page": 1,
            "rows": 20,
            "merchantCheck": False,
            "publisherType": None
        }
        res = requests.post(url, json=payload, headers=headers)
        print("STATUS:", res.status_code)
        print("RESPONSE:", res.json())
        if res.status_code == 200:
            for item in res.json().get("data", []):
                preciosVenta.append(float(item["adv"]["price"]))

    except requests.exceptions.RequestException as e:
        return JsonResponse({
            'error': 'Error de conexión con Binance',
            'detalle_exception': str(e)
        }, status=502)

    if(not preciosCompra or not preciosVenta):
        return JsonResponse({'error': 'No se pudo obtener información P2P'})

    infop2p = JsonResponse({
        "asset": "USDT",
        "fiat": "VES",
        "promedio_tasa_compra": round(sum(preciosCompra) / len(preciosCompra), 2),
        "promedio_tasa_venta": round(sum(preciosVenta) / len(preciosVenta), 2),
    })

    return infop2p

def parsear_fecha_bcv(fecha_raw, fecha_str_texto):
    if fecha_raw:
        try:
            return datetime.datetime.strptime(fecha_raw[:10], "%Y-%m-%d").date()
        except ValueError:
            pass
    try:
        match = re.search(r'(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})', fecha_str_texto.lower())
        if match:
            dia, mes_str, ano = match.groups()
            mes = MESES_BCV.get(mes_str)
            if mes:
                return datetime.date(int(ano), mes, int(dia))
    except Exception:
        pass
    return None

def proxima_tasa_bcv(request):
    ahora = datetime.datetime.now()

    if CACHE_BCV["ultima_actualizacion"]:
        diferencia = (ahora - CACHE_BCV["ultima_actualizacion"]).total_seconds()
        if diferencia < 900:
            if CACHE_BCV["es_futura"]:
                return JsonResponse({"disponible": True, "tasa": CACHE_BCV["tasa"], "fecha_valor": CACHE_BCV["fecha_valor"]})
            else:
                return JsonResponse({"disponible": False, "mensaje": "Tasa futura no disponible aún", "tasa": None, "fecha_valor": CACHE_BCV["fecha_valor"]})

    try:
        url = "https://www.bcv.org.ve/"
        headers = {"User-Agent": "Mozilla/5.0"}
        res = requests.get(url, headers=headers, verify=False, timeout=10)
        if res.status_code == 200:
            soup = bs4.BeautifulSoup(res.content, "html.parser")
            fecha_tag = soup.find("span", class_="date-display-single")
            dolar_div = soup.find("div", id="dolar")
            tasa_tag = dolar_div.find("strong") if dolar_div else None

            if fecha_tag and tasa_tag:
                tasa_val = float(tasa_tag.text.strip().replace('.', '').replace(',', '.'))
                fecha_texto = fecha_tag.text.strip()
                fecha_iso = fecha_tag.get("content", None)
                fecha_obj = parsear_fecha_bcv(fecha_iso, fecha_texto)
                hoy = datetime.date.today()
                es_futura = (fecha_obj > hoy) if fecha_obj else False

                CACHE_BCV["tasa"] = tasa_val
                CACHE_BCV["fecha_valor"] = fecha_texto
                CACHE_BCV["es_futura"] = es_futura
                CACHE_BCV["ultima_actualizacion"] = ahora

                if es_futura:
                    return JsonResponse({"disponible": True, "tasa": tasa_val, "fecha_valor": fecha_texto})
                else:
                    return JsonResponse({"disponible": False, "mensaje": "Tasa futura no disponible aún", "tasa": None, "fecha_valor": fecha_texto})
    except Exception as e:
        print(f"Error scraping BCV: {e}")

    return JsonResponse({"error": "No se pudo obtener la información del BCV"}, status=503)
