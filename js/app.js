/* CRM RD Asesores · pantallas y funcionamiento */
(function () {
  'use strict';

  const CF = window.CalendarioFiscal;
  let DB = Datos.cargar();
  normalizar(DB);
  Datos.guardar(DB);

  const $app = document.getElementById('app');
  const $dialogo = document.getElementById('dialogo');
  const $flotante = document.getElementById('aviso-flotante');

  // Estado de la pantalla (filtros, mes del calendario…), no se guarda.
  const UI = {
    busqueda: '', fTipo: '', fResp: '', fEstado: '',
    calMes: Datos.hoyISO().slice(0, 7), calCliente: '', calResp: '', calTipo: '',
    verContabilizadas: false, verTareasHechas: false
  };

  /* ---------- Textos fijos ---------- */
  const TIPOS_CLIENTE = { autonomo: 'Autónomo', sociedad: 'Sociedad', particular: 'Particular' };
  const ESTADOS_DOC = { recibir: 'Pendiente de recibir del cliente', preparacion: 'En preparación', lista: 'Lista para presentar' };
  const ESTADOS_CLIENTE = { verde: 'Al día', naranja: 'Con pendientes', rojo: 'Plazos urgentes' };
  const TIPOS_ACT = { llamada: 'Llamada', correo: 'Correo', reunion: 'Reunión', gestion: 'Gestión' };
  const TIPOS_ARCHIVO = ['Modelos', 'Declaraciones', 'Escrituras', 'Contratos', 'Notificaciones', 'Contabilidad', 'Nóminas', 'Otros'];
  const TAREAS_SUGERIDAS = [
    'Revisar escrituras', 'Preparar cierre contable', 'Responder a requerimiento de la AEAT',
    'Preparar declaración de la Renta', 'Preparar Impuesto sobre Sociedades', 'Legalizar libros contables',
    'Depositar cuentas anuales en el Registro Mercantil', 'Revisar contrato', 'Pedir documentación al cliente',
    'Recurso o alegaciones ante Hacienda', 'Revisar nóminas y seguros sociales', 'Reunión de planificación fiscal'
  ];
  const MODELOS_HABITUALES = {
    autonomo: ['303:trimestral', '130:trimestral', '390:anual', '100:anual'],
    sociedad: ['303:trimestral', '111:trimestral', '202:fraccionado', '200:anual', '390:anual', '347:anual', '190:anual'],
    particular: ['100:anual']
  };

  /* ---------- Utilidades ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hoy() { return Datos.hoyISO(); }
  function aFecha(iso) { const p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2] || 1, 12); }
  function sumarDias(iso, n) { const d = aFecha(iso); d.setDate(d.getDate() + n); return Datos.iso(d); }
  function diasEntre(a, b) { return Math.round((aFecha(b) - aFecha(a)) / 86400000); }
  function fmt(iso) { if (!iso) return '—'; const p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function fmtLarga(iso) {
    return aFecha(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function mayus(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function euros(n) { return (Number(n) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }); }
  function cuando(fecha) {
    if (!fecha) return 'Sin fecha';
    const d = diasEntre(hoy(), fecha);
    if (d === 0) return 'Hoy';
    if (d === 1) return 'Mañana';
    if (d === -1) return 'Venció ayer';
    if (d < 0) return 'Venció hace ' + (-d) + ' días';
    return 'En ' + d + ' días';
  }
  function claseFecha(fecha) {
    if (!fecha) return '';
    const d = diasEntre(hoy(), fecha);
    return d <= 7 ? 'texto-rojo' : (d <= 15 ? 'texto-naranja' : '');
  }
  function usuario(id) { return DB.usuarios.find(function (u) { return u.id === id; }); }
  function nombreUsuario(id) { const u = usuario(id); return u ? u.nombre : '—'; }
  function cliente(id) { return DB.clientes.find(function (c) { return c.id === id; }); }
  function opcionesUsuarios(conVacio) {
    const l = DB.usuarios.map(function (u) { return [u.id, u.nombre]; });
    return conVacio ? [['', conVacio]].concat(l) : l;
  }
  function nombreModelo(codigo) { return CF.MODELOS[codigo] ? CF.MODELOS[codigo].nombre : 'Modelo ' + codigo; }

  function normalizar(db) {
    db.usuarios = db.usuarios || [];
    db.ajustes = Object.assign({ rutaClientes: '', diasFacturaAntigua: 30, soloMio: false }, db.ajustes || {});
    db.tareas = db.tareas || [];
    if (!db.usuarios.find(function (u) { return u.id === db.usuarioActual; })) {
      db.usuarioActual = db.usuarios[0] ? db.usuarios[0].id : '';
    }
    db.clientes.forEach(function (c) {
      ['modelos', 'docsPresentados', 'docsPendientes', 'archivos', 'facturas', 'actividad'].forEach(function (k) { c[k] = c[k] || []; });
      c.presentados = c.presentados || {};
      c.controlDesde = c.controlDesde || hoy();
    });
  }

  function guardar() {
    if (!Datos.guardar(DB)) mostrarAviso('Atención: este navegador no permite guardar los datos.');
  }

  let temporizador = null;
  function mostrarAviso(texto, deshacer) {
    clearTimeout(temporizador);
    $flotante.innerHTML = '<span>' + esc(texto) + '</span>' + (deshacer ? '<button type="button">Deshacer</button>' : '');
    $flotante.hidden = false;
    if (deshacer) {
      $flotante.querySelector('button').onclick = function () { deshacer(); $flotante.hidden = true; };
    }
    temporizador = setTimeout(function () { $flotante.hidden = true; }, 6000);
  }

  // Ejecuta un cambio, guarda, repinta y ofrece "Deshacer".
  function cambiar(texto, fn) {
    const copia = JSON.stringify(DB);
    fn();
    guardar();
    render();
    mostrarAviso(texto, function () { DB = JSON.parse(copia); guardar(); render(); });
  }

  /* ---------- Cálculos: vencimientos, estado, avisos ---------- */
  function vencimientosCliente(c, desde, hasta) {
    let lista = [];
    c.modelos.forEach(function (m) {
      CF.vencimientosEntre(m.codigo, m.periodicidad, desde, hasta).forEach(function (v) {
        v.presentado = c.presentados[v.clave] || null;
        lista.push(v);
      });
    });
    return lista.sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; });
  }
  function modelosPendientes(c, hasta) {
    return vencimientosCliente(c, c.controlDesde, hasta).filter(function (v) { return !v.presentado; });
  }
  function proximoVencimiento(c, codigo) {
    const lista = modelosPendientes(c, sumarDias(hoy(), 400));
    return lista.find(function (v) { return !codigo || v.codigo === codigo; }) || null;
  }
  function buscarVencimiento(c, clave) {
    const codigo = clave.split('|')[0];
    const m = c.modelos.find(function (x) { return x.codigo === codigo; });
    if (!m) return null;
    return CF.vencimientosEntre(m.codigo, m.periodicidad, sumarDias(hoy(), -1500), sumarDias(hoy(), 800))
      .find(function (v) { return v.clave === clave; }) || null;
  }
  function tareasCliente(c) { return DB.tareas.filter(function (t) { return t.clienteId === c.id; }); }
  function facturasPendientes(c) { return c.facturas.filter(function (f) { return f.estado === 'recibida'; }); }
  function sumaImportes(l) { return l.reduce(function (s, f) { return s + (Number(f.importe) || 0); }, 0); }

  function estadoCliente(c) {
    const l7 = sumarDias(hoy(), 7), l15 = sumarDias(hoy(), 15);
    const fechas = modelosPendientes(c, l15).map(function (v) { return v.fecha; })
      .concat(c.docsPendientes.map(function (d) { return d.fechaLimite; }))
      .concat(tareasCliente(c).filter(function (t) { return !t.hecha; }).map(function (t) { return t.fechaLimite; }));
    const conFecha = fechas.filter(Boolean);
    if (conFecha.some(function (f) { return f <= l7; })) return 'rojo';
    if (fechas.length || facturasPendientes(c).length) return 'naranja';
    return 'verde';
  }

  function calcularAvisos(soloUsuario, soloCliente) {
    const lista = [];
    const l15 = sumarDias(hoy(), 15);
    DB.clientes.forEach(function (c) {
      if (soloCliente && c.id !== soloCliente) return;
      modelosPendientes(c, l15).forEach(function (v) {
        lista.push({ tipo: 'modelo', c: c, id: v.clave, titulo: 'Modelo ' + v.codigo + ' · ' + v.periodo, detalle: nombreModelo(v.codigo), fecha: v.fecha, resp: c.responsableId });
      });
      c.docsPendientes.forEach(function (d) {
        lista.push({ tipo: 'doc', c: c, id: d.id, titulo: d.nombre, detalle: ESTADOS_DOC[d.estado], estado: d.estado, fecha: d.fechaLimite, resp: c.responsableId });
      });
      facturasPendientes(c).forEach(function (f) {
        lista.push({ tipo: 'factura', c: c, id: f.id, titulo: 'Factura ' + f.numero + ' · ' + f.tercero, detalle: euros(f.importe), fecha: f.fecha, antiguedad: diasEntre(f.fecha, hoy()), resp: c.responsableId });
      });
    });
    DB.tareas.forEach(function (t) {
      if (t.hecha) return;
      if (soloCliente && t.clienteId !== soloCliente) return;
      const c = cliente(t.clienteId) || null;
      lista.push({ tipo: 'tarea', c: c, id: t.id, titulo: t.titulo, detalle: 'Acción de asesoramiento', fecha: t.fechaLimite, resp: t.responsableId || (c && c.responsableId) });
    });
    const filtrada = soloUsuario ? lista.filter(function (a) { return a.resp === soloUsuario || (a.c && a.c.responsableId === soloUsuario); }) : lista;
    return filtrada.sort(function (a, b) { return (a.fecha || '9999') < (b.fecha || '9999') ? -1 : 1; });
  }

  /* ---------- Acciones de "hecho" ---------- */
  function presentarModelo(c, clave) {
    const v = buscarVencimiento(c, clave);
    const quien = nombreUsuario(DB.usuarioActual);
    c.presentados[clave] = { fecha: hoy(), por: quien };
    c.docsPresentados.push({ id: Datos.uid('dp'), nombre: 'Modelo ' + clave.split('|')[0] + ' · ' + (v ? v.periodo : clave.split('|')[1]), fecha: hoy(), presentadoPor: quien, claveModelo: clave });
  }
  function desmarcarModelo(c, clave) {
    delete c.presentados[clave];
    c.docsPresentados = c.docsPresentados.filter(function (d) { return d.claveModelo !== clave; });
  }
  function presentarDoc(c, id) {
    const d = c.docsPendientes.find(function (x) { return x.id === id; });
    if (!d) return;
    c.docsPendientes = c.docsPendientes.filter(function (x) { return x.id !== id; });
    c.docsPresentados.push({ id: Datos.uid('dp'), nombre: d.nombre, fecha: hoy(), presentadoPor: nombreUsuario(DB.usuarioActual) });
  }
  function contabilizar(c, id) {
    const f = c.facturas.find(function (x) { return x.id === id; });
    if (f) { f.estado = 'contabilizada'; f.fechaContab = hoy(); }
  }
  function marcarHecho(tipo, clienteId, id) {
    const c = cliente(clienteId);
    if (tipo === 'modelo' && c) cambiar('Modelo marcado como presentado.', function () { presentarModelo(c, id); });
    if (tipo === 'doc' && c) {
      const d = c.docsPendientes.find(function (x) { return x.id === id; });
      if (d && d.estado === 'recibir') cambiar('Documentación marcada como recibida (pasa a "En preparación").', function () { d.estado = 'preparacion'; });
      else cambiar('Documentación marcada como presentada.', function () { presentarDoc(c, id); });
    }
    if (tipo === 'factura' && c) cambiar('Factura marcada como contabilizada.', function () { contabilizar(c, id); });
    if (tipo === 'tarea') {
      const t = DB.tareas.find(function (x) { return x.id === id; });
      if (t) cambiar(t.hecha ? 'Tarea reabierta.' : 'Tarea marcada como hecha.', function () { t.hecha = !t.hecha; t.fechaHecha = t.hecha ? hoy() : null; });
    }
  }
  function textoHecho(a) {
    if (a.tipo === 'modelo') return 'Marcar como presentado';
    if (a.tipo === 'doc') return a.estado === 'recibir' ? 'Marcar como recibida del cliente' : 'Marcar como presentada';
    if (a.tipo === 'factura') return 'Marcar como contabilizada';
    return 'Marcar como hecha';
  }
  const ETIQUETA_TIPO = {
    modelo: '<span class="etiqueta etiqueta--azul">Modelo</span>',
    doc: '<span class="etiqueta" style="background:#f1ecf7;color:#6d5296">Documentación</span>',
    factura: '<span class="etiqueta etiqueta--naranja">Factura</span>',
    tarea: '<span class="etiqueta">Tarea</span>'
  };

  /* ---------- Formularios (ventana emergente) ---------- */
  function campoHTML(c) {
    const id = 'f-' + c.nombre;
    const req = c.requerido ? ' required' : '';
    const valor = c.valor == null ? '' : c.valor;
    let control;
    if (c.tipo === 'select') {
      control = '<select id="' + id + '" name="' + c.nombre + '"' + req + '>' + c.opciones.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(valor) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('') + '</select>';
    } else if (c.tipo === 'textarea') {
      control = '<textarea id="' + id + '" name="' + c.nombre + '"' + req + '>' + esc(valor) + '</textarea>';
    } else {
      control = '<input type="' + (c.tipo || 'text') + '" id="' + id + '" name="' + c.nombre + '" value="' + esc(valor) + '"' + req +
        (c.paso ? ' step="' + c.paso + '"' : '') + (c.ejemplo ? ' placeholder="' + esc(c.ejemplo) + '"' : '') +
        (c.sugerencias ? ' list="' + id + '-lista" autocomplete="off"' : '') + '>';
      if (c.sugerencias) control += '<datalist id="' + id + '-lista">' + c.sugerencias.map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist>';
    }
    return '<div class="campo"><label for="' + id + '">' + esc(c.etiqueta) + (c.requerido ? ' *' : '') + '</label>' + control +
      (c.ayuda ? '<span class="ayuda">' + esc(c.ayuda) + '</span>' : '') + '</div>';
  }

  function formulario(o) {
    const cuerpo = o.campos.map(function (c) {
      return Array.isArray(c) ? '<div class="campos-2">' + c.map(campoHTML).join('') + '</div>' : campoHTML(c);
    }).join('');
    $dialogo.innerHTML = '<form novalidate>' +
      '<div class="dialogo__cab"><h2>' + esc(o.titulo) + '</h2><button type="button" data-cerrar aria-label="Cerrar">×</button></div>' +
      '<div class="dialogo__cuerpo">' + (o.intro ? '<p class="secundario" style="margin:0">' + esc(o.intro) + '</p>' : '') + cuerpo + '</div>' +
      '<div class="dialogo__pie"><button type="button" class="boton boton--secundario" data-cerrar>Cancelar</button>' +
      '<button type="submit" class="boton">' + esc(o.textoGuardar || 'Guardar') + '</button></div></form>';
    const form = $dialogo.querySelector('form');
    $dialogo.querySelectorAll('[data-cerrar]').forEach(function (b) { b.onclick = function () { $dialogo.close(); }; });
    if (o.alCambiar) form.addEventListener('change', function (e) { o.alCambiar(form, e); });
    form.onsubmit = function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const valores = {};
      new FormData(form).forEach(function (v, k) { valores[k] = typeof v === 'string' ? v.trim() : v; });
      if (o.alGuardar(valores) !== false) $dialogo.close();
    };
    $dialogo.showModal();
    const primero = form.querySelector('input, select, textarea');
    if (primero) primero.focus();
  }

  /* ---------- Pantalla: HOY ---------- */
  function itemAviso(a, mostrarCliente) {
    const fechaTxt = a.tipo === 'factura'
      ? '<span class="aviso__fecha texto-naranja">Recibida hace ' + a.antiguedad + ' días</span>'
      : '<span class="aviso__fecha ' + claseFecha(a.fecha) + '">' + esc(cuando(a.fecha)) + '<br><small>' + fmt(a.fecha) + '</small></span>';
    const enlaceCliente = a.c
      ? '<a href="#/cliente/' + esc(a.c.id) + '/' + ({ modelo: 'modelos', doc: 'documentacion', factura: 'facturas', tarea: 'tareas' }[a.tipo]) + '">' + esc(a.c.nombre) + '</a>'
      : '<span>Tarea general del despacho</span>';
    return '<li class="aviso">' +
      '<input type="checkbox" class="casilla" data-accion="hecho" data-tipo="' + a.tipo + '" data-c="' + esc(a.c ? a.c.id : '') + '" data-id="' + esc(a.id) + '" title="' + textoHecho(a) + '" aria-label="' + textoHecho(a) + ': ' + esc(a.titulo) + '">' +
      '<div class="aviso__cuerpo"><div class="aviso__titulo">' + esc(a.titulo) + '</div>' +
      '<div class="aviso__meta">' + ETIQUETA_TIPO[a.tipo] + (mostrarCliente !== false ? enlaceCliente : '') +
      '</div><div class="aviso__meta"><span>' + esc(a.detalle ? a.detalle + ' · ' : '') + 'Resp.: ' + esc(nombreUsuario(a.resp)) + '</span></div></div>' +
      '<div class="aviso__lado">' + fechaTxt + '</div></li>';
  }
  function listaAvisos(lista, vacio, mostrarCliente) {
    if (!lista.length) return '<p class="vacio">' + esc(vacio) + '</p>';
    return '<ul class="lista-avisos">' + lista.map(function (a) { return itemAviso(a, mostrarCliente); }).join('') + '</ul>';
  }

  function pantallaHoy() {
    const solo = DB.ajustes.soloMio;
    const avisos = calcularAvisos(solo ? DB.usuarioActual : null);
    const h = hoy(), l7 = sumarDias(h, 7), l15 = sumarDias(h, 15);
    const conPlazo = avisos.filter(function (a) { return a.tipo !== 'factura' && a.fecha; });
    const vencidos = conPlazo.filter(function (a) { return a.fecha < h; });
    const p7 = conPlazo.filter(function (a) { return a.fecha >= h && a.fecha <= l7; });
    const p15 = conPlazo.filter(function (a) { return a.fecha > l7 && a.fecha <= l15; });
    const enPlazos = function (a) { return a.tipo !== 'factura' && a.fecha && a.fecha <= l15; };
    const sinRecibir = avisos.filter(function (a) { return a.tipo === 'doc' && a.estado === 'recibir' && !enPlazos(a); });
    const otras = avisos.filter(function (a) { return (a.tipo === 'tarea' || (a.tipo === 'doc' && a.estado !== 'recibir')) && !enPlazos(a); });
    const facturas = avisos.filter(function (a) { return a.tipo === 'factura'; });
    const antiguas = facturas.filter(function (a) { return a.antiguedad >= DB.ajustes.diasFacturaAntigua; });
    const totalSinRecibir = avisos.filter(function (a) { return a.tipo === 'doc' && a.estado === 'recibir'; }).length;
    const importeFacturas = facturas.reduce(function (s, a) {
      const f = a.c.facturas.find(function (x) { return x.id === a.id; }); return s + (f ? Number(f.importe) || 0 : 0);
    }, 0);

    $app.innerHTML =
      '<div class="encabezado-pagina"><div><h1>Hoy</h1><p>' + esc(mayus(fmtLarga(h))) + '</p></div>' +
      '<div class="interruptor" role="group" aria-label="Qué mostrar">' +
      '<button type="button" data-accion="solo-mio" data-valor="0" class="' + (solo ? '' : 'activo') + '">Todo el despacho</button>' +
      '<button type="button" data-accion="solo-mio" data-valor="1" class="' + (solo ? 'activo' : '') + '">Solo lo mío (' + esc(nombreUsuario(DB.usuarioActual)) + ')</button></div></div>' +

      '<div class="cifras">' +
      cifra(vencidos.length, 'Vencido o fuera de plazo', 'rojo') +
      cifra(p7.length, 'Vence en los próximos 7 días', 'rojo') +
      cifra(p15.length, 'Vence en 8 a 15 días', 'naranja') +
      cifra(totalSinRecibir, 'Documentos que el cliente no ha enviado', 'naranja') +
      cifra(facturas.length, 'Facturas sin contabilizar · ' + euros(importeFacturas), '') +
      '</div>' +

      '<div class="caja-info"><p>Marca la casilla de la izquierda cuando algo esté hecho (modelo presentado, documento recibido o presentado, factura contabilizada o tarea terminada). Si te equivocas, pulsa <b>Deshacer</b> en el aviso que aparece abajo.</p></div>' +

      '<div class="rejilla rejilla--2">' +
      seccion('Vencido o fuera de plazo', listaAvisos(vencidos, 'Nada vencido. ¡Bien!'), 'rojo') +
      seccion('Próximos 7 días', listaAvisos(p7, 'Nada vence en los próximos 7 días.'), 'rojo') +
      seccion('De 8 a 15 días', listaAvisos(p15, 'Nada vence entre 8 y 15 días.'), 'naranja') +
      seccion('Documentación que el cliente aún no ha enviado', listaAvisos(sinRecibir, 'No hay más documentación pendiente de recibir.'), 'naranja') +
      seccion('Facturas sin contabilizar desde hace más de ' + DB.ajustes.diasFacturaAntigua + ' días', listaAvisos(antiguas, 'No hay facturas antiguas sin contabilizar.'), 'naranja') +
      seccion('Otras acciones pendientes del asesoramiento', listaAvisos(otras, 'No hay más acciones pendientes.') +
        '<p style="margin:12px 0 0"><button type="button" class="boton boton--destacado boton--peq" data-accion="nueva-tarea">+ Nueva tarea</button></p>', '') +
      '</div>';
  }
  function cifra(n, txt, color) {
    return '<div class="cifra' + (color ? ' cifra--' + color : '') + '"><div class="cifra__num">' + n + '</div><div class="cifra__txt">' + esc(txt) + '</div></div>';
  }
  function seccion(titulo, html, color) {
    const punto = color ? '<span class="punto punto--' + color + '"></span> ' : '';
    return '<section class="tarjeta"><h2>' + punto + esc(titulo) + '</h2>' + html + '</section>';
  }

  /* ---------- Pantalla: CLIENTES ---------- */
  function pantallaClientes() {
    $app.innerHTML =
      '<div class="encabezado-pagina"><div><h1>Clientes</h1><p>' + DB.clientes.length + ' clientes en el despacho</p></div>' +
      '<div class="acciones"><button type="button" class="boton boton--destacado" data-accion="nuevo-cliente">+ Nuevo cliente</button></div></div>' +
      '<div class="tarjeta">' +
      '<div class="filtros">' +
      '<div class="campo"><label for="busqueda">Buscar</label><input type="search" id="busqueda" placeholder="Nombre, NIF/CIF, contacto, teléfono o email" value="' + esc(UI.busqueda) + '"></div>' +
      filtroSelect('fTipo', 'Tipo', [['', 'Todos']].concat(Object.keys(TIPOS_CLIENTE).map(function (k) { return [k, TIPOS_CLIENTE[k]]; }))) +
      filtroSelect('fResp', 'Responsable', opcionesUsuarios('Todos')) +
      filtroSelect('fEstado', 'Estado', [['', 'Todos'], ['verde', 'Al día'], ['naranja', 'Con pendientes'], ['rojo', 'Con plazos urgentes']]) +
      '</div>' +
      '<div class="leyenda" style="margin-bottom:12px"><span><i class="punto punto--verde"></i> Al día</span><span><i class="punto punto--naranja"></i> Algo pendiente</span><span><i class="punto punto--rojo"></i> Plazo a punto de vencer (7 días) o vencido</span></div>' +
      '<div id="tabla-clientes"></div></div>';
    pintarTablaClientes();
  }
  function filtroSelect(clave, etiqueta, opciones) {
    return '<div class="campo"><label for="' + clave + '">' + esc(etiqueta) + '</label><select id="' + clave + '" data-filtro="' + clave + '">' +
      opciones.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (UI[clave] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>';
  }
  function pintarTablaClientes() {
    const cont = document.getElementById('tabla-clientes');
    if (!cont) return;
    const q = UI.busqueda.toLowerCase();
    const filas = DB.clientes.map(function (c) { return { c: c, estado: estadoCliente(c) }; }).filter(function (x) {
      const c = x.c;
      if (UI.fTipo && c.tipo !== UI.fTipo) return false;
      if (UI.fResp && c.responsableId !== UI.fResp) return false;
      if (UI.fEstado && x.estado !== UI.fEstado) return false;
      if (q) {
        const texto = [c.nombre, c.nif, c.contacto, c.telefono, c.email, c.direccion].join(' ').toLowerCase();
        if (texto.indexOf(q) < 0) return false;
      }
      return true;
    }).sort(function (a, b) {
      const orden = { rojo: 0, naranja: 1, verde: 2 };
      return orden[a.estado] - orden[b.estado] || a.c.nombre.localeCompare(b.c.nombre, 'es');
    });
    if (!filas.length) { cont.innerHTML = '<p class="vacio">No hay clientes que coincidan con la búsqueda.</p>'; return; }
    cont.innerHTML = '<div class="tabla-envoltorio"><table class="tabla tabla--movil"><thead><tr>' +
      '<th></th><th>Cliente</th><th>NIF/CIF</th><th>Tipo</th><th>Responsable</th><th>Próximo vencimiento</th><th class="num">Pendientes</th><th class="num">Facturas sin contab.</th></tr></thead><tbody>' +
      filas.map(function (x) {
        const c = x.c;
        const pv = proximoVencimiento(c);
        const pend = c.docsPendientes.length + tareasCliente(c).filter(function (t) { return !t.hecha; }).length;
        const fp = facturasPendientes(c);
        return '<tr>' +
          '<td data-etiqueta="Estado"><span class="punto punto--' + x.estado + '" title="' + ESTADOS_CLIENTE[x.estado] + '"></span></td>' +
          '<td class="principal"><a class="nombre-cliente" href="#/cliente/' + esc(c.id) + '">' + esc(c.nombre) + '</a><br><small>' + esc(c.contacto || '') + '</small></td>' +
          '<td data-etiqueta="NIF/CIF">' + esc(c.nif || '—') + '</td>' +
          '<td data-etiqueta="Tipo">' + esc(TIPOS_CLIENTE[c.tipo] || c.tipo) + '</td>' +
          '<td data-etiqueta="Responsable">' + esc(nombreUsuario(c.responsableId)) + '</td>' +
          '<td data-etiqueta="Próximo vencimiento">' + (pv ? '<span class="' + claseFecha(pv.fecha) + '">' + esc(pv.codigo) + ' · ' + fmt(pv.fecha) + '</span><br><small>' + esc(cuando(pv.fecha)) + '</small>' : '—') + '</td>' +
          '<td data-etiqueta="Pendientes" class="num">' + pend + '</td>' +
          '<td data-etiqueta="Facturas sin contabilizar" class="num">' + (fp.length ? fp.length + ' · ' + euros(sumaImportes(fp)) : '0') + '</td>' +
          '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ---------- Pantalla: FICHA DE CLIENTE ---------- */
  const PESTANAS = [
    ['resumen', 'Datos'], ['modelos', 'Modelos'], ['documentacion', 'Documentación'], ['carpeta', 'Carpeta CLIENTES'],
    ['facturas', 'Facturas'], ['actividad', 'Historial'], ['tareas', 'Tareas']
  ];

  function pantallaFicha(id, pestana) {
    const c = cliente(id);
    if (!c) { $app.innerHTML = '<div class="tarjeta"><h1>Cliente no encontrado</h1><p><a href="#/clientes">Volver al listado</a></p></div>'; return; }
    pestana = PESTANAS.some(function (p) { return p[0] === pestana; }) ? pestana : 'resumen';
    const estado = estadoCliente(c);
    const pv = proximoVencimiento(c);
    const fp = facturasPendientes(c);
    const tp = tareasCliente(c).filter(function (t) { return !t.hecha; });
    const contadores = { documentacion: c.docsPendientes.length, facturas: fp.length, tareas: tp.length };

    $app.innerHTML =
      '<p style="margin:0 0 12px"><a href="#/clientes">← Volver a clientes</a></p>' +
      '<section class="ficha-cab"><div class="ficha-cab__fila"><div>' +
      '<h1><span class="punto punto--' + estado + '" title="' + ESTADOS_CLIENTE[estado] + '"></span>' + esc(c.nombre) + '</h1>' +
      '<div class="ficha-cab__datos"><span class="etiqueta etiqueta--azul">' + esc(TIPOS_CLIENTE[c.tipo]) + '</span>' +
      '<span>NIF/CIF: <b>' + esc(c.nif || '—') + '</b></span><span>Responsable: <b>' + esc(nombreUsuario(c.responsableId)) + '</b></span>' +
      (c.telefono ? '<span><a href="tel:' + esc(c.telefono.replace(/\s/g, '')) + '">' + esc(c.telefono) + '</a></span>' : '') +
      (c.email ? '<span><a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a></span>' : '') + '</div></div>' +
      '<div class="acciones"><button type="button" class="boton boton--destacado" data-accion="nueva-actividad" data-c="' + esc(c.id) + '">+ Registrar actividad</button>' +
      '<button type="button" class="boton boton--secundario" data-accion="editar-cliente" data-c="' + esc(c.id) + '">Editar datos</button></div></div>' +
      '<div class="resumen-chips">' +
      '<div class="chip"><span>Estado</span><b class="texto-' + (estado === 'naranja' ? 'naranja' : estado) + '">' + ESTADOS_CLIENTE[estado] + '</b></div>' +
      '<div class="chip"><span>Próximo vencimiento</span><b class="' + (pv ? claseFecha(pv.fecha) : '') + '">' + (pv ? 'Modelo ' + esc(pv.codigo) + ' · ' + fmt(pv.fecha) : '—') + '</b></div>' +
      '<div class="chip"><span>Documentación pendiente</span><b>' + c.docsPendientes.length + '</b></div>' +
      '<div class="chip"><span>Facturas sin contabilizar</span><b>' + fp.length + ' · ' + euros(sumaImportes(fp)) + '</b></div>' +
      '<div class="chip"><span>Tareas pendientes</span><b>' + tp.length + '</b></div>' +
      '</div></section>' +
      '<nav class="pestanas" aria-label="Apartados del cliente">' + PESTANAS.map(function (p) {
        return '<a href="#/cliente/' + esc(c.id) + '/' + p[0] + '" class="' + (p[0] === pestana ? 'activo' : '') + '">' + p[1] +
          (contadores[p[0]] ? '<span class="contador">' + contadores[p[0]] + '</span>' : '') + '</a>';
      }).join('') + '</nav>' +
      '<div id="contenido-pestana">' + ({
        resumen: pestResumen, modelos: pestModelos, documentacion: pestDocumentacion, carpeta: pestCarpeta,
        facturas: pestFacturas, actividad: pestActividad, tareas: pestTareas
      }[pestana])(c) + '</div>';
  }

  function pestResumen(c) {
    const avisos = calcularAvisos(null, c.id).filter(function (a) { return a.tipo !== 'factura'; }).slice(0, 8);
    return '<div class="rejilla rejilla--2">' +
      '<section class="tarjeta"><div class="tarjeta__cab"><h2>Datos básicos</h2><button type="button" class="boton boton--secundario boton--peq" data-accion="editar-cliente" data-c="' + esc(c.id) + '">Editar</button></div>' +
      '<dl class="datos-lista">' +
      dato('Nombre o razón social', c.nombre) + dato('NIF/CIF', c.nif) + dato('Tipo de cliente', TIPOS_CLIENTE[c.tipo]) +
      dato('Persona de contacto', c.contacto) + dato('Teléfono', c.telefono) + dato('Email', c.email) + dato('Dirección', c.direccion) +
      dato('Responsable en el despacho', nombreUsuario(c.responsableId)) + dato('Vencimientos controlados desde', fmt(c.controlDesde)) +
      '</dl>' +
      '<h3 style="margin-top:18px">Notas</h3><div class="notas">' + (c.notas ? esc(c.notas) : '<span class="secundario">Sin notas.</span>') + '</div>' +
      '<p style="margin:16px 0 0"><button type="button" class="boton boton--peligro boton--peq" data-accion="borrar-cliente" data-c="' + esc(c.id) + '">Eliminar cliente</button></p>' +
      '</section>' +
      '<section class="tarjeta"><h2>Lo próximo para este cliente</h2>' + listaAvisos(avisos, 'Nada pendiente con fecha en los próximos 15 días.', false) + '</section>' +
      '</div>';
  }
  function dato(et, val) { return '<dt>' + esc(et) + '</dt><dd>' + (val ? esc(val) : '<span class="secundario">—</span>') + '</dd>'; }

  function pestModelos(c) {
    const filas = c.modelos.map(function (m, i) {
      const pv = proximoVencimiento(c, m.codigo);
      return '<tr><td class="principal"><b>' + esc(m.codigo) + '</b> <span class="secundario">' + esc(nombreModelo(m.codigo)) + '</span></td>' +
        '<td data-etiqueta="Periodicidad">' + esc(CF.PERIODICIDADES[m.periodicidad] || m.periodicidad) + '</td>' +
        '<td data-etiqueta="Próximo vencimiento">' + (pv ? '<span class="' + claseFecha(pv.fecha) + '"><b>' + fmt(pv.fecha) + '</b> · ' + esc(pv.periodo) + '</span><br><small>' + esc(cuando(pv.fecha)) + '</small>' : '—') + '</td>' +
        '<td class="acc">' + (pv ? '<button type="button" class="boton boton--peq" data-accion="hecho" data-tipo="modelo" data-c="' + esc(c.id) + '" data-id="' + esc(pv.clave) + '">✓ Presentado</button> ' : '') +
        '<button type="button" class="boton-icono" title="Quitar modelo" aria-label="Quitar modelo ' + esc(m.codigo) + '" data-accion="borrar-modelo" data-c="' + esc(c.id) + '" data-id="' + i + '">🗑</button></td></tr>';
    }).join('');

    const desde = c.controlDesde, hasta = sumarDias(hoy(), 183);
    const venc = vencimientosCliente(c, desde, hasta);
    const lista = venc.map(function (v) {
      const vencido = !v.presentado && v.fecha < hoy();
      return '<li class="aviso"><input type="checkbox" class="casilla" data-accion="alternar-modelo" data-c="' + esc(c.id) + '" data-id="' + esc(v.clave) + '"' + (v.presentado ? ' checked' : '') + ' aria-label="Presentado: modelo ' + esc(v.codigo) + ' ' + esc(v.periodo) + '">' +
        '<div class="aviso__cuerpo"><div class="aviso__titulo">Modelo ' + esc(v.codigo) + ' · ' + esc(v.periodo) + '</div><div class="aviso__meta"><span>' + esc(nombreModelo(v.codigo)) + '</span>' +
        (v.presentado ? '<span class="texto-verde">Presentado el ' + fmt(v.presentado.fecha) + ' por ' + esc(v.presentado.por) + '</span>' : (vencido ? '<span class="texto-rojo">Sin presentar</span>' : '')) + '</div></div>' +
        '<div class="aviso__lado"><span class="aviso__fecha ' + (v.presentado ? 'secundario' : claseFecha(v.fecha)) + '">' + fmt(v.fecha) + (v.presentado ? '' : '<br><small>' + esc(cuando(v.fecha)) + '</small>') + '</span></div></li>';
    }).join('');

    return '<section class="tarjeta"><div class="tarjeta__cab"><h2>Modelos que presenta</h2><button type="button" class="boton boton--destacado boton--peq" data-accion="nuevo-modelo" data-c="' + esc(c.id) + '">+ Añadir modelo</button></div>' +
      (filas ? '<div class="tabla-envoltorio"><table class="tabla tabla--movil"><thead><tr><th>Modelo</th><th>Periodicidad</th><th>Próximo vencimiento</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>'
        : '<p class="vacio">Este cliente todavía no tiene modelos. Pulsa «Añadir modelo».</p>') +
      '</section>' +
      '<section class="tarjeta"><div class="tarjeta__cab"><h2>Calendario de vencimientos (próximos 6 meses)</h2>' +
      '<button type="button" class="boton boton--secundario boton--peq" data-accion="editar-control" data-c="' + esc(c.id) + '">Controlar desde: ' + fmt(c.controlDesde) + '</button></div>' +
      '<div class="caja-info"><p>Las fechas se calculan solas con el calendario fiscal (si el último día es sábado, domingo o festivo nacional, pasa al siguiente día hábil). Son orientativas: revisa cada año el calendario oficial de la AEAT. Marca la casilla cuando el modelo esté presentado.</p></div>' +
      (lista ? '<ul class="lista-avisos">' + lista + '</ul>' : '<p class="vacio">Sin vencimientos.</p>') + '</section>';
  }

  function pestDocumentacion(c) {
    const pend = c.docsPendientes.slice().sort(function (a, b) { return (a.fechaLimite || '9') < (b.fechaLimite || '9') ? -1 : 1; });
    const pres = c.docsPresentados.slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    const filasPend = pend.map(function (d) {
      return '<tr><td class="principal"><b>' + esc(d.nombre) + '</b></td>' +
        '<td data-etiqueta="Fecha límite"><span class="' + claseFecha(d.fechaLimite) + '">' + fmt(d.fechaLimite) + '</span><br><small>' + esc(cuando(d.fechaLimite)) + '</small></td>' +
        '<td data-etiqueta="Estado"><select data-accion="estado-doc" data-c="' + esc(c.id) + '" data-id="' + esc(d.id) + '" aria-label="Estado de ' + esc(d.nombre) + '">' +
        Object.keys(ESTADOS_DOC).map(function (k) { return '<option value="' + k + '"' + (d.estado === k ? ' selected' : '') + '>' + ESTADOS_DOC[k] + '</option>'; }).join('') + '</select></td>' +
        '<td class="acc"><button type="button" class="boton boton--peq" data-accion="presentar-doc" data-c="' + esc(c.id) + '" data-id="' + esc(d.id) + '">✓ Presentada</button> ' +
        '<button type="button" class="boton-icono" title="Editar" aria-label="Editar" data-accion="editar-doc-pend" data-c="' + esc(c.id) + '" data-id="' + esc(d.id) + '">✎</button>' +
        '<button type="button" class="boton-icono" title="Eliminar" aria-label="Eliminar" data-accion="borrar-doc-pend" data-c="' + esc(c.id) + '" data-id="' + esc(d.id) + '">🗑</button></td></tr>';
    }).join('');
    const filasPres = pres.map(function (d) {
      return '<tr><td class="principal">' + esc(d.nombre) + '</td><td data-etiqueta="Fecha">' + fmt(d.fecha) + '</td><td data-etiqueta="Presentado por">' + esc(d.presentadoPor || '—') + '</td>' +
        '<td class="acc"><button type="button" class="boton-icono" title="Eliminar" aria-label="Eliminar" data-accion="borrar-doc-pres" data-c="' + esc(c.id) + '" data-id="' + esc(d.id) + '">🗑</button></td></tr>';
    }).join('');
    return '<section class="tarjeta"><div class="tarjeta__cab"><h2>Documentación pendiente de presentar</h2>' +
      '<button type="button" class="boton boton--destacado boton--peq" data-accion="nuevo-doc-pend" data-c="' + esc(c.id) + '">+ Añadir pendiente</button></div>' +
      (filasPend ? '<div class="tabla-envoltorio"><table class="tabla tabla--movil"><thead><tr><th>Documento</th><th>Fecha límite</th><th>Estado</th><th></th></tr></thead><tbody>' + filasPend + '</tbody></table></div>'
        : '<p class="vacio">No falta nada por presentar.</p>') + '</section>' +
      '<section class="tarjeta"><div class="tarjeta__cab"><h2>Documentación presentada</h2>' +
      '<button type="button" class="boton boton--secundario boton--peq" data-accion="nuevo-doc-pres" data-c="' + esc(c.id) + '">+ Añadir presentada</button></div>' +
      (filasPres ? '<div class="tabla-envoltorio"><table class="tabla tabla--movil"><thead><tr><th>Documento</th><th>Fecha</th><th>Presentado por</th><th></th></tr></thead><tbody>' + filasPres + '</tbody></table></div>'
        : '<p class="vacio">Todavía no hay documentación presentada.</p>') + '</section>';
  }

  /* Carpeta CLIENTES */
  function esRutaAbsoluta(r) { return /^([a-zA-Z]:[\\/]|\\\\|\/|https?:)/.test(r); }
  function rutaCompleta(c, ruta) {
    if (esRutaAbsoluta(ruta)) return ruta;
    const base = (DB.ajustes.rutaClientes || '').replace(/[\\/]+$/, '');
    const sep = base.indexOf('\\') >= 0 || !base ? '\\' : '/';
    return [base, c.carpeta, ruta].filter(Boolean).join(sep).replace(/[\\/]+/g, sep).replace(/^\\(?!\\)/, '\\\\');
  }
  function urlArchivo(r) {
    if (/^https?:/.test(r)) return r;
    let p = r.replace(/\\/g, '/');
    if (p.indexOf('//') === 0) return 'file:' + encodeURI(p).replace(/#/g, '%23');
    if (/^[a-zA-Z]:/.test(p)) return 'file:///' + encodeURI(p).replace(/#/g, '%23');
    if (p.indexOf('/') === 0) return 'file://' + encodeURI(p).replace(/#/g, '%23');
    return encodeURI(p);
  }
  function pestCarpeta(c) {
    const grupos = {};
    c.archivos.forEach(function (a) {
      const t = a.tipo || 'Otros';
      grupos[t] = grupos[t] || {};
      const anio = a.anio || 'Sin año';
      (grupos[t][anio] = grupos[t][anio] || []).push(a);
    });
    const orden = TIPOS_ARCHIVO.filter(function (t) { return grupos[t]; }).concat(Object.keys(grupos).filter(function (t) { return TIPOS_ARCHIVO.indexOf(t) < 0; }));
    const html = orden.map(function (t) {
      const anios = Object.keys(grupos[t]).sort().reverse();
      return '<div class="grupo-archivos"><h3>' + esc(t) + '</h3>' + anios.map(function (an) {
        return '<h4>' + esc(an) + '</h4>' + grupos[t][an].sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); }).map(function (a) {
          const ruta = rutaCompleta(c, a.ruta);
          return '<div class="archivo"><div><b>' + esc(a.nombre) + '</b><br><code>' + esc(ruta) + '</code></div><div class="acciones">' +
            '<a class="boton boton--peq" href="' + esc(urlArchivo(ruta)) + '" target="_blank" rel="noopener">Abrir</a>' +
            '<button type="button" class="boton boton--secundario boton--peq" data-accion="copiar-ruta" data-ruta="' + esc(ruta) + '">Copiar ruta</button>' +
            '<button type="button" class="boton-icono" title="Editar" aria-label="Editar" data-accion="editar-archivo" data-c="' + esc(c.id) + '" data-id="' + esc(a.id) + '">✎</button>' +
            '<button type="button" class="boton-icono" title="Quitar de la lista" aria-label="Quitar de la lista" data-accion="borrar-archivo" data-c="' + esc(c.id) + '" data-id="' + esc(a.id) + '">🗑</button></div></div>';
        }).join('');
      }).join('') + '</div>';
    }).join('');
    return '<section class="tarjeta"><div class="tarjeta__cab"><h2>Documentación en la carpeta CLIENTES</h2><div class="acciones">' +
      '<button type="button" class="boton boton--destacado boton--peq" data-accion="nuevo-archivo" data-c="' + esc(c.id) + '">+ Añadir documento</button>' +
      '<label class="boton boton--secundario boton--peq" style="cursor:pointer">Leer carpeta del cliente…<input type="file" data-accion="leer-carpeta" data-c="' + esc(c.id) + '" webkitdirectory directory multiple hidden></label></div></div>' +
      '<div class="caja-info"><p><b>Carpeta de este cliente:</b> <code>' + esc(rutaCompleta(c, '')) + '</code> · ' +
      '<a href="#" data-accion="editar-cliente" data-c="' + esc(c.id) + '">cambiar nombre de carpeta</a> · <a href="#/ajustes">cambiar ruta general</a></p>' +
      '<p>Puedes apuntar cada documento a mano (indicando su ruta) o pulsar <b>«Leer carpeta del cliente…»</b> y elegir su carpeta: el CRM solo lee los <b>nombres</b> de los archivos para hacer la lista, no los abre ni los envía a ningún sitio. El botón «Abrir» funciona cuando el CRM se usa desde un ordenador de la oficina con acceso a esa carpeta; si el navegador no lo abre, usa «Copiar ruta» y pégala en el Explorador de archivos.</p></div>' +
      (html || '<p class="vacio">Todavía no hay documentos apuntados para este cliente.</p>') + '</section>';
  }
  function clasificarArchivo(ruta) {
    const t = ruta.toLowerCase();
    const anio = (ruta.match(/(?:^|[^0-9])((?:19|20)\d{2})(?![0-9])/) || [])[1] || '';
    let tipo = 'Otros';
    if (/escritura|notar|poder/.test(t)) tipo = 'Escrituras';
    else if (/contrato|arrendamiento|alquiler/.test(t)) tipo = 'Contratos';
    else if (/requerimiento|notificaci|sancion|sanción|liquidaci/.test(t)) tipo = 'Notificaciones';
    else if (/renta|declaraci|sociedades|patrimonio|\b(100|200|714|720)\b|_(100|200|714|720)[_.]/.test(t)) tipo = 'Declaraciones';
    else if (/modelo|\b(303|111|115|123|130|131|349|202|390|180|190|193|347)\b|(^|[^0-9])(303|111|115|123|130|131|349|202|390|180|190|193|347)([^0-9]|$)/.test(t)) tipo = 'Modelos';
    else if (/n[oó]mina|seguros sociales|tc1|tc2|rnt/.test(t)) tipo = 'Nóminas';
    else if (/contab|balance|diario|mayor|factura|libro/.test(t)) tipo = 'Contabilidad';
    return { tipo: tipo, anio: anio };
  }

  function pestFacturas(c) {
    const fp = facturasPendientes(c);
    const lista = c.facturas.filter(function (f) { return UI.verContabilizadas || f.estado === 'recibida'; })
      .sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    const filas = lista.map(function (f) {
      const dias = diasEntre(f.fecha, hoy());
      const antigua = f.estado === 'recibida' && dias >= DB.ajustes.diasFacturaAntigua;
      return '<tr class="' + (f.estado === 'contabilizada' ? 'fila-hecha' : '') + '"><td class="principal"><b>' + esc(f.numero) + '</b></td>' +
        '<td data-etiqueta="Fecha">' + fmt(f.fecha) + (f.estado === 'recibida' ? '<br><small class="' + (antigua ? 'texto-rojo' : '') + '">hace ' + dias + ' días</small>' : '') + '</td>' +
        '<td data-etiqueta="Proveedor / cliente">' + esc(f.tercero) + '</td>' +
        '<td data-etiqueta="Importe" class="num">' + euros(f.importe) + '</td>' +
        '<td data-etiqueta="Estado">' + (f.estado === 'recibida' ? '<span class="etiqueta etiqueta--naranja">Recibida</span>' : '<span class="etiqueta etiqueta--verde">Contabilizada</span>') + '</td>' +
        '<td class="acc">' + (f.estado === 'recibida' ? '<button type="button" class="boton boton--peq" data-accion="hecho" data-tipo="factura" data-c="' + esc(c.id) + '" data-id="' + esc(f.id) + '">✓ Contabilizar</button>' : '') +
        '<button type="button" class="boton-icono" title="Editar" aria-label="Editar" data-accion="editar-factura" data-c="' + esc(c.id) + '" data-id="' + esc(f.id) + '">✎</button>' +
        '<button type="button" class="boton-icono" title="Eliminar" aria-label="Eliminar" data-accion="borrar-factura" data-c="' + esc(c.id) + '" data-id="' + esc(f.id) + '">🗑</button></td></tr>';
    }).join('');
    return '<section class="tarjeta"><div class="tarjeta__cab"><h2>Facturas pendientes de contabilizar</h2>' +
      '<button type="button" class="boton boton--destacado boton--peq" data-accion="nueva-factura" data-c="' + esc(c.id) + '">+ Añadir factura</button></div>' +
      '<div class="contador-facturas"><div><b>' + fp.length + '</b><span>facturas sin contabilizar</span></div><div><b>' + euros(sumaImportes(fp)) + '</b><span>importe total pendiente</span></div></div>' +
      '<label style="display:inline-flex;gap:8px;align-items:center;font-size:.85rem;margin-bottom:10px"><input type="checkbox" data-accion="ver-contabilizadas"' + (UI.verContabilizadas ? ' checked' : '') + '> Mostrar también las ya contabilizadas</label>' +
      (filas ? '<div class="tabla-envoltorio"><table class="tabla tabla--movil"><thead><tr><th>Número</th><th>Fecha</th><th>Proveedor / cliente</th><th class="num">Importe</th><th>Estado</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>'
        : '<p class="vacio">No hay facturas pendientes de contabilizar.</p>') + '</section>';
  }

  function pestActividad(c) {
    const lista = c.actividad.slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    return '<section class="tarjeta"><div class="tarjeta__cab"><h2>Historial de actividad</h2>' +
      '<button type="button" class="boton boton--destacado boton--peq" data-accion="nueva-actividad" data-c="' + esc(c.id) + '">+ Registrar actividad</button></div>' +
      (lista.length ? '<ul class="cronologia">' + lista.map(function (a) {
        return '<li><div class="meta">' + fmt(a.fecha) + ' · <b>' + esc(TIPOS_ACT[a.tipo] || a.tipo) + '</b> · ' + esc(nombreUsuario(a.usuarioId)) +
          ' <button type="button" class="boton-icono" title="Eliminar" aria-label="Eliminar" data-accion="borrar-actividad" data-c="' + esc(c.id) + '" data-id="' + esc(a.id) + '">🗑</button></div>' +
          '<div>' + esc(a.descripcion) + '</div></li>';
      }).join('') + '</ul>' : '<p class="vacio">Sin actividad registrada.</p>') + '</section>';
  }

  function itemTarea(t, mostrarCliente) {
    const c = cliente(t.clienteId);
    return '<li class="aviso"><input type="checkbox" class="casilla" data-accion="hecho" data-tipo="tarea" data-id="' + esc(t.id) + '"' + (t.hecha ? ' checked' : '') + ' aria-label="Hecha: ' + esc(t.titulo) + '">' +
      '<div class="aviso__cuerpo"><div class="aviso__titulo"' + (t.hecha ? ' style="text-decoration:line-through;color:var(--texto-2)"' : '') + '>' + esc(t.titulo) + '</div>' +
      '<div class="aviso__meta">' + (mostrarCliente && c ? '<a href="#/cliente/' + esc(c.id) + '">' + esc(c.nombre) + '</a>' : '') +
      '<span>Resp.: ' + esc(nombreUsuario(t.responsableId)) + '</span>' + (t.hecha && t.fechaHecha ? '<span class="texto-verde">Hecha el ' + fmt(t.fechaHecha) + '</span>' : '') + '</div></div>' +
      '<div class="aviso__lado"><span class="aviso__fecha ' + (t.hecha ? 'secundario' : claseFecha(t.fechaLimite)) + '">' + fmt(t.fechaLimite) + (t.hecha ? '' : '<br><small>' + esc(cuando(t.fechaLimite)) + '</small>') + '</span>' +
      '<span><button type="button" class="boton-icono" title="Editar" aria-label="Editar" data-accion="editar-tarea" data-id="' + esc(t.id) + '">✎</button>' +
      '<button type="button" class="boton-icono" title="Eliminar" aria-label="Eliminar" data-accion="borrar-tarea" data-id="' + esc(t.id) + '">🗑</button></span></div></li>';
  }
  function pestTareas(c) {
    const todas = tareasCliente(c).sort(function (a, b) { return (a.fechaLimite || '9') < (b.fechaLimite || '9') ? -1 : 1; });
    const pend = todas.filter(function (t) { return !t.hecha; });
    const hechas = todas.filter(function (t) { return t.hecha; });
    return '<section class="tarjeta"><div class="tarjeta__cab"><h2>Tareas y acciones de asesoramiento</h2>' +
      '<button type="button" class="boton boton--destacado boton--peq" data-accion="nueva-tarea" data-c="' + esc(c.id) + '">+ Nueva tarea</button></div>' +
      (pend.length ? '<ul class="lista-avisos">' + pend.map(function (t) { return itemTarea(t, false); }).join('') + '</ul>' : '<p class="vacio">No hay tareas pendientes.</p>') +
      (hechas.length ? '<details style="margin-top:14px"><summary class="secundario" style="cursor:pointer">Ver tareas hechas (' + hechas.length + ')</summary><ul class="lista-avisos">' + hechas.map(function (t) { return itemTarea(t, false); }).join('') + '</ul></details>' : '') +
      '</section>';
  }

  /* ---------- Pantalla: CALENDARIO ---------- */
  function eventosEntre(desde, hasta) {
    const ev = [];
    const h = hoy();
    DB.clientes.forEach(function (c) {
      if (UI.calCliente && c.id !== UI.calCliente) return;
      const respOk = !UI.calResp || c.responsableId === UI.calResp;
      if (respOk && (!UI.calTipo || UI.calTipo === 'modelo')) {
        const ini = desde > c.controlDesde ? desde : c.controlDesde;
        if (ini <= hasta) vencimientosCliente(c, ini, hasta).forEach(function (v) {
          ev.push({ fecha: v.fecha, tipo: 'modelo', texto: v.codigo + ' · ' + c.nombre, titulo: 'Modelo ' + v.codigo + ' (' + v.periodo + ') · ' + c.nombre, hecho: !!v.presentado, vencido: !v.presentado && v.fecha < h, href: '#/cliente/' + c.id + '/modelos' });
        });
      }
      if (respOk && (!UI.calTipo || UI.calTipo === 'doc')) {
        c.docsPendientes.forEach(function (d) {
          if (d.fechaLimite && d.fechaLimite >= desde && d.fechaLimite <= hasta) {
            ev.push({ fecha: d.fechaLimite, tipo: 'doc', texto: 'Doc. · ' + c.nombre, titulo: d.nombre + ' · ' + c.nombre + ' (' + ESTADOS_DOC[d.estado] + ')', vencido: d.fechaLimite < h, href: '#/cliente/' + c.id + '/documentacion' });
          }
        });
      }
    });
    if (!UI.calTipo || UI.calTipo === 'tarea') {
      DB.tareas.forEach(function (t) {
        if (!t.fechaLimite || t.fechaLimite < desde || t.fechaLimite > hasta) return;
        if (UI.calCliente && t.clienteId !== UI.calCliente) return;
        if (UI.calResp && t.responsableId !== UI.calResp) return;
        const c = cliente(t.clienteId);
        ev.push({ fecha: t.fechaLimite, tipo: 'tarea', texto: t.titulo, titulo: t.titulo + (c ? ' · ' + c.nombre : ''), hecho: t.hecha, vencido: !t.hecha && t.fechaLimite < h, href: c ? '#/cliente/' + c.id + '/tareas' : '#/hoy' });
      });
    }
    return ev;
  }
  function eventoHTML(e) {
    const cls = 'evento' + (e.tipo === 'tarea' ? ' evento--tarea' : e.tipo === 'doc' ? ' evento--doc' : '') + (e.hecho ? ' evento--hecho' : '') + (e.vencido ? ' evento--vencido' : '');
    return '<a class="' + cls + '" href="' + esc(e.href) + '" title="' + esc(e.titulo) + '">' + esc(e.texto) + '</a>';
  }
  function pantallaCalendario() {
    const p = UI.calMes.split('-').map(Number);
    const primero = new Date(p[0], p[1] - 1, 1, 12);
    const ultimo = new Date(p[0], p[1], 0, 12);
    const inicio = new Date(primero); inicio.setDate(1 - ((primero.getDay() + 6) % 7));
    const fin = new Date(ultimo); fin.setDate(ultimo.getDate() + (7 - ((ultimo.getDay() + 6) % 7) - 1));
    const desde = Datos.iso(inicio), hasta = Datos.iso(fin);
    const ev = eventosEntre(desde, hasta);
    const porDia = {};
    ev.forEach(function (e) { (porDia[e.fecha] = porDia[e.fecha] || []).push(e); });
    const ordenTipo = { modelo: 0, doc: 1, tarea: 2 };
    Object.keys(porDia).forEach(function (k) { porDia[k].sort(function (a, b) { return ordenTipo[a.tipo] - ordenTipo[b.tipo]; }); });

    let celdas = '';
    const d = new Date(inicio);
    const h = hoy();
    while (Datos.iso(d) <= hasta) {
      const k = Datos.iso(d);
      const fuera = d.getMonth() !== primero.getMonth();
      celdas += '<div class="cal-celda' + (fuera ? ' cal-celda--fuera' : '') + (k === h ? ' cal-celda--hoy' : '') + '"><span class="cal-num">' + d.getDate() + '</span>' +
        (porDia[k] || []).map(eventoHTML).join('') + '</div>';
      d.setDate(d.getDate() + 1);
    }
    const diasMes = Object.keys(porDia).filter(function (k) { return k.slice(0, 7) === UI.calMes; }).sort();
    const agenda = diasMes.length ? diasMes.map(function (k) {
      return '<div class="cal-agenda__dia"><h3>' + esc(mayus(fmtLarga(k))) + (k === h ? ' · hoy' : '') + '</h3>' + porDia[k].map(eventoHTML).join('') + '</div>';
    }).join('') : '<p class="vacio">No hay vencimientos ni tareas este mes con los filtros elegidos.</p>';

    const tituloMes = CF.MESES[p[1] - 1] + ' ' + p[0];
    $app.innerHTML =
      '<div class="encabezado-pagina"><div><h1>Calendario</h1><p>Vencimientos fiscales, documentación pendiente y tareas</p></div>' +
      '<div class="acciones"><button type="button" class="boton boton--destacado" data-accion="nueva-tarea">+ Nueva tarea</button></div></div>' +
      '<div class="tarjeta">' +
      '<div class="cal-filtros">' +
      '<div class="campo"><label for="calCliente">Cliente</label><select id="calCliente" data-filtro-cal="calCliente">' +
      [['', 'Todos los clientes']].concat(DB.clientes.slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); }).map(function (c) { return [c.id, c.nombre]; }))
        .map(function (o) { return '<option value="' + esc(o[0]) + '"' + (UI.calCliente === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>' +
      '<div class="campo"><label for="calResp">Responsable</label><select id="calResp" data-filtro-cal="calResp">' +
      opcionesUsuarios('Todo el equipo').map(function (o) { return '<option value="' + esc(o[0]) + '"' + (UI.calResp === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>' +
      '<div class="campo"><label for="calTipo">Mostrar</label><select id="calTipo" data-filtro-cal="calTipo">' +
      [['', 'Todo'], ['modelo', 'Solo modelos tributarios'], ['doc', 'Solo documentación pendiente'], ['tarea', 'Solo tareas']]
        .map(function (o) { return '<option value="' + o[0] + '"' + (UI.calTipo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '</div>' +
      '<div class="cal-cab"><button type="button" class="boton boton--secundario boton--peq" data-accion="cal-mes" data-valor="-1">← Anterior</button>' +
      '<h2>' + esc(tituloMes) + '</h2>' +
      '<div class="acciones"><button type="button" class="boton boton--secundario boton--peq" data-accion="cal-mes" data-valor="0">Hoy</button>' +
      '<button type="button" class="boton boton--secundario boton--peq" data-accion="cal-mes" data-valor="1">Siguiente →</button></div></div>' +
      '<div class="leyenda" style="margin-bottom:12px"><span><i class="evento" style="width:22px;margin:0">&nbsp;</i> Modelo tributario</span><span><i class="evento evento--doc" style="width:22px;margin:0">&nbsp;</i> Documentación</span><span><i class="evento evento--tarea" style="width:22px;margin:0">&nbsp;</i> Tarea</span><span><i class="evento evento--vencido" style="width:22px;margin:0">&nbsp;</i> Vencido sin hacer</span><span style="text-decoration:line-through">Hecho</span></div>' +
      '<div class="cal-rejilla">' + ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(function (x) { return '<div class="cal-dia-semana">' + x + '</div>'; }).join('') + celdas + '</div>' +
      '<div class="cal-agenda">' + agenda + '</div>' +
      '</div>';
  }

  /* ---------- Pantalla: AJUSTES ---------- */
  function pantallaAjustes() {
    $app.innerHTML =
      '<div class="encabezado-pagina"><div><h1>Ajustes</h1><p>Equipo, carpeta de clientes y copias de seguridad</p></div></div>' +
      '<div class="rejilla rejilla--2">' +
      '<section class="tarjeta"><div class="tarjeta__cab"><h2>Equipo del despacho</h2><button type="button" class="boton boton--destacado boton--peq" data-accion="nuevo-usuario">+ Añadir persona</button></div>' +
      '<p class="secundario">Cada cliente tiene un responsable de esta lista. Elige quién eres arriba a la derecha («Usuario») para ver «Solo lo mío».</p>' +
      '<ul class="lista-avisos">' + DB.usuarios.map(function (u) {
        const n = DB.clientes.filter(function (c) { return c.responsableId === u.id; }).length;
        return '<li class="aviso"><div class="aviso__cuerpo"><div class="aviso__titulo">' + esc(u.nombre) + (u.id === DB.usuarioActual ? ' <span class="etiqueta etiqueta--azul">Tú</span>' : '') + '</div><div class="aviso__meta"><span>' + n + ' clientes</span></div></div>' +
          '<div class="aviso__lado"><span><button type="button" class="boton-icono" title="Cambiar nombre" aria-label="Cambiar nombre" data-accion="editar-usuario" data-id="' + esc(u.id) + '">✎</button>' +
          '<button type="button" class="boton-icono" title="Eliminar" aria-label="Eliminar" data-accion="borrar-usuario" data-id="' + esc(u.id) + '">🗑</button></span></div></li>';
      }).join('') + '</ul></section>' +

      '<section class="tarjeta"><h2>Carpeta CLIENTES y avisos</h2>' +
      '<div class="campo" style="margin-bottom:12px"><label for="rutaClientes">Ruta de la carpeta CLIENTES</label><input type="text" id="rutaClientes" value="' + esc(DB.ajustes.rutaClientes) + '" placeholder="Ejemplo: \\\\SERVIDOR\\CLIENTES  o  C:\\CLIENTES">' +
      '<span class="ayuda">Dentro de esta carpeta, cada cliente tiene su subcarpeta (se indica en la ficha del cliente).</span></div>' +
      '<div class="campo" style="margin-bottom:12px"><label for="diasFactura">Avisar de facturas sin contabilizar a partir de (días)</label><input type="number" min="1" id="diasFactura" value="' + esc(DB.ajustes.diasFacturaAntigua) + '"></div>' +
      '<button type="button" class="boton" data-accion="guardar-ajustes">Guardar ajustes</button></section>' +

      '<section class="tarjeta"><h2>Copias de seguridad</h2>' +
      '<p>Los datos se guardan <b>solo en este navegador y en este ordenador</b>. Descarga una copia a menudo y guárdala en un lugar seguro del despacho.</p>' +
      '<div class="acciones"><button type="button" class="boton" data-accion="exportar">Descargar copia</button>' +
      '<label class="boton boton--secundario" style="cursor:pointer">Recuperar una copia…<input type="file" accept=".json,application/json" data-accion="importar" hidden></label></div>' +
      '<hr style="border:none;border-top:1px solid var(--borde);margin:18px 0">' +
      '<p class="secundario">Volver a los 5 clientes de ejemplo (borra todo lo que hayas cambiado).</p>' +
      '<button type="button" class="boton boton--peligro" data-accion="restablecer">Restablecer datos de ejemplo</button></section>' +

      '<section class="tarjeta"><h2>Confidencialidad</h2>' +
      '<div class="caja-aviso"><p style="margin:0">Los clientes que ves son <b>de ejemplo e inventados</b>. Antes de introducir datos reales de clientes, consúltalo en el despacho (protección de datos) y decidid dónde se guardarán.</p></div>' +
      '<p class="secundario" style="margin:0">Las fechas de los modelos se calculan con el calendario fiscal estatal y los festivos nacionales. Son orientativas: revisad cada año el calendario oficial de la AEAT.</p></section>' +
      '</div>';
  }

  /* ---------- Formularios concretos ---------- */
  function formCliente(c) {
    const nuevo = !c;
    c = c || {};
    const campos = [
      { nombre: 'nombre', etiqueta: 'Nombre o razón social', requerido: true, valor: c.nombre },
      [{ nombre: 'nif', etiqueta: 'NIF/CIF', valor: c.nif },
        { nombre: 'tipo', etiqueta: 'Tipo de cliente', tipo: 'select', requerido: true, valor: c.tipo || 'autonomo', opciones: Object.keys(TIPOS_CLIENTE).map(function (k) { return [k, TIPOS_CLIENTE[k]]; }) }],
      { nombre: 'responsableId', etiqueta: 'Responsable en el despacho', tipo: 'select', requerido: true, valor: c.responsableId || DB.usuarioActual, opciones: opcionesUsuarios() },
      { nombre: 'contacto', etiqueta: 'Persona de contacto', valor: c.contacto },
      [{ nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'tel', valor: c.telefono },
        { nombre: 'email', etiqueta: 'Email', tipo: 'email', valor: c.email }],
      { nombre: 'direccion', etiqueta: 'Dirección', valor: c.direccion },
      [{ nombre: 'carpeta', etiqueta: 'Nombre de su carpeta en CLIENTES', valor: c.carpeta, ayuda: 'Si lo dejas vacío se usa el nombre del cliente.' },
        { nombre: 'controlDesde', etiqueta: 'Controlar vencimientos desde', tipo: 'date', valor: c.controlDesde || hoy(), requerido: true, ayuda: 'Lo anterior a esta fecha no genera avisos.' }],
      { nombre: 'notas', etiqueta: 'Notas', tipo: 'textarea', valor: c.notas }
    ];
    if (nuevo) campos.push({ nombre: 'habituales', etiqueta: '¿Añadir los modelos habituales según el tipo de cliente?', tipo: 'select', valor: 'si', opciones: [['si', 'Sí (luego puedes quitar o añadir)'], ['no', 'No, los añado yo']] });
    formulario({
      titulo: nuevo ? 'Nuevo cliente' : 'Editar datos del cliente',
      campos: campos,
      alGuardar: function (v) {
        const datos = {
          nombre: v.nombre, nif: v.nif.toUpperCase(), tipo: v.tipo, responsableId: v.responsableId, contacto: v.contacto,
          telefono: v.telefono, email: v.email, direccion: v.direccion, carpeta: v.carpeta || v.nombre, controlDesde: v.controlDesde, notas: v.notas
        };
        if (nuevo) {
          const id = Datos.uid('c');
          const n = Object.assign({ id: id, modelos: [], presentados: {}, docsPresentados: [], docsPendientes: [], archivos: [], facturas: [], actividad: [] }, datos);
          if (v.habituales === 'si') n.modelos = (MODELOS_HABITUALES[v.tipo] || []).map(function (m) { const p = m.split(':'); return { codigo: p[0], periodicidad: p[1] }; });
          DB.clientes.push(n);
          guardar();
          location.hash = '#/cliente/' + id;
          mostrarAviso('Cliente creado.');
        } else {
          cambiar('Datos del cliente guardados.', function () { Object.assign(c, datos); });
        }
      }
    });
  }

  function formModelo(c) {
    const codigos = Object.keys(CF.MODELOS).filter(function (k) { return !c.modelos.some(function (m) { return m.codigo === k; }); });
    if (!codigos.length) { mostrarAviso('Este cliente ya tiene todos los modelos de la lista.'); return; }
    const opPer = function (codigo) { return CF.MODELOS[codigo].periodicidades.map(function (p) { return [p, CF.PERIODICIDADES[p]]; }); };
    formulario({
      titulo: 'Añadir modelo tributario',
      campos: [
        { nombre: 'codigo', etiqueta: 'Modelo', tipo: 'select', valor: codigos[0], opciones: codigos.map(function (k) { return [k, k + ' · ' + CF.MODELOS[k].nombre]; }) },
        { nombre: 'periodicidad', etiqueta: 'Periodicidad', tipo: 'select', opciones: opPer(codigos[0]), ayuda: 'Mensual solo para grandes empresas, inscritos en el SII o en el REDEME.' }
      ],
      alCambiar: function (form, e) {
        if (e.target.name !== 'codigo') return;
        form.periodicidad.innerHTML = opPer(e.target.value).map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
      },
      alGuardar: function (v) {
        cambiar('Modelo ' + v.codigo + ' añadido.', function () { c.modelos.push({ codigo: v.codigo, periodicidad: v.periodicidad }); });
      }
    });
  }

  function formDocPendiente(c, d) {
    formulario({
      titulo: d ? 'Editar documentación pendiente' : 'Añadir documentación pendiente',
      campos: [
        { nombre: 'nombre', etiqueta: 'Qué falta', requerido: true, valor: d && d.nombre, sugerencias: ['Facturas del trimestre', 'Extractos bancarios', 'Certificado de retenciones', 'Escritura', 'Contrato', 'Libro de facturas emitidas', 'Libro de facturas recibidas', 'Datos fiscales para la Renta'] },
        [{ nombre: 'fechaLimite', etiqueta: 'Fecha límite', tipo: 'date', requerido: true, valor: d ? d.fechaLimite : sumarDias(hoy(), 15) },
          { nombre: 'estado', etiqueta: 'Estado', tipo: 'select', valor: d ? d.estado : 'recibir', opciones: Object.keys(ESTADOS_DOC).map(function (k) { return [k, ESTADOS_DOC[k]]; }) }]
      ],
      alGuardar: function (v) {
        cambiar('Documentación guardada.', function () {
          if (d) Object.assign(d, v); else c.docsPendientes.push(Object.assign({ id: Datos.uid('pd') }, v));
        });
      }
    });
  }

  function formDocPresentado(c) {
    formulario({
      titulo: 'Añadir documentación presentada',
      campos: [
        { nombre: 'nombre', etiqueta: 'Documento', requerido: true, sugerencias: ['Modelo 303', 'Modelo 130', 'Modelo 111', 'Declaración de la Renta', 'Impuesto sobre Sociedades', 'Cuentas anuales', 'Escritura', 'Contrato', 'Alegaciones'] },
        [{ nombre: 'fecha', etiqueta: 'Fecha', tipo: 'date', requerido: true, valor: hoy() },
          { nombre: 'presentadoPor', etiqueta: 'Presentado por', tipo: 'select', valor: nombreUsuario(DB.usuarioActual), opciones: DB.usuarios.map(function (u) { return [u.nombre, u.nombre]; }).concat([['El propio cliente', 'El propio cliente']]) }]
      ],
      alGuardar: function (v) { cambiar('Documentación añadida.', function () { c.docsPresentados.push(Object.assign({ id: Datos.uid('dp') }, v)); }); }
    });
  }

  function formArchivo(c, a) {
    formulario({
      titulo: a ? 'Editar documento de la carpeta' : 'Añadir documento de la carpeta',
      intro: 'Indica dónde está guardado el archivo. Puedes poner la ruta completa o solo la parte dentro de la carpeta del cliente (por ejemplo: 2026/Modelos/303_3T.pdf).',
      campos: [
        { nombre: 'nombre', etiqueta: 'Nombre del documento', requerido: true, valor: a && a.nombre },
        [{ nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', valor: a ? a.tipo : 'Modelos', opciones: TIPOS_ARCHIVO.map(function (t) { return [t, t]; }) },
          { nombre: 'anio', etiqueta: 'Año', tipo: 'number', valor: a ? a.anio : hoy().slice(0, 4) }],
        { nombre: 'ruta', etiqueta: 'Ruta del archivo', requerido: true, valor: a && a.ruta, ejemplo: '2026/Modelos/303_3T_2026.pdf' }
      ],
      alGuardar: function (v) {
        cambiar('Documento guardado.', function () { if (a) Object.assign(a, v); else c.archivos.push(Object.assign({ id: Datos.uid('ar') }, v)); });
      }
    });
  }

  function formFactura(c, f) {
    formulario({
      titulo: f ? 'Editar factura' : 'Añadir factura',
      campos: [
        [{ nombre: 'numero', etiqueta: 'Número', requerido: true, valor: f && f.numero },
          { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'date', requerido: true, valor: f ? f.fecha : hoy() }],
        { nombre: 'tercero', etiqueta: 'Proveedor / cliente', requerido: true, valor: f && f.tercero },
        [{ nombre: 'importe', etiqueta: 'Importe (€)', tipo: 'number', paso: '0.01', requerido: true, valor: f ? f.importe : '' },
          { nombre: 'estado', etiqueta: 'Estado', tipo: 'select', valor: f ? f.estado : 'recibida', opciones: [['recibida', 'Recibida'], ['contabilizada', 'Contabilizada']] }]
      ],
      alGuardar: function (v) {
        v.importe = parseFloat(String(v.importe).replace(',', '.')) || 0;
        cambiar('Factura guardada.', function () { if (f) Object.assign(f, v); else c.facturas.push(Object.assign({ id: Datos.uid('f') }, v)); });
      }
    });
  }

  function formActividad(c) {
    formulario({
      titulo: 'Registrar actividad · ' + c.nombre,
      campos: [
        [{ nombre: 'fecha', etiqueta: 'Fecha', tipo: 'date', requerido: true, valor: hoy() },
          { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', valor: 'llamada', opciones: Object.keys(TIPOS_ACT).map(function (k) { return [k, TIPOS_ACT[k]]; }) }],
        { nombre: 'descripcion', etiqueta: 'Qué se ha hablado o hecho', tipo: 'textarea', requerido: true }
      ],
      alGuardar: function (v) {
        cambiar('Actividad registrada.', function () { c.actividad.push(Object.assign({ id: Datos.uid('ac'), usuarioId: DB.usuarioActual }, v)); });
      }
    });
  }

  function formTarea(t, clienteId) {
    const cid = t ? t.clienteId : (clienteId || '');
    formulario({
      titulo: t ? 'Editar tarea' : 'Nueva tarea',
      campos: [
        { nombre: 'titulo', etiqueta: 'Qué hay que hacer', requerido: true, valor: t && t.titulo, sugerencias: TAREAS_SUGERIDAS },
        { nombre: 'clienteId', etiqueta: 'Cliente', tipo: 'select', valor: cid, opciones: [['', '— Tarea general del despacho —']].concat(DB.clientes.map(function (c) { return [c.id, c.nombre]; })) },
        [{ nombre: 'fechaLimite', etiqueta: 'Fecha límite', tipo: 'date', requerido: true, valor: t ? t.fechaLimite : sumarDias(hoy(), 7) },
          { nombre: 'responsableId', etiqueta: 'Responsable', tipo: 'select', valor: t ? t.responsableId : ((cliente(cid) || {}).responsableId || DB.usuarioActual), opciones: opcionesUsuarios() }]
      ],
      alGuardar: function (v) {
        cambiar('Tarea guardada.', function () {
          if (t) Object.assign(t, v); else DB.tareas.push(Object.assign({ id: Datos.uid('t'), hecha: false }, v));
        });
      }
    });
  }

  function formUsuario(u) {
    formulario({
      titulo: u ? 'Cambiar nombre' : 'Añadir persona al equipo',
      campos: [{ nombre: 'nombre', etiqueta: 'Nombre y apellido', requerido: true, valor: u && u.nombre }],
      alGuardar: function (v) {
        cambiar('Equipo actualizado.', function () { if (u) u.nombre = v.nombre; else DB.usuarios.push({ id: Datos.uid('u'), nombre: v.nombre }); });
        pintarSelectorUsuario();
      }
    });
  }

  /* ---------- Copias de seguridad ---------- */
  function exportar() {
    const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'copia-crm-rd-asesores-' + hoy() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    mostrarAviso('Copia descargada. Guárdala en un lugar seguro.');
  }
  function importar(archivo) {
    const lector = new FileReader();
    lector.onload = function () {
      try {
        const datos = JSON.parse(lector.result);
        if (!datos || !Array.isArray(datos.clientes) || !Array.isArray(datos.usuarios)) throw new Error('formato');
        if (!confirm('Se sustituirán los datos actuales por los de la copia. ¿Continuar?')) return;
        normalizar(datos);
        cambiar('Copia recuperada.', function () { DB = datos; });
        pintarSelectorUsuario();
      } catch (e) { mostrarAviso('Ese archivo no es una copia válida del CRM.'); }
    };
    lector.readAsText(archivo);
  }

  function copiarTexto(texto) {
    const hecho = function () { mostrarAviso('Ruta copiada. Pégala en el Explorador de archivos.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(hecho, function () { prompt('Copia la ruta:', texto); });
    } else { prompt('Copia la ruta:', texto); }
  }

  /* ---------- Eventos ---------- */
  $app.addEventListener('click', function (e) {
    const el = e.target.closest('[data-accion]');
    if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
    const accion = el.dataset.accion;
    const c = el.dataset.c ? cliente(el.dataset.c) : null;
    const id = el.dataset.id;
    const buscar = function (lista) { return lista.find(function (x) { return x.id === id; }); };
    if (el.tagName === 'A') e.preventDefault();

    switch (accion) {
      case 'solo-mio': DB.ajustes.soloMio = el.dataset.valor === '1'; guardar(); render(); break;
      case 'hecho': marcarHecho(el.dataset.tipo, el.dataset.c, id); break;
      case 'nuevo-cliente': formCliente(null); break;
      case 'editar-cliente': formCliente(c); break;
      case 'borrar-cliente':
        if (confirm('¿Eliminar a «' + c.nombre + '» y todos sus datos?')) {
          cambiar('Cliente eliminado.', function () {
            DB.clientes = DB.clientes.filter(function (x) { return x.id !== c.id; });
            DB.tareas = DB.tareas.filter(function (t) { return t.clienteId !== c.id; });
          });
          location.hash = '#/clientes';
        }
        break;
      case 'nueva-actividad': formActividad(c); break;
      case 'borrar-actividad': cambiar('Actividad eliminada.', function () { c.actividad = c.actividad.filter(function (x) { return x.id !== id; }); }); break;
      case 'nuevo-modelo': formModelo(c); break;
      case 'borrar-modelo': {
        const m = c.modelos[Number(id)];
        if (m && confirm('¿Quitar el modelo ' + m.codigo + ' de este cliente?')) cambiar('Modelo quitado.', function () { c.modelos.splice(Number(id), 1); });
        break;
      }
      case 'editar-control':
        formulario({
          titulo: 'Controlar vencimientos desde',
          intro: 'Los vencimientos anteriores a esta fecha no se consideran pendientes (útil al dar de alta un cliente que ya estaba al día).',
          campos: [{ nombre: 'controlDesde', etiqueta: 'Fecha', tipo: 'date', requerido: true, valor: c.controlDesde }],
          alGuardar: function (v) { cambiar('Fecha de control cambiada.', function () { c.controlDesde = v.controlDesde; }); }
        });
        break;
      case 'nuevo-doc-pend': formDocPendiente(c, null); break;
      case 'editar-doc-pend': formDocPendiente(c, buscar(c.docsPendientes)); break;
      case 'borrar-doc-pend': cambiar('Documento eliminado.', function () { c.docsPendientes = c.docsPendientes.filter(function (x) { return x.id !== id; }); }); break;
      case 'presentar-doc': cambiar('Documentación marcada como presentada.', function () { presentarDoc(c, id); }); break;
      case 'nuevo-doc-pres': formDocPresentado(c); break;
      case 'borrar-doc-pres': {
        const d = buscar(c.docsPresentados);
        cambiar('Documento eliminado.', function () { if (d && d.claveModelo) desmarcarModelo(c, d.claveModelo); c.docsPresentados = c.docsPresentados.filter(function (x) { return x.id !== id; }); });
        break;
      }
      case 'nuevo-archivo': formArchivo(c, null); break;
      case 'editar-archivo': formArchivo(c, buscar(c.archivos)); break;
      case 'borrar-archivo': cambiar('Documento quitado de la lista (el archivo no se borra).', function () { c.archivos = c.archivos.filter(function (x) { return x.id !== id; }); }); break;
      case 'copiar-ruta': copiarTexto(el.dataset.ruta); break;
      case 'nueva-factura': formFactura(c, null); break;
      case 'editar-factura': formFactura(c, buscar(c.facturas)); break;
      case 'borrar-factura': if (confirm('¿Eliminar esta factura?')) cambiar('Factura eliminada.', function () { c.facturas = c.facturas.filter(function (x) { return x.id !== id; }); }); break;
      case 'nueva-tarea': formTarea(null, el.dataset.c); break;
      case 'editar-tarea': formTarea(buscar(DB.tareas)); break;
      case 'borrar-tarea': cambiar('Tarea eliminada.', function () { DB.tareas = DB.tareas.filter(function (x) { return x.id !== id; }); }); break;
      case 'cal-mes': {
        const n = Number(el.dataset.valor);
        if (n === 0) UI.calMes = hoy().slice(0, 7);
        else { const p = UI.calMes.split('-').map(Number); const d = new Date(p[0], p[1] - 1 + n, 1, 12); UI.calMes = Datos.iso(d).slice(0, 7); }
        render();
        break;
      }
      case 'nuevo-usuario': formUsuario(null); break;
      case 'editar-usuario': formUsuario(buscar(DB.usuarios)); break;
      case 'borrar-usuario': {
        const u = buscar(DB.usuarios);
        const n = DB.clientes.filter(function (x) { return x.responsableId === id; }).length;
        if (n) { mostrarAviso(u.nombre + ' es responsable de ' + n + ' clientes. Cámbialos de responsable antes de eliminarle.'); break; }
        if (DB.usuarios.length <= 1) { mostrarAviso('Tiene que haber al menos una persona en el equipo.'); break; }
        if (confirm('¿Eliminar a ' + u.nombre + ' del equipo?')) {
          cambiar('Persona eliminada.', function () {
            DB.usuarios = DB.usuarios.filter(function (x) { return x.id !== id; });
            if (DB.usuarioActual === id) DB.usuarioActual = DB.usuarios[0].id;
          });
          pintarSelectorUsuario();
        }
        break;
      }
      case 'guardar-ajustes':
        cambiar('Ajustes guardados.', function () {
          DB.ajustes.rutaClientes = document.getElementById('rutaClientes').value.trim();
          DB.ajustes.diasFacturaAntigua = Math.max(1, parseInt(document.getElementById('diasFactura').value, 10) || 30);
        });
        break;
      case 'exportar': exportar(); break;
      case 'restablecer':
        if (confirm('Se borrarán todos los cambios y volverán los 5 clientes de ejemplo. ¿Continuar?')) {
          cambiar('Datos de ejemplo restablecidos.', function () { DB = Datos.datosEjemplo(); });
          pintarSelectorUsuario();
        }
        break;
    }
  });

  $app.addEventListener('change', function (e) {
    const el = e.target;
    if (el.dataset.filtro) { UI[el.dataset.filtro] = el.value; pintarTablaClientes(); return; }
    if (el.dataset.filtroCal) { UI[el.dataset.filtroCal] = el.value; render(); return; }
    const accion = el.dataset.accion;
    if (!accion) return;
    const c = el.dataset.c ? cliente(el.dataset.c) : null;
    const id = el.dataset.id;
    switch (accion) {
      case 'hecho': marcarHecho(el.dataset.tipo, el.dataset.c, id); break;
      case 'alternar-modelo':
        if (el.checked) cambiar('Modelo marcado como presentado.', function () { presentarModelo(c, id); });
        else cambiar('Modelo marcado como no presentado.', function () { desmarcarModelo(c, id); });
        break;
      case 'estado-doc': {
        const d = c.docsPendientes.find(function (x) { return x.id === id; });
        cambiar('Estado cambiado a «' + ESTADOS_DOC[el.value] + '».', function () { d.estado = el.value; });
        break;
      }
      case 'ver-contabilizadas': UI.verContabilizadas = el.checked; render(); break;
      case 'importar': if (el.files[0]) importar(el.files[0]); el.value = ''; break;
      case 'leer-carpeta': {
        const archivos = Array.prototype.slice.call(el.files || []);
        if (!archivos.length) break;
        const primera = (archivos[0].webkitRelativePath || '').split('/')[0];
        let nuevos = 0;
        cambiar('Carpeta leída.', function () {
          if (primera && !c.carpeta) c.carpeta = primera;
          archivos.forEach(function (f) {
            const partes = (f.webkitRelativePath || f.name).split('/');
            if (partes.length > 1) partes.shift();
            const nombre = partes[partes.length - 1];
            if (/^(\.|~\$)|^thumbs\.db$|^desktop\.ini$/i.test(nombre)) return;
            const ruta = partes.join('/');
            if (c.archivos.some(function (a) { return a.ruta.replace(/\\/g, '/') === ruta; })) return;
            const cl = clasificarArchivo(ruta);
            c.archivos.push({ id: Datos.uid('ar'), nombre: nombre.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' '), tipo: cl.tipo, anio: cl.anio, ruta: ruta });
            nuevos++;
          });
        });
        mostrarAviso('Se han añadido ' + nuevos + ' documentos a la lista' + (primera && primera !== c.carpeta ? ' (ojo: la carpeta elegida, «' + primera + '», no coincide con la indicada en la ficha)' : '') + '.');
        break;
      }
    }
  });

  $app.addEventListener('input', function (e) {
    if (e.target.id === 'busqueda') { UI.busqueda = e.target.value; pintarTablaClientes(); }
  });

  /* ---------- Cabecera, logo y navegación ---------- */
  function pintarSelectorUsuario() {
    const sel = document.getElementById('usuario-actual');
    sel.innerHTML = DB.usuarios.map(function (u) { return '<option value="' + esc(u.id) + '"' + (u.id === DB.usuarioActual ? ' selected' : '') + '>' + esc(u.nombre) + '</option>'; }).join('');
  }
  document.getElementById('usuario-actual').addEventListener('change', function (e) {
    DB.usuarioActual = e.target.value; guardar(); render();
    mostrarAviso('Ahora estás usando el CRM como ' + nombreUsuario(DB.usuarioActual) + '.');
  });

  const logo = document.getElementById('logo-img');
  function logoAlternativo() { logo.hidden = true; document.getElementById('logo-alt').hidden = false; }
  logo.addEventListener('error', logoAlternativo);
  if (logo.complete && !logo.naturalWidth) logoAlternativo();

  function render() {
    const partes = location.hash.replace(/^#\/?/, '').split('/');
    const ruta = partes[0] || 'hoy';
    document.querySelectorAll('.menu a').forEach(function (a) {
      a.classList.toggle('activo', a.dataset.ruta === ruta || (ruta === 'cliente' && a.dataset.ruta === 'clientes'));
    });
    if (ruta === 'clientes') pantallaClientes();
    else if (ruta === 'cliente') pantallaFicha(decodeURIComponent(partes[1] || ''), partes[2]);
    else if (ruta === 'calendario') pantallaCalendario();
    else if (ruta === 'ajustes') pantallaAjustes();
    else pantallaHoy();
  }
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });

  pintarSelectorUsuario();
  render();
})();
