import datetime
import re
import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import urllib3
import zoneinfo

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CACHE_TASA = {
    "dolar": None,
    "euro": None,
    "fecha_valor": None,
    "es_futura": False,
    "ultima_actualizacion": None
}

MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12
}


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
            mes = MESES.get(mes_str)
            if mes:
                return datetime.date(int(ano), mes, int(dia))
    except Exception as e:
        print(f"Error parseando texto de fecha: {e}")

    return None


def extraer_bcv():
    url = "https://www.bcv.org.ve/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        response = requests.get(url, headers=headers, verify=False, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, "html.parser")
            fecha_tag = soup.find("span", class_="date-display-single")

            dolar_div = soup.find("div", id="dolar")
            euro_div = soup.find("div", id="euro")

            dolar_tag = dolar_div.find("strong") if dolar_div else None
            euro_tag = euro_div.find("strong") if euro_div else None

            if fecha_tag and dolar_tag and euro_tag:
                tasa_dolar = float(dolar_tag.text.strip().replace('.', '').replace(',', '.'))
                tasa_euro = float(euro_tag.text.strip().replace('.', '').replace(',', '.'))

                fecha_texto = fecha_tag.text.strip()
                fecha_iso = fecha_tag.get("content", None)

                fecha_obj = parsear_fecha_bcv(fecha_iso, fecha_texto)

                tz_ve = zoneinfo.ZoneInfo("America/Caracas")
                hoy = datetime.datetime.now(tz_ve).date()

                es_futura = (fecha_obj > hoy) if fecha_obj else False

                return tasa_dolar, tasa_euro, fecha_texto, es_futura
    except Exception as e:
        print(f"Error scraping BCV: {e}")
    return None, None, None, False


@app.get("/")
def home():
    return {"status": "online", "mensaje": "API BCV Funcionando"}


@app.get("/api/bcv")
@app.get("/api/bcv/")
def obtener_tasa():
    tz_ve = zoneinfo.ZoneInfo("America/Caracas")
    ahora = datetime.datetime.now(tz_ve)

    if CACHE_TASA["ultima_actualizacion"]:
        mismo_dia = CACHE_TASA["ultima_actualizacion"].date() == ahora.date()
        diferencia = (ahora - CACHE_TASA["ultima_actualizacion"]).total_seconds()

        if mismo_dia and diferencia < 900:
            return {
                "disponible": CACHE_TASA["es_futura"],
                "dolar": CACHE_TASA["dolar"],
                "euro": CACHE_TASA["euro"],
                "fecha_valor": CACHE_TASA["fecha_valor"],
                "origen": "memoria_cache"
            }

    dolar, euro, fecha, es_futura = extraer_bcv()

    if dolar is not None and euro is not None:
        CACHE_TASA["dolar"] = dolar
        CACHE_TASA["euro"] = euro
        CACHE_TASA["fecha_valor"] = fecha
        CACHE_TASA["es_futura"] = es_futura
        CACHE_TASA["ultima_actualizacion"] = ahora

        return {
            "disponible": es_futura,
            "dolar": dolar,
            "euro": euro,
            "fecha_valor": fecha,
            "origen": "bcv_en_vivo"
        }

    return {"error": "No se pudo obtener la información del BCV"}, 503