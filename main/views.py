from django.shortcuts import render

# Create your views here.

from django.shortcuts import render
import requests
from datetime import datetime
from django.http import JsonResponse
from django.core.cache import cache

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
