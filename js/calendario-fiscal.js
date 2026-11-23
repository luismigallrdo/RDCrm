/*
 * Calendario fiscal español (AEAT) simplificado.
 * Calcula solo las fechas límite de presentación de cada modelo según su periodicidad.
 * Si el último día cae en sábado, domingo o festivo nacional, pasa al siguiente día hábil.
 * Las fechas son orientativas: conviene contrastarlas cada año con el calendario oficial de la AEAT.
 */
(function (global) {
  'use strict';

  const MODELOS = {
    '303': { nombre: 'IVA · Autoliquidación', periodicidades: ['trimestral', 'mensual'] },
    '111': { nombre: 'Retenciones de trabajo y profesionales', periodicidades: ['trimestral', 'mensual'] },
    '115': { nombre: 'Retenciones por alquileres', periodicidades: ['trimestral', 'mensual'] },
    '123': { nombre: 'Retenciones del capital mobiliario', periodicidades: ['trimestral', 'mensual'] },
    '130': { nombre: 'Pago fraccionado IRPF (estimación directa)', periodicidades: ['trimestral'] },
    '131': { nombre: 'Pago fraccionado IRPF (módulos)', periodicidades: ['trimestral'] },
    '349': { nombre: 'Operaciones intracomunitarias', periodicidades: ['trimestral', 'mensual'] },
    '202': { nombre: 'Pago fraccionado Impuesto sobre Sociedades', periodicidades: ['fraccionado'] },
    '390': { nombre: 'Resumen anual de IVA', periodicidades: ['anual'] },
    '180': { nombre: 'Resumen anual retenciones alquileres', periodicidades: ['anual'] },
    '190': { nombre: 'Resumen anual retenciones trabajo y profesionales', periodicidades: ['anual'] },
    '193': { nombre: 'Resumen anual capital mobiliario', periodicidades: ['anual'] },
    '347': { nombre: 'Operaciones con terceros', periodicidades: ['anual'] },
    '200': { nombre: 'Impuesto sobre Sociedades', periodicidades: ['anual'] },
    '100': { nombre: 'IRPF · Declaración de la Renta', periodicidades: ['anual'] },
    '714': { nombre: 'Impuesto sobre el Patrimonio', periodicidades: ['anual'] },
    '720': { nombre: 'Bienes y derechos en el extranjero', periodicidades: ['anual'] }
  };

  const PERIODICIDADES = {
    mensual: 'Mensual',
    trimestral: 'Trimestral',
    anual: 'Anual',
    fraccionado: 'Abril, octubre y diciembre'
  };

  // Fecha límite (mes 1-12, día) del modelo anual, referida al año siguiente al ejercicio.
  const ANUALES = {
    '390': [1, 30], '180': [1, 31], '190': [1, 31], '193': [1, 31],
    '347': [2, 'fin'], '720': [3, 31], '100': [6, 30], '714': [6, 30], '200': [7, 25]
  };

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function domingoPascua(anio) {
    const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(anio, mes - 1, dia);
  }

  const cacheFestivos = {};
  function festivos(anio) {
    if (cacheFestivos[anio]) return cacheFestivos[anio];
    const lista = ['01-01', '01-06', '05-01', '08-15', '10-12', '11-01', '12-06', '12-08', '12-25'];
    const pascua = domingoPascua(anio);
    [-3, -2].forEach(function (desfase) { // Jueves y Viernes Santo
      const d = new Date(pascua); d.setDate(d.getDate() + desfase);
      lista.push(pad(d.getMonth() + 1) + '-' + pad(d.getDate()));
    });
    cacheFestivos[anio] = new Set(lista);
    return cacheFestivos[anio];
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function esHabil(d) {
    const dia = d.getDay();
    if (dia === 0 || dia === 6) return false;
    return !festivos(d.getFullYear()).has(pad(d.getMonth() + 1) + '-' + pad(d.getDate()));
  }

  function fechaLimite(anio, mes, dia) {
    // mes 1-12, admite mes 13 (= enero del año siguiente) y dia 'fin'
    if (mes > 12) { anio += 1; mes -= 12; }
    const ultimo = new Date(anio, mes, 0).getDate();
    const d = new Date(anio, mes - 1, dia === 'fin' ? ultimo : Math.min(dia, ultimo));
    while (!esHabil(d)) d.setDate(d.getDate() + 1);
    return d;
  }

  /** Devuelve los vencimientos de un modelo para el ejercicio (año del periodo) indicado. */
  function vencimientosEjercicio(codigo, periodicidad, anio) {
    const lista = [];
    const add = function (periodoId, periodoTexto, fecha) {
      lista.push({
        codigo: codigo,
        clave: codigo + '|' + periodoId,
        periodo: periodoTexto,
        fecha: iso(fecha)
      });
    };

    if (periodicidad === 'trimestral') {
      add(anio + '-1T', '1T ' + anio, fechaLimite(anio, 4, 20));
      add(anio + '-2T', '2T ' + anio, fechaLimite(anio, 7, 20));
      add(anio + '-3T', '3T ' + anio, fechaLimite(anio, 10, 20));
      add(anio + '-4T', '4T ' + anio, fechaLimite(anio, 13, 30));
    } else if (periodicidad === 'mensual') {
      for (let m = 1; m <= 12; m++) {
        let dia = codigo === '303' ? 30 : 20;
        if (m === 12 && (codigo === '303' || codigo === '349')) dia = 30;
        add(anio + '-' + pad(m), MESES[m - 1] + ' ' + anio, fechaLimite(anio, m + 1, dia));
      }
    } else if (periodicidad === 'fraccionado') {
      add(anio + '-1P', '1.er pago ' + anio, fechaLimite(anio, 4, 20));
      add(anio + '-2P', '2.º pago ' + anio, fechaLimite(anio, 10, 20));
      add(anio + '-3P', '3.er pago ' + anio, fechaLimite(anio, 12, 20));
    } else if (periodicidad === 'anual') {
      const f = ANUALES[codigo] || [1, 30];
      add(String(anio), 'Ejercicio ' + anio, fechaLimite(anio + 1, f[0], f[1]));
    }
    return lista;
  }

  /** Vencimientos de un modelo cuya fecha límite está entre desde y hasta (texto AAAA-MM-DD, incluidos). */
  function vencimientosEntre(codigo, periodicidad, desde, hasta) {
    const a1 = Number(desde.slice(0, 4)) - 2;
    const a2 = Number(hasta.slice(0, 4));
    let lista = [];
    for (let a = a1; a <= a2; a++) lista = lista.concat(vencimientosEjercicio(codigo, periodicidad, a));
    return lista.filter(function (v) { return v.fecha >= desde && v.fecha <= hasta; })
      .sort(function (x, y) { return x.fecha < y.fecha ? -1 : 1; });
  }

  global.CalendarioFiscal = {
    MODELOS: MODELOS,
    PERIODICIDADES: PERIODICIDADES,
    MESES: MESES,
    vencimientosEjercicio: vencimientosEjercicio,
    vencimientosEntre: vencimientosEntre,
    esHabil: esHabil
  };
})(window);
