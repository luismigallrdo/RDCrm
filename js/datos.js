/*
 * Datos del CRM: guardado en el propio navegador y datos de ejemplo.
 * TODOS LOS CLIENTES DE EJEMPLO SON INVENTADOS.
 */
(function (global) {
  'use strict';

  const CLAVE = 'rdcrm-datos-v1';

  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function hoyISO() { return iso(new Date()); }
  function rel(dias) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + dias); return iso(d); }
  let contador = 0;
  function uid(prefijo) { contador++; return (prefijo || 'id') + '-' + Date.now().toString(36) + '-' + contador.toString(36) + Math.random().toString(36).slice(2, 6); }

  function modelos(lista) {
    return lista.map(function (m) { const p = m.split(':'); return { codigo: p[0], periodicidad: p[1] }; });
  }

  // Marca como presentados todos los vencimientos ya pasados desde la fecha de control,
  // salvo los modelos indicados en "excepto" (para que el ejemplo tenga algo vencido).
  function marcarPasados(cliente, excepto, quien) {
    const hoy = hoyISO();
    cliente.modelos.forEach(function (m) {
      if ((excepto || []).indexOf(m.codigo) >= 0) return;
      CalendarioFiscal.vencimientosEntre(m.codigo, m.periodicidad, cliente.controlDesde, rel(-1)).forEach(function (v) {
        if (v.fecha < hoy) {
          cliente.presentados[v.clave] = { fecha: v.fecha, por: quien };
          cliente.docsPresentados.push({ id: uid('dp'), nombre: 'Modelo ' + v.codigo + ' · ' + v.periodo, fecha: v.fecha, presentadoPor: quien, claveModelo: v.clave });
        }
      });
    });
  }

  function datosEjemplo() {
    const usuarios = [
      { id: 'u-ana', nombre: 'Ana Ruiz' },
      { id: 'u-carlos', nombre: 'Carlos Méndez' },
      { id: 'u-lucia', nombre: 'Lucía Torres' },
      { id: 'u-javier', nombre: 'Javier Romero' }
    ];

    const clientes = [
      {
        id: 'c-galeote',
        nombre: 'Obrador Hermanos Galeote, S.L.',
        nif: 'B00000001',
        tipo: 'sociedad',
        contacto: 'Manuel Galeote (gerente)',
        telefono: '600 000 001',
        email: 'administracion@obrador-ejemplo.es',
        direccion: 'Calle Ejemplo 12, 29001 Málaga',
        responsableId: 'u-ana',
        notas: 'Obrador y dos tiendas. Tienen local alquilado (por eso presentan el 115). Prefieren que les llamemos por la mañana.',
        carpeta: 'Obrador Hermanos Galeote SL',
        controlDesde: rel(-20),
        modelos: modelos(['303:trimestral', '111:trimestral', '115:trimestral', '202:fraccionado', '200:anual', '390:anual', '347:anual', '180:anual', '190:anual']),
        presentados: {},
        docsPresentados: [
          { id: uid('dp'), nombre: 'Escritura de constitución (copia simple)', fecha: rel(-400), presentadoPor: 'Ana Ruiz' },
          { id: uid('dp'), nombre: 'Cuentas anuales 2025 (depósito en el Registro Mercantil)', fecha: rel(-120), presentadoPor: 'Ana Ruiz' }
        ],
        docsPendientes: [
          { id: uid('pd'), nombre: 'Escritura de ampliación de capital (revisar antes de firmar)', fechaLimite: rel(25), estado: 'preparacion' },
          { id: uid('pd'), nombre: 'Contrato de renovación del alquiler del local', fechaLimite: rel(40), estado: 'recibir' }
        ],
        archivos: [
          { id: uid('ar'), nombre: 'Modelo 303 3T', tipo: 'Modelos', anio: '2026', ruta: '2026/Modelos/303_3T_2026.pdf' },
          { id: uid('ar'), nombre: 'Modelo 200 Impuesto Sociedades', tipo: 'Declaraciones', anio: '2025', ruta: '2025/Declaraciones/200_2025.pdf' },
          { id: uid('ar'), nombre: 'Escritura de constitución', tipo: 'Escrituras', anio: '2018', ruta: 'Escrituras/Constitucion_2018.pdf' },
          { id: uid('ar'), nombre: 'Contrato de alquiler del local', tipo: 'Contratos', anio: '2022', ruta: 'Contratos/Alquiler_local_2022.pdf' }
        ],
        facturas: [
          { id: uid('f'), numero: 'A-2026-118', fecha: rel(-45), tercero: 'Harinas del Sur (proveedor)', importe: 1840.50, estado: 'recibida' },
          { id: uid('f'), numero: 'F-0932', fecha: rel(-12), tercero: 'Envases Andalucía (proveedor)', importe: 312.80, estado: 'recibida' },
          { id: uid('f'), numero: '2026/341', fecha: rel(-6), tercero: 'Cafetería Centro (cliente)', importe: 655.00, estado: 'recibida' },
          { id: uid('f'), numero: 'A-2026-097', fecha: rel(-70), tercero: 'Harinas del Sur (proveedor)', importe: 1720.00, estado: 'contabilizada' }
        ],
        actividad: [
          { id: uid('ac'), fecha: rel(-3), tipo: 'llamada', descripcion: 'Manuel avisa de que la ampliación de capital se firmará el mes que viene.', usuarioId: 'u-ana' },
          { id: uid('ac'), fecha: rel(-15), tipo: 'correo', descripcion: 'Enviadas instrucciones para la entrega trimestral de facturas.', usuarioId: 'u-ana' }
        ]
      },
      {
        id: 'c-bermudez',
        nombre: 'Marta Bermúdez Ortega',
        nif: '00000002X',
        tipo: 'autonomo',
        contacto: 'Marta Bermúdez',
        telefono: '600 000 002',
        email: 'marta@estudio-ejemplo.es',
        direccion: 'Avenida Inventada 45, 3.º B, 29004 Málaga',
        responsableId: 'u-carlos',
        notas: 'Diseñadora gráfica. Factura a clientes de la UE de forma puntual.',
        carpeta: 'Bermudez Ortega Marta',
        controlDesde: rel(-30),
        modelos: modelos(['303:trimestral', '130:trimestral', '390:anual', '100:anual']),
        presentados: {},
        docsPresentados: [
          { id: uid('dp'), nombre: 'Declaración de la Renta 2025 (modelo 100)', fecha: rel(-150), presentadoPor: 'Carlos Méndez' }
        ],
        docsPendientes: [],
        archivos: [
          { id: uid('ar'), nombre: 'Modelo 130 3T', tipo: 'Modelos', anio: '2026', ruta: '2026/Modelos/130_3T_2026.pdf' },
          { id: uid('ar'), nombre: 'Renta 2025', tipo: 'Declaraciones', anio: '2025', ruta: '2025/Declaraciones/Renta_2025.pdf' },
          { id: uid('ar'), nombre: 'Alta en Hacienda (modelo 036)', tipo: 'Otros', anio: '2021', ruta: 'Otros/036_alta_2021.pdf' }
        ],
        facturas: [
          { id: uid('f'), numero: '2026-041', fecha: rel(-20), tercero: 'Agencia Creativa (cliente)', importe: 1210.00, estado: 'contabilizada' }
        ],
        actividad: [
          { id: uid('ac'), fecha: rel(-28), tipo: 'reunion', descripcion: 'Reunión para revisar la previsión del 4T y la Renta.', usuarioId: 'u-carlos' }
        ]
      },
      {
        id: 'c-litoral',
        nombre: 'Soluciones Digitales Litoral, S.A.',
        nif: 'A00000003',
        tipo: 'sociedad',
        contacto: 'Elena Prados (directora financiera)',
        telefono: '600 000 003',
        email: 'finanzas@litoral-ejemplo.es',
        direccion: 'Parque Empresarial Ficticio, nave 7, 29590 Málaga',
        responsableId: 'u-javier',
        notas: 'Gran empresa (inscrita en el SII): IVA y retenciones mensuales. Ventas a otros países de la UE.',
        carpeta: 'Soluciones Digitales Litoral SA',
        controlDesde: rel(-2),
        modelos: modelos(['303:mensual', '111:mensual', '115:mensual', '349:mensual', '202:fraccionado', '200:anual', '347:anual', '180:anual', '190:anual']),
        presentados: {},
        docsPresentados: [
          { id: uid('dp'), nombre: 'Escritura de nombramiento de administradores', fecha: rel(-200), presentadoPor: 'Javier Romero' }
        ],
        docsPendientes: [
          { id: uid('pd'), nombre: 'Alegaciones al requerimiento de la AEAT (IVA 2.º trimestre)', fechaLimite: rel(5), estado: 'preparacion' },
          { id: uid('pd'), nombre: 'Relación de facturas intracomunitarias de noviembre', fechaLimite: rel(14), estado: 'recibir' }
        ],
        archivos: [
          { id: uid('ar'), nombre: 'Requerimiento AEAT IVA 2T', tipo: 'Notificaciones', anio: '2026', ruta: '2026/Notificaciones/Requerimiento_IVA_2T.pdf' },
          { id: uid('ar'), nombre: 'Modelo 200 Impuesto Sociedades', tipo: 'Declaraciones', anio: '2025', ruta: '2025/Declaraciones/200_2025.pdf' },
          { id: uid('ar'), nombre: 'Contrato de prestación de servicios', tipo: 'Contratos', anio: '2024', ruta: 'Contratos/Contrato_servicios_2024.pdf' }
        ],
        facturas: [
          { id: uid('f'), numero: 'INV-77812', fecha: rel(-38), tercero: 'Cloud Services Europe (proveedor)', importe: 4250.00, estado: 'recibida' },
          { id: uid('f'), numero: 'FV-2026-1104', fecha: rel(-9), tercero: 'Hoteles Ejemplo (cliente)', importe: 12600.00, estado: 'recibida' },
          { id: uid('f'), numero: 'R-5521', fecha: rel(-4), tercero: 'Alquileres Polígono (proveedor)', importe: 2178.00, estado: 'recibida' }
        ],
        actividad: [
          { id: uid('ac'), fecha: rel(-10), tipo: 'gestion', descripcion: 'Recibido requerimiento de la AEAT sobre el IVA del 2.º trimestre. Plazo de 10 días hábiles.', usuarioId: 'u-javier' },
          { id: uid('ac'), fecha: rel(-8), tipo: 'correo', descripcion: 'Solicitadas a Elena las facturas que pide Hacienda.', usuarioId: 'u-javier' }
        ]
      },
      {
        id: 'c-ledesma',
        nombre: 'Antonio Ledesma Fuentes',
        nif: '00000004Y',
        tipo: 'particular',
        contacto: 'Antonio Ledesma',
        telefono: '600 000 004',
        email: 'antonio.ledesma@correo-ejemplo.es',
        direccion: 'Plaza Imaginaria 3, 29016 Málaga',
        responsableId: 'u-lucia',
        notas: 'Particular con varios inmuebles. Herencia en trámite de sus padres.',
        carpeta: 'Ledesma Fuentes Antonio',
        controlDesde: rel(-30),
        modelos: modelos(['100:anual', '714:anual']),
        presentados: {},
        docsPresentados: [
          { id: uid('dp'), nombre: 'Declaración de la Renta 2025 (modelo 100)', fecha: rel(-160), presentadoPor: 'Lucía Torres' },
          { id: uid('dp'), nombre: 'Impuesto sobre el Patrimonio 2025 (modelo 714)', fecha: rel(-160), presentadoPor: 'Lucía Torres' }
        ],
        docsPendientes: [
          { id: uid('pd'), nombre: 'Certificado de saldos y retenciones del banco', fechaLimite: rel(12), estado: 'recibir' },
          { id: uid('pd'), nombre: 'Autoliquidación del Impuesto de Sucesiones', fechaLimite: rel(48), estado: 'preparacion' }
        ],
        archivos: [
          { id: uid('ar'), nombre: 'Renta 2025', tipo: 'Declaraciones', anio: '2025', ruta: '2025/Declaraciones/Renta_2025.pdf' },
          { id: uid('ar'), nombre: 'Escritura de compraventa vivienda', tipo: 'Escrituras', anio: '2015', ruta: 'Escrituras/Compraventa_2015.pdf' }
        ],
        facturas: [],
        actividad: [
          { id: uid('ac'), fecha: rel(-5), tipo: 'reunion', descripcion: 'Reunión sobre la herencia. Pendiente de que traiga el certificado del banco.', usuarioId: 'u-lucia' }
        ]
      },
      {
        id: 'c-moreno',
        nombre: 'Rafael Moreno Díaz (Bar Los Toneles)',
        nif: '00000005Z',
        tipo: 'autonomo',
        contacto: 'Rafael Moreno',
        telefono: '600 000 005',
        email: 'bar.lostoneles@correo-ejemplo.es',
        direccion: 'Calle Supuesta 8, 29012 Málaga',
        responsableId: 'u-carlos',
        notas: 'Hostelería. Tiene dos empleados (modelo 111). Suele traer la documentación tarde: insistir.',
        carpeta: 'Moreno Diaz Rafael',
        controlDesde: rel(-60),
        modelos: modelos(['303:trimestral', '130:trimestral', '111:trimestral', '390:anual', '190:anual', '100:anual']),
        presentados: {},
        docsPresentados: [],
        docsPendientes: [
          { id: uid('pd'), nombre: 'Libro de facturas emitidas del trimestre', fechaLimite: rel(-3), estado: 'recibir' }
        ],
        archivos: [
          { id: uid('ar'), nombre: 'Modelo 303 3T', tipo: 'Modelos', anio: '2026', ruta: '2026/Modelos/303_3T_2026.pdf' },
          { id: uid('ar'), nombre: 'Contrato de trabajo camarero', tipo: 'Contratos', anio: '2025', ruta: 'Contratos/Contrato_camarero_2025.pdf' }
        ],
        facturas: [
          { id: uid('f'), numero: '1452', fecha: rel(-52), tercero: 'Distribuciones de Bebidas (proveedor)', importe: 980.40, estado: 'recibida' },
          { id: uid('f'), numero: 'FA-339', fecha: rel(-33), tercero: 'Pescados del Puerto (proveedor)', importe: 415.75, estado: 'recibida' },
          { id: uid('f'), numero: '1488', fecha: rel(-11), tercero: 'Distribuciones de Bebidas (proveedor)', importe: 1102.10, estado: 'recibida' }
        ],
        actividad: [
          { id: uid('ac'), fecha: rel(-2), tipo: 'llamada', descripcion: 'Llamado para reclamar el libro de facturas. Dice que lo trae esta semana.', usuarioId: 'u-carlos' }
        ]
      }
    ];

    // Lo ya pasado se da por presentado (excepto el 130 de Rafael, para ver un aviso de "vencido").
    clientes.forEach(function (c) {
      const usuario = usuarios.find(function (u) { return u.id === c.responsableId; });
      marcarPasados(c, c.id === 'c-moreno' ? ['130'] : [], usuario.nombre);
    });

    const tareas = [
      { id: uid('t'), clienteId: 'c-galeote', titulo: 'Preparar cierre contable del ejercicio', fechaLimite: rel(35), responsableId: 'u-ana', hecha: false },
      { id: uid('t'), clienteId: 'c-galeote', titulo: 'Revisar escritura de ampliación de capital', fechaLimite: rel(20), responsableId: 'u-ana', hecha: false },
      { id: uid('t'), clienteId: 'c-litoral', titulo: 'Responder a requerimiento de la AEAT (IVA 2T)', fechaLimite: rel(5), responsableId: 'u-javier', hecha: false },
      { id: uid('t'), clienteId: 'c-litoral', titulo: 'Revisar contrato de prestación de servicios con cliente alemán', fechaLimite: rel(10), responsableId: 'u-javier', hecha: false },
      { id: uid('t'), clienteId: 'c-ledesma', titulo: 'Revisar escrituras de la herencia', fechaLimite: rel(20), responsableId: 'u-lucia', hecha: false },
      { id: uid('t'), clienteId: 'c-moreno', titulo: 'Reclamar libro de facturas y tickets del trimestre', fechaLimite: rel(1), responsableId: 'u-carlos', hecha: false },
      { id: uid('t'), clienteId: 'c-bermudez', titulo: 'Enviar previsión de pago del 4T', fechaLimite: rel(-6), responsableId: 'u-carlos', hecha: true }
    ];

    return {
      version: 1,
      usuarios: usuarios,
      usuarioActual: 'u-ana',
      ajustes: {
        rutaClientes: '\\\\SERVIDOR\\CLIENTES',
        diasFacturaAntigua: 30,
        soloMio: false
      },
      clientes: clientes,
      tareas: tareas
    };
  }

  function cargar() {
    try {
      const texto = localStorage.getItem(CLAVE);
      if (texto) {
        const db = JSON.parse(texto);
        if (db && Array.isArray(db.clientes)) return db;
      }
    } catch (e) { /* sin acceso al almacenamiento: se usan datos de ejemplo */ }
    return datosEjemplo();
  }

  function guardar(db) {
    try { localStorage.setItem(CLAVE, JSON.stringify(db)); return true; } catch (e) { return false; }
  }

  global.Datos = { cargar: cargar, guardar: guardar, datosEjemplo: datosEjemplo, uid: uid, iso: iso, hoyISO: hoyISO, rel: rel };
})(window);
