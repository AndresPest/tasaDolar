import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
from bs4 import BeautifulSoup
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
    "ultima_actualizacion": None
}


def extraer_bcv():
    url = "https://www.bcv.org.ve/"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        response = requests.get(url, headers=headers, verify=False, timeout=8)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, "html.parser")

            fecha_tag = soup.find("span", class_="date-display-single")
            dolar_div = soup.find("div", id="dolar")
            tasa_tag = dolar_div.find("strong") if dolar_div else None

            if fecha_tag and tasa_tag:
                tasa_val = float(tasa_tag.text.strip().replace('.', '').replace(',', '.'))
                fecha_val = fecha_tag.text.strip()
                return tasa_val, fecha_val
    except Exception as e:
        print(f"Error scraping BCV: {e}")
    return None, None


@app.get("/")
def home():
    return {"status": "API del BCV activa y funcionando"}


@app.get("/api/bcv")
def obtener_tasa():
    ahora = datetime.datetime.now()

    # Si tenemos datos de menos de 15 min, los devolvemos desde memoria
    if CACHE_TASA["tasa"] and CACHE_TASA["ultima_actualizacion"]:
        diferencia = (ahora - CACHE_TASA["ultima_actualizacion"]).total_seconds()
        if diferencia < 900:
            return {
                "tasa": CACHE_TASA["tasa"],
                "fecha_valor": CACHE_TASA["fecha_valor"],
                "origen": "memoria_cache"
            }

    tasa, fecha = extraer_bcv()

    if tasa:
        CACHE_TASA["tasa"] = tasa
        CACHE_TASA["fecha_valor"] = fecha
        CACHE_TASA["ultima_actualizacion"] = ahora
        return {
            "tasa": tasa,
            "fecha_valor": fecha,
            "origen": "bcv_en_vivo"
        }

    if CACHE_TASA["tasa"]:
        return {
            "tasa": CACHE_TASA["tasa"],
            "fecha_valor": CACHE_TASA["fecha_valor"],
            "origen": "memoria_respaldo"
        }

    return {"error": "No se pudo obtener la tasa del BCV"}, 503