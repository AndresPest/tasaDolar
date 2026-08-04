import datetime
import re
import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import urllib3

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
    "tasa": None,
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
    """Convierte la fecha extraída del BCV a un objeto datetime.date"""
    # Intentar parsear el atributo content ISO (ej: 2026-08-04T00:00:00...)
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
            tasa_tag = dolar_div.find("strong") if dolar_div else None

            if fecha_tag and tasa_tag:
                tasa_val = float(tasa_tag.text.strip().replace('.', '').replace(',', '.'))
                fecha_texto = fecha_tag.text.strip()
                fecha_iso = fecha_tag.get("content", None)

                fecha_obj = parsear_fecha_bcv(fecha_iso, fecha_texto)
                hoy = datetime.date.today()

                es_futura = (fecha_obj > hoy) if fecha_obj else False

                return tasa_val, fecha_texto, es_futura
    except Exception as e:
        print(f"Error scraping BCV: {e}")
    return None, None, False


@app.get("/")
def home():
    return {"status": "online", "mensaje": "API BCV Funcionando"}


@app.get("/api/bcv")
@app.get("/api/bcv/")
def obtener_tasa():
    ahora = datetime.datetime.now()

    if CACHE_TASA["ultima_actualizacion"]:
        diferencia = (ahora - CACHE_TASA["ultima_actualizacion"]).total_seconds()
        if diferencia < 900:
            if CACHE_TASA["es_futura"]:
                return {
                    "disponible": True,
                    "tasa": CACHE_TASA["tasa"],
                    "fecha_valor": CACHE_TASA["fecha_valor"],
                    "origen": "memoria_cache"
                }
            else:
                return {
                    "disponible": False,
                    "mensaje": "Tasa futura no disponible aún",
                    "tasa": None,
                    "fecha_valor": CACHE_TASA["fecha_valor"]
                }

    tasa, fecha, es_futura = extraer_bcv()

    if tasa is not None:
        CACHE_TASA["tasa"] = tasa
        CACHE_TASA["fecha_valor"] = fecha
        CACHE_TASA["es_futura"] = es_futura
        CACHE_TASA["ultima_actualizacion"] = ahora

        if es_futura:
            return {
                "disponible": True,
                "tasa": tasa,
                "fecha_valor": fecha,
                "origen": "bcv_en_vivo"
            }
        else:
            return {
                "disponible": False,
                "mensaje": "Tasa futura no disponible aún",
                "tasa": None,
                "fecha_valor": fecha
            }

    return {"error": "No se pudo obtener la información del BCV"}, 503