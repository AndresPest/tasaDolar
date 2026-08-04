const TEMAS = {
    dolar: {
        texto: 'text-emerald-400',
        bgSubtil: 'bg-emerald-500/10',
        bordeSubtil: 'border-emerald-500/20',
        btnBg: 'bg-emerald-600/30',
        btnBorde: 'border-emerald-500',
        btnRing: 'ring-2',
        btnRingColor: 'ring-emerald-500/50',
        focusBorder: 'focus:border-emerald-500',
        focusRing: 'focus:ring-emerald-500',
    },
    proximaTasa: {
        texto: 'text-lime-400',
        bgSubtil: 'bg-lime-500/10',
        bordeSubtil: 'border-lime-500/20',
        btnBg: 'bg-lime-600/30',
        btnBorde: 'border-lime-500',
        btnRing: 'ring-2',
        btnRingColor: 'ring-lime-500/50',
        focusBorder: 'focus:lime-lime-500',
        focusRing: 'focus:ring-lime-500',
    },
    euro: {
        texto: 'text-blue-400',
        bgSubtil: 'bg-blue-500/10',
        bordeSubtil: 'border-blue-500/20',
        btnBg: 'bg-blue-600/30',
        btnBorde: 'border-blue-500',
        btnRing: 'ring-2',
        btnRingColor: 'ring-blue-500/50',
        focusBorder: 'focus:border-blue-500',
        focusRing: 'focus:ring-blue-500',
    },
    usdt: {
        texto: 'text-amber-400',
        bgSubtil: 'bg-amber-500/10',
        bordeSubtil: 'border-amber-500/20',
        btnBg: 'bg-amber-600/30',
        btnBorde: 'border-amber-500',
        btnRing: 'ring-2',
        btnRingColor: 'ring-amber-500/50',
        focusBorder: 'focus:border-amber-500',
        focusRing: 'focus:ring-amber-500',
    }
};

let tasaActual = 0;
let tasaBCV = 0;
let proximaTasa = 0;
let fechaActual = "";
let fechaProximaTasa = "";
let tasaEuro = 0;
let tasaUSDT_compra = 0;
let tasaUSDT_venta = 0;
let ultimoInputModificado = 'divisa';
let chartInstance = null;
let datosHistoricosCache = [];
let monedaActualHistorico = 'dolar';
let rangoActualHistorico = '1S';
const API_RENDER_URL = "https://tasadolar.onrender.com/api/bcv";

function renderizarGrafico(fechasOriginales, precios, etiqueta, colorLinea) {
    const ctx = document.getElementById('graficoHistorico').getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    const etiquetasEjeX = fechasOriginales.map(fecha => {
        const f = new Date(fecha);
        const dia = String(f.getDate()).padStart(2, '0');
        const mes = String(f.getMonth() + 1).padStart(2, '0');
        return `${dia}/${mes}`;
    });

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: etiquetasEjeX,
            datasets: [{
                label: etiqueta,
                data: precios,
                borderColor: colorLinea,
                backgroundColor: colorLinea + '1A',
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: precios.length > 30 ? 1 : 3,
                pointHoverRadius: 6,
                fechasLargas: fechasOriginales
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#cbd5e1', font: { size: 12 } }
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const index = tooltipItems[0].dataIndex;
                            const fechaRaw = fechasOriginales[index];
                            const f = new Date(fechaRaw);

                            return f.toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            });
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#64748b',
                        font: { size: 10 },
                        maxTicksLimit: 10
                    },
                    grid: { color: '#334155' }
                },
                y: {
                    ticks: { color: '#64748b', font: { size: 10 } },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

function filtrarYRenderizar() {
    if (!datosHistoricosCache || datosHistoricosCache.length === 0) return;

    let limiteDatos = 7;

    switch (rangoActualHistorico) {
        case '1S':
            limiteDatos = 7;
            break;
        case '1M':
            limiteDatos = 30;
            break;
        case '1A':
            limiteDatos = 365;
            break;
    }

    const datosFiltrados = datosHistoricosCache.slice(-limiteDatos);

    const fechas = datosFiltrados.map(item => {
        const f = new Date(item.fecha);
        return f.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    });

    const fechasRaw = datosFiltrados.map(item => item.fecha);
    const precios = datosFiltrados.map(item => item.promedio);
    const color = monedaActualHistorico === 'dolar' ? '#10b981' : '#3b82f6';

    renderizarGrafico(fechasRaw, precios, `Histórico ${monedaActualHistorico.toUpperCase()}`, color);
}

function cargarHistorico(moneda) {
    if (moneda !== 'dolar' && moneda !== 'euro') return;

    monedaActualHistorico = moneda;
    const url = moneda === 'dolar'
        ? `https://ve.dolarapi.com/v1/historicos/dolares/oficial`
        : `https://ve.dolarapi.com/v1/historicos/euros/oficial`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            datosHistoricosCache = data;
            filtrarYRenderizar();
        })
        .catch(err => console.error("Error al cargar histórico:", err));
}

function cambiarRangoTiempo(rango, elementoBoton) {
    rangoActualHistorico = rango;

    document.querySelectorAll('.btn-rango').forEach(btn => {
        btn.className = "btn-rango px-2.5 py-1 rounded-lg text-slate-400 hover:text-white font-medium transition-colors";
    });

    elementoBoton.className = "btn-rango px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30";

    filtrarYRenderizar();
}

function temaMoneda(tipoMoneda, tipoCambio, botonPresionado) {
    let tema = TEMAS[tipoMoneda] || TEMAS.dolar;

    if(tipoCambio === 'futuro'){
        tema = TEMAS["proximaTasa"];
    }

    document.querySelectorAll('.btn-tasa').forEach(btn => {
        btn.classList.remove(
            'bg-emerald-600/30', 'border-emerald-500', 'ring-emerald-500/50',
            'bg-blue-600/30', 'border-blue-500', 'ring-blue-500/50',
            'bg-amber-600/30', 'border-amber-500', 'ring-amber-500/50',
            'bg-lime-600/30', 'border-lime-500', 'ring-lime-500/50',
            'ring-2'
        );
        btn.classList.add('bg-slate-700/50', 'border-slate-600');
    });

    if (botonPresionado) {
        botonPresionado.classList.remove('bg-slate-700/50', 'border-slate-600');
        botonPresionado.classList.add(tema.btnBg, tema.btnBorde, tema.btnRing, tema.btnRingColor);
    }

    const titulo = document.getElementById('titulo-tasa');
    if (titulo) {
        titulo.className = `text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition-colors duration-300 ${tema.texto} ${tema.bgSubtil} ${tema.bordeSubtil}`;
    }

    const valorTasa = document.getElementById('valor-tasa');
    if (valorTasa) {
        valorTasa.className = `text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition-colors duration-300 ${tema.texto} ${tema.bgSubtil} ${tema.bordeSubtil}`;
    }

    const totalDiv = document.getElementById('resultado-total') && document.getElementById('resultado-total-container');
    if (totalDiv) {
        totalDiv.classList.remove('text-emerald-400', 'text-blue-400', 'text-amber-400', 'text-lime-400', 'text-slate-100');
        totalDiv.classList.add(tema.texto);
    }

    const fechaValorSpan = document.getElementById("fecha-valor-bcv");
    if (fechaValorSpan) {
        fechaValorSpan.classList.remove('text-emerald-400', 'text-blue-400', 'text-amber-400', 'text-lime-400', 'text-slate-100');
        fechaValorSpan.classList.add(tema.texto);
    }

    ['input-bs', 'input-monto'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.classList.remove(
                'focus:border-emerald-500', 'focus:ring-emerald-500',
                'focus:border-blue-500', 'focus:ring-blue-500',
                'focus:border-amber-500', 'focus:ring-amber-500',
                'focus:border-lime-500', 'focus:ring-lime-500'
            );

            input.classList.remove('text-emerald-400', 'text-blue-400', 'text-amber-400', 'text-lime-400', 'text-white');
            input.classList.add(tema.texto);

            input.classList.add(tema.focusBorder, tema.focusRing);
        }
    });
}

function recalcularUltimoModificado() {
    const inputMonto = document.getElementById('input-monto');
    const inputBs = document.getElementById('input-bs');

    if (ultimoInputModificado === 'bs') {
        calcularBs(inputBs);
    } else {
        calcularDivisa(inputMonto);
    }
}

function limpiarCampos() {
    const inputMonto = document.getElementById('input-monto');
    const inputBs = document.getElementById('input-bs');

    inputBs.value = '';
    inputMonto.value = '';

    inputMonto.focus();
}

function transformarMonto(texto) {
    if (!texto) return 0;
    const numeroLimpio = texto.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(numeroLimpio) || 0;
}

function formatearMoneda(cantidad) {
    if (!cantidad && cantidad !== 0) return '';
    return cantidad.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function obtenerNumeroReal(texto) {
    if (!texto)
        return 0;
    const limpio = texto.replace(/\./g, '').replace(',', '.');
    return parseFloat(limpio) || 0;
}

function enmascararMonto(input) {
    let valor = input.value;
    if (!valor)
        return;

    let partes = valor.split(',');
    let parteEntera = partes[0].replace(/\D/g, '');
    parteEntera = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (partes.length > 1) {
        let parteDecimal = partes[1].replace(/\D/g, '').slice(0, 2);
        input.value = `${parteEntera},${parteDecimal}`;
    } else {
        input.value = parteEntera;
    }
}

function consultarTasa(moneda, cambio, evento) {
    const titulo = document.getElementById('titulo-tasa');
    const valorTasa = document.getElementById('valor-tasa');
    const btnSpanTasa = document.getElementById("tasa-btn-bcv-futuro");
    const fechaValorSpan = document.getElementById("fecha-valor-bcv");
    const inputDivisa = document.getElementById("input-monto");
    const inputMonto = document.getElementById("input-bs");

    inputDivisa.disabled = false;
    inputMonto.disabled = false;

    temaMoneda(moneda, cambio, evento);
    titulo.innerText = `${moneda.toUpperCase()} (${cambio.toUpperCase()})`;

    if(moneda === 'dolar'){
        if(cambio === 'futuro'){

            if (!proximaTasa) {
                titulo.innerText = "PRÓXIMA TASA";
                valorTasa.innerText = "No disponible";
                fechaValorSpan.textContent = `No disponible`;
                inputDivisa.disabled = true;
                inputMonto.disabled = true;
                return;
            }

            titulo.innerText = "PRÓXIMA TASA (BCV)";
            valorTasa.innerText = `Bs. ${proximaTasa.toFixed(2)}`;
            tasaActual = proximaTasa;

            if (fechaValorSpan && fechaProximaTasa) {
                fechaValorSpan.textContent = `Fecha Valor: ${fechaProximaTasa}`;
            }
        } else {
            valorTasa.innerText = `Bs. ${tasaBCV.toFixed(2)}`;
            fechaValorSpan.textContent = `Fecha Valor: ${fechaActual}`;
            tasaActual = tasaBCV;
            recalcularUltimoModificado();
        }

    } else if(moneda === 'euro'){
        valorTasa.innerText = `Bs. ${tasaEuro.toFixed(2)}`;
        fechaValorSpan.textContent = `Fecha Valor: ${fechaActual}`;
        tasaActual = tasaEuro;
        recalcularUltimoModificado();
    } else {
        console.error("ERROR MONEDA");
    }

    cargarHistorico(moneda);
}

function consultarP2P(operacion, evento) {
    const titulo = document.getElementById('titulo-tasa');
    const valorTasa = document.getElementById('valor-tasa');

    temaMoneda('usdt', 'p2p', evento);
    titulo.innerText = `USDT (${operacion.toUpperCase()})`;

    if(operacion === 'compra'){
        const tasa = tasaUSDT_compra;
        tasaActual = tasaUSDT_compra;
        valorTasa.innerText = `Bs. ${tasaUSDT_compra.toFixed(2)}`;
        recalcularUltimoModificado();
    } else if(operacion === 'venta'){
        const tasa = tasaUSDT_venta;
        tasaActual = tasaUSDT_venta;
        valorTasa.innerText = `Bs. ${tasaUSDT_venta.toFixed(2)}`;
        recalcularUltimoModificado();
    } else {
        console.error("ERROR OPERACION");
    }
}

async function cargarTasasEnBotones() {
    try {
        const fetchJSON = async (url) => {
            try {
                const res = await fetch(url);
                if (!res.ok) {
                    console.warn(`Error ${res.status} al consultar: ${url}`);
                    return {};
                }
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    return await res.json();
                } else {
                    console.warn(`La URL ${url} no devolvió JSON.`);
                    return {};
                }
            } catch (e) {
                console.error(`Error de red en ${url}:`, e);
                return {};
            }
        };

        const [dataDolar, dataEuro, dataUSDT, data_proximaTasa] = await Promise.all([
            fetchJSON(`/tasa/dolar/oficial/`),
            fetchJSON(`/tasa/euro/oficial/`),
            fetchJSON(`/promedio_usdt/`),
            fetchJSON(API_RENDER_URL)
        ]);

        if (dataDolar && dataDolar.promedio) {
            tasaBCV = parseFloat(dataDolar.promedio);
            const elem = document.getElementById('tasa-btn-dolar-oficial');
            if (elem) elem.innerText = `Bs. ${tasaBCV.toFixed(2)}`;
        }

        const btnFuturoSpan = document.getElementById('tasa-btn-bcv-futuro');
        if (data_proximaTasa && data_proximaTasa.tasa) {
            proximaTasa = parseFloat(data_proximaTasa.tasa);
            fechaProximaTasa = data_proximaTasa.fecha_valor || "";

            if (btnFuturoSpan) {
                btnFuturoSpan.innerText = `Bs. ${proximaTasa.toFixed(2)}`;
            }
        } else {
            if (btnFuturoSpan) {
                btnFuturoSpan.innerText = "No disponible";
                btnFuturoSpan.classList.add("text-slate-500");
            }
        }

        if (dataEuro && dataEuro.promedio) {
            tasaEuro = parseFloat(dataEuro.promedio);
            const elem = document.getElementById('tasa-btn-euro-oficial');
            if (elem) elem.innerText = `Bs. ${tasaEuro.toFixed(2)}`;
        }

        if (dataUSDT && dataUSDT.promedio_tasa_compra) {
            tasaUSDT_compra = parseFloat(dataUSDT.promedio_tasa_compra);
            const elem = document.getElementById('tasa-btn-usdt-compra');
            if (elem) elem.innerText = `Bs. ${tasaUSDT_compra.toFixed(2)}`;
        }

        if (dataUSDT && dataUSDT.promedio_tasa_venta) {
            tasaUSDT_venta = parseFloat(dataUSDT.promedio_tasa_venta);
            const elem = document.getElementById('tasa-btn-usdt-venta');
            if (elem) elem.innerText = `Bs. ${tasaUSDT_venta.toFixed(2)}`;
        }

        // Configurar la fecha actual
        let fecha = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
        fecha = fecha.replace(/ de /g, ' ');
        fechaActual = fecha.charAt(0).toUpperCase() + fecha.slice(1);

        const fechaValorSpan = document.getElementById("fecha-valor-bcv");
        if (fechaValorSpan) fechaValorSpan.classList.remove("hidden");

        const btnDolar = document.getElementById('btn-dolar-oficial');
        const valorTasa = document.getElementById('valor-tasa');
        const inputDivisa = document.getElementById('input-monto');

        if (btnDolar) {
            if (inputDivisa) inputDivisa.value = 1;
            if (valorTasa) valorTasa.innerText = `Bs. ${tasaBCV.toFixed(2)}`;
            consultarTasa('dolar', 'oficial', btnDolar);
        }

    } catch (err) {
        console.error("Error al cargar las tasas:", err);
    }
}

function calcularDivisa(input) {
    ultimoInputModificado = 'divisa';
    enmascararMonto(input);

    const inputBs = document.getElementById('input-bs');
    const montoNum = obtenerNumeroReal(input.value);

    if (montoNum > 0 && tasaActual > 0) {
        const totalBs = montoNum * tasaActual;
        inputBs.value = formatearMoneda(totalBs);
    } else {
        inputBs.value = '';
    }
}

function calcularBs(input) {
    ultimoInputModificado = 'bs';
    enmascararMonto(input);

    const inputMonto = document.getElementById('input-monto');
    const bsNum = obtenerNumeroReal(input.value);

    if (bsNum > 0 && tasaActual > 0) {
        const totalDivisa = bsNum / tasaActual;
        inputMonto.value = formatearMoneda(totalDivisa);
    } else {
        inputMonto.value = '';
    }
}

function formatearAlSalir(inputElement) {
    const valorNum = transformarMonto(inputElement.value);
    if (valorNum > 0) {
        inputElement.value = formatearMoneda(valorNum);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarTasasEnBotones();
});

