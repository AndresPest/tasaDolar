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
let ultimoInputModificado = 'divisa';

function temaMoneda(tipoMoneda, botonPresionado) {
    const tema = TEMAS[tipoMoneda] || TEMAS.dolar;

    document.querySelectorAll('.btn-tasa').forEach(btn => {
        btn.classList.remove(
            'bg-emerald-600/30', 'border-emerald-500', 'ring-emerald-500/50',
            'bg-blue-600/30', 'border-blue-500', 'ring-blue-500/50',
            'bg-amber-600/30', 'border-amber-500', 'ring-amber-500/50',
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
        totalDiv.classList.remove('text-emerald-400', 'text-blue-400', 'text-amber-400', 'text-slate-100');
        totalDiv.classList.add(tema.texto);
    }

    ['input-bs', 'input-monto'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.classList.remove(
                'focus:border-emerald-500', 'focus:ring-emerald-500',
                'focus:border-blue-500', 'focus:ring-blue-500',
                'focus:border-amber-500', 'focus:ring-amber-500'
            );

            input.classList.remove('text-emerald-400', 'text-blue-400', 'text-amber-400', 'text-white');
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
    const inputMonto = document.getElementById('input-monto');
    const inputBs = document.getElementById('input-bs');
    const btnLimpiar = document.getElementById('btnLimpiar');

    temaMoneda(moneda, evento);
    titulo.innerText = `${moneda.toUpperCase()} (${cambio.toUpperCase()})`;

    fetch(`/tasa/${moneda}/${cambio}/`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                titulo.innerHTML = `<span class="text-red-400">${data.error}</span>`;
            } else {
                valorTasa.innerText = `Bs. ${(data.promedio).toFixed(2)}`;
                tasaActual = parseFloat(data.promedio);

                recalcularUltimoModificado();
            }
        })
        .catch(error => {
            console.error("error: ", error)
            valorTasa.innerHTML = '<span class="text-red-400">Error al consultar</span>';
        });
}

function consultarP2P(operacion, evento) {
    const titulo = document.getElementById('titulo-tasa');
    const valorTasa = document.getElementById('valor-tasa');
    const monto = document.getElementById('input-monto');
    const inputBs = document.getElementById('input-bs');

    temaMoneda('usdt', evento);
    titulo.innerText = `USDT (${operacion.toUpperCase()})`;

    fetch(`/promedio_usdt/`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                titulo.innerHTML = `<span class="text-red-400">${data.error}</span>`;
            } else {
                const tasa = (operacion === 'compra') ? data.promedio_tasa_compra : data.promedio_tasa_venta;
                tasaActual = parseFloat(tasa);
                valorTasa.innerText = `Bs. ${parseFloat(tasa).toFixed(2)}`;
                recalcularUltimoModificado();
            }
        })
        .catch(error => {
            valorTasa.innerHTML = '<span class="text-red-400">Error al consultar</span>';
        });
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

