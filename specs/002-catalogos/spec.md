# Especificación de funcionalidad: F-002 · Catálogos

**Rama de la funcionalidad**: `002-catalogos` (sin rama propia; se trabaja en `main`)

**Creada**: 2026-09-13

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Gestión de los catálogos que usan las compras, pedidos y
distribuciones: categorías de productos, unidades de medida, productos de limpieza, proveedores,
qué productos ofrece cada proveedor, centros de salud y representantes de los centros de salud.
Para cada catálogo el encargado puede registrar, modificar, listar con búsqueda, desactivar y
reactivar. Eliminar significa desactivar: el registro deja de aparecer para elegir en documentos
nuevos, pero se conserva en el histórico. El sistema impide duplicados: nombre de categoría,
nombre de unidad, código y nombre de producto, NIT de proveedor, nombre de centro de salud y CI de
representante. El producto muestra su stock actual, pero no se puede modificar desde aquí: solo
cambia con compras y distribuciones. Cada producto tiene un stock mínimo. Se opera con un único
centro de salud, al que pertenecen los representantes (responsables de un servicio o área).
Motivo: en 2022 los borrados rompían el histórico de compras y no había validación consistente de
duplicados."

**Referencias**: `docs/especificacion/02-modelo-de-dominio.md` §2.2 y reglas RN-10 a RN-17 ·
`docs/especificacion/03-funcionalidades.md` §F-002 · Capítulo II: requerimientos 2, 3, 5, 6, 9,
10 y 12; RF 2 · Decisiones D-11 y D-15 · Defectos corregidos X-11 y X-13.

## Escenarios de usuario y pruebas *(obligatorio)*

**Actor único:** Encargado de almacén, con sesión iniciada (F-001).

**Reglas comunes a los siete catálogos** (se aplican en todas las historias):

- **Baja lógica:** "desactivar" nunca borra; el registro se puede reactivar (RN-12, D-15).
- **Selectores:** los registros inactivos no aparecen para elegir en formularios de registros ni
  documentos nuevos, pero siguen visibles en listados, consultas, reportes e histórico, marcados
  como "Inactivo" (RN-14).
- **Duplicados:** los campos únicos se comparan quitando espacios al inicio y al final, reduciendo
  los espacios internos a uno y sin distinguir mayúsculas (RN-10). La comparación incluye los
  registros inactivos. El mensaje nombra el campo y el valor (RN-11).

### Historia 1 - Mantener categorías y unidades de medida (Prioridad: P1)

El encargado registra las categorías con que agrupa los productos (por ejemplo "Desinfectantes",
"Papel e higiene") y las unidades en que se miden (por ejemplo "Bidón 5 L", abreviatura "BID5").
Las corrige, las desactiva cuando ya no se usan y las reactiva si vuelven a usarse.

**Por qué esta prioridad**: un producto no se puede registrar sin categoría ni unidad; son la base
de todo el catálogo.

**Prueba independiente**: se registra, modifica, desactiva y reactiva una categoría y una unidad,
y se verifica el rechazo de duplicados y de bajas con productos activos.

**Escenarios de aceptación**:

1. **Dado** un nombre de categoría nuevo, **cuando** se registra con descripción opcional,
   **entonces** queda activa y disponible para elegir al registrar productos.
2. **Dada** la categoría "Desinfectantes", **cuando** se registra " desinfectantes ", **entonces**
   se rechaza con "Ya existe una categoría con el nombre 'Desinfectantes'".
3. **Dada** una categoría con 4 productos activos, **cuando** se intenta desactivarla, **entonces**
   se rechaza indicando "No se puede desactivar: 4 productos activos usan esta categoría" (RN-13).
4. **Dada** una categoría sin productos activos, **cuando** se desactiva, **entonces** deja de
   aparecer al elegir categoría en un producto, pero los productos que ya la tenían la siguen
   mostrando.
5. **Dada** una unidad de medida, **cuando** se registra con nombre y abreviatura, **entonces**
   queda activa; los mismos escenarios 2 a 4 se cumplen para unidades.

---

### Historia 2 - Mantener productos (Prioridad: P1)

El encargado registra cada producto de limpieza con código, nombre, descripción, categoría, unidad
de medida y stock mínimo. Ve su stock actual, pero no puede cambiarlo: solo lo mueven las compras
y las distribuciones.

**Por qué esta prioridad**: compras, pedidos, distribuciones, reportes y pronóstico giran en torno
al producto.

**Prueba independiente**: se registra un producto, se verifica que empieza con stock 0, que el
stock no se puede editar y que se rechazan los duplicados de código y de nombre.

**Escenarios de aceptación**:

1. **Dados** código, nombre, categoría activa, unidad activa y stock mínimo válidos, **cuando** se
   registra el producto, **entonces** queda activo con stock actual 0.
2. **Dado** el producto "Lavandina 1 L", **cuando** se registra " lavandina  1 l ", **entonces** se
   rechaza con "Ya existe un producto con el nombre 'Lavandina 1 L'" (RN-10, RN-11).
3. **Dado** el código `LIM-001`, **cuando** se registra otro producto con `lim-001`, **entonces** se
   rechaza con "Ya existe un producto con el código 'LIM-001'".
4. **Dado** un producto existente, **cuando** se abre su formulario para modificarlo, **entonces**
   el stock actual se muestra solo como información y no se puede editar (RN-15); si se intenta
   enviar un stock distinto por otro medio, se ignora.
5. **Dado** un stock mínimo negativo o con decimales, **cuando** se intenta guardar, **entonces** se
   rechaza indicando que debe ser un número entero mayor o igual a 0.
6. **Dado** un producto con movimientos de inventario, **cuando** se intenta cambiar su unidad de
   medida, **entonces** se rechaza indicando que la unidad no puede cambiar porque su stock e
   histórico están expresados en ella (RN-16).
7. **Dado** un producto activo, **cuando** se desactiva, **entonces** deja de aparecer para elegir
   en compras y pedidos nuevos, conserva su stock y sigue apareciendo en su kardex, existencias e
   histórico.
8. **Dado** un producto inactivo cuya categoría o unidad también está inactiva, **cuando** se
   intenta reactivarlo, **entonces** se rechaza indicando que primero se debe reactivar la
   categoría o unidad, o cambiarle una activa (RN-17).
9. **Dado** el listado de productos, **cuando** se consulta, **entonces** muestra código, nombre,
   categoría, unidad, stock actual, stock mínimo, estado y un indicador "Bajo mínimo" en los
   productos con stock actual menor o igual al mínimo (RN-52).

---

### Historia 3 - Mantener proveedores (Prioridad: P1)

El encargado registra a los proveedores con razón social, NIT y datos de contacto, para asociarlos
a las compras.

**Por qué esta prioridad**: una compra no se registra sin proveedor (F-003).

**Prueba independiente**: se registra, modifica, desactiva y reactiva un proveedor, y se verifica
que el inactivo desaparece del selector pero no del histórico.

**Escenarios de aceptación**:

1. **Dados** razón social y NIT válidos, **cuando** se registra el proveedor, **entonces** queda
   activo y disponible para elegir en compras nuevas.
2. **Dado** un NIT con letras, guiones o puntos, **cuando** se intenta guardar, **entonces** se
   rechaza indicando que el NIT solo admite dígitos.
3. **Dado** un proveedor con NIT `1020304050`, **cuando** se registra otro con el mismo NIT,
   **entonces** se rechaza con "Ya existe un proveedor con el NIT '1020304050'", aunque la razón
   social sea distinta.
4. **Dado** un correo sin formato válido (por ejemplo `ventas@`), **cuando** se intenta guardar,
   **entonces** se rechaza indicando el formato esperado.
5. **Dado** un proveedor inactivo, **cuando** se registra una compra nueva, **entonces** no aparece
   en el selector de proveedores, pero sus compras anteriores lo siguen mostrando.
6. **Dados** dos proveedores con la misma razón social y distinto NIT, **cuando** se registran,
   **entonces** ambos se aceptan.

---

### Historia 4 - Mantener el centro de salud y sus representantes (Prioridad: P1)

El encargado registra el centro de salud al que atiende el almacén y a sus representantes: las
personas responsables de un servicio o área (emergencias, internación, laboratorio…) que solicitan
productos.

**Por qué esta prioridad**: un pedido se registra a nombre de un representante (F-004); sin él no
hay pedidos ni distribuciones.

**Prueba independiente**: se registra el centro de salud y dos representantes, se verifica el
rechazo de un CI duplicado y de la baja del centro con representantes activos.

**Escenarios de aceptación**:

1. **Dados** nombre, teléfono y dirección, **cuando** se registra el centro de salud, **entonces**
   queda activo.
2. **Dados** nombre, apellido, CI, servicio y centro de salud activo, **cuando** se registra un
   representante, **entonces** queda activo y disponible para elegir en pedidos nuevos.
3. **Dado** un único centro de salud activo, **cuando** se registra un representante, **entonces**
   ese centro aparece ya seleccionado.
4. **Dado** un representante con CI `4567890`, **cuando** se registra otro con el mismo CI,
   **entonces** se rechaza con "Ya existe un representante con el CI '4567890'".
5. **Dado** un centro de salud con representantes activos, **cuando** se intenta desactivarlo,
   **entonces** se rechaza indicando cuántos representantes activos tiene (RN-13).
6. **Dado** un representante inactivo, **cuando** se registra un pedido nuevo, **entonces** no
   aparece en el selector, pero sus pedidos anteriores lo siguen mostrando.
7. **Dado** un representante inactivo cuyo centro de salud está inactivo, **cuando** se intenta
   reactivarlo, **entonces** se rechaza indicando que primero se debe reactivar el centro (RN-17).

---

### Historia 5 - Buscar y filtrar en los listados (Prioridad: P2)

En cada catálogo, el encargado busca por nombre o código y filtra por estado, para encontrar rápido
un registro entre muchos.

**Por qué esta prioridad**: con pocos registros se puede operar sin búsqueda; con el catálogo
simulado (unos 25 productos) ya se vuelve necesaria.

**Prueba independiente**: con registros activos e inactivos cargados, se busca un texto parcial y
se alterna el filtro de estado.

**Escenarios de aceptación**:

1. **Dado** el listado de productos, **cuando** se escribe "lava", **entonces** aparecen los
   productos cuyo código o nombre contiene ese texto, sin distinguir mayúsculas ni tildes.
2. **Dado** cualquier listado, **cuando** se abre, **entonces** muestra por defecto solo los
   activos, ordenados por nombre; el filtro permite ver inactivos o todos.
3. **Dada** una búsqueda sin coincidencias, **cuando** se aplica, **entonces** se muestra "No hay
   resultados para 'texto'" y la opción de limpiar la búsqueda.
4. **Dado** el listado de productos, **cuando** se filtra por categoría, **entonces** solo aparecen
   los productos de esa categoría.

---

### Historia 6 - Indicar qué productos ofrece cada proveedor (Prioridad: P3)

Desde la ficha de un proveedor, el encargado indica qué productos ofrece y, si lo conoce, un precio
referencial.

**Por qué esta prioridad**: es información de apoyo; las compras funcionan sin ella (00 §5, P3).

**Prueba independiente**: se asocian productos a un proveedor, se verifica que no se repite el
par y que la asociación se puede desactivar.

**Escenarios de aceptación**:

1. **Dado** un proveedor activo, **cuando** se le asocia un producto activo con precio referencial
   de 12,50, **entonces** la ficha del proveedor lo muestra con ese precio.
2. **Dado** un producto ya asociado a un proveedor, **cuando** se intenta asociarlo otra vez,
   **entonces** se rechaza indicando que ese proveedor ya ofrece ese producto.
3. **Dado** un precio referencial de 0 o negativo, **cuando** se intenta guardar, **entonces** se
   rechaza; si se deja vacío, se acepta sin precio.
4. **Dada** una asociación activa, **cuando** se desactiva, **entonces** deja de mostrarse en la
   ficha del proveedor (salvo al filtrar inactivas) y se puede reactivar.
5. **Dada** la ficha de un producto, **cuando** se consulta, **entonces** muestra los proveedores
   activos que lo ofrecen, con su precio referencial.

---

### Casos borde

- **Duplicado de un registro inactivo:** si el valor repetido pertenece a un registro inactivo, el
  mensaje lo indica y ofrece reactivarlo ("Ya existe un proveedor inactivo con el NIT
  '1020304050'. ¿Deseas reactivarlo?").
- **Modificación a un valor duplicado:** cambiar el nombre, código, NIT o CI de un registro a un
  valor que ya usa otro se rechaza igual que al registrar; guardar sin cambiar el propio valor no
  se considera duplicado.
- **Espacios y mayúsculas al guardar:** se guardan sin espacios en los extremos y con espacios
  internos simples, respetando las mayúsculas escritas. El código de producto se guarda en
  mayúsculas.
- **NIT y CI con espacios:** se quitan los espacios de los extremos antes de validar; los espacios
  internos hacen fallar la validación de formato.
- **Categoría o unidad inactiva en un producto activo:** no puede ocurrir, porque RN-13 impide
  desactivarlas mientras tengan productos activos.
- **Producto con stock desactivado:** se permite; el formulario avisa cuántas unidades tiene en
  stock antes de confirmar. Los pedidos ya registrados con ese producto se pueden seguir atendiendo
  (F-005).
- **Proveedor desactivado con asociaciones de productos:** las asociaciones se conservan y dejan de
  mostrarse en la ficha del producto mientras el proveedor esté inactivo.
- **Último centro de salud:** no se puede desactivar mientras tenga representantes activos; si no
  los tiene, se permite, y el formulario de representante avisa que no hay centros activos.
- **Registro modificado por otra sesión:** si dos sesiones guardan el mismo registro, prevalece el
  último guardado; las reglas de unicidad se verifican siempre al guardar.
- **Textos que exceden el largo:** se rechazan indicando el máximo de caracteres del campo.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Comunes**

- **FR-001**: El sistema DEBE permitir registrar, modificar, listar, desactivar y reactivar
  categorías, unidades de medida, productos, proveedores, centros de salud, representantes y
  asociaciones proveedor–producto.
- **FR-002**: El sistema NO DEBE ofrecer ninguna forma de borrar definitivamente un registro de
  catálogo; desactivar marca el registro como inactivo y reactivar lo vuelve a activar (RN-12).
- **FR-003**: El sistema DEBE excluir los registros inactivos de todos los selectores usados para
  crear o modificar registros y documentos, y DEBE seguir mostrándolos, marcados como inactivos, en
  listados, consultas, reportes e histórico (RN-14).
- **FR-004**: El sistema DEBE verificar la unicidad de nombre de categoría, nombre de unidad de
  medida, código de producto, nombre de producto, NIT de proveedor, nombre de centro de salud, CI de
  representante y par proveedor–producto, comparando valores normalizados (RN-10) e incluyendo los
  registros inactivos.
- **FR-005**: El sistema DEBE informar cada duplicado nombrando el catálogo, el campo y el valor
  existente (RN-11), y avisar si el registro existente está inactivo.
- **FR-006**: El sistema DEBE guardar los textos sin espacios en los extremos y con espacios
  internos simples, y rechazar los que superen el largo máximo del campo indicando ese máximo.
- **FR-007**: El sistema DEBE ofrecer en cada listado búsqueda por texto parcial (sin distinguir
  mayúsculas ni tildes) sobre los campos de identificación del catálogo y filtro de estado: activos
  (por defecto), inactivos o todos; ordenado por nombre.
- **FR-008**: Todos los mensajes de validación y error DEBEN estar en español e indicar qué está mal
  y cómo corregirlo.

**Categorías y unidades de medida**

- **FR-009**: Una categoría DEBE tener nombre (obligatorio, único, hasta 60 caracteres) y
  descripción (opcional, hasta 200).
- **FR-010**: Una unidad de medida DEBE tener nombre (obligatorio, único, hasta 40 caracteres) y
  abreviatura (obligatoria, hasta 10).
- **FR-011**: El sistema DEBE impedir desactivar una categoría o una unidad de medida con productos
  activos asociados, indicando cuántos son (RN-13).

**Productos**

- **FR-012**: Un producto DEBE tener código (obligatorio, único, hasta 20 caracteres, solo letras,
  dígitos y guion, guardado en mayúsculas), nombre (obligatorio, único, hasta 80), descripción
  (opcional, hasta 200), categoría activa, unidad de medida activa y stock mínimo (obligatorio,
  entero mayor o igual a 0).
- **FR-013**: Todo producto nuevo DEBE empezar con stock actual 0.
- **FR-014**: El sistema DEBE mostrar el stock actual del producto y NO DEBE permitir modificarlo
  desde el catálogo por ningún medio; solo lo cambian las compras, las distribuciones y sus
  anulaciones (RN-15; constitución, principio III).
- **FR-015**: El sistema DEBE impedir cambiar la unidad de medida de un producto que ya tiene
  movimientos de inventario (RN-16).
- **FR-016**: El sistema DEBE permitir desactivar un producto aunque tenga stock, avisando antes
  cuántas unidades tiene.
- **FR-017**: El listado de productos DEBE mostrar código, nombre, categoría, unidad, stock actual,
  stock mínimo, estado e indicador "Bajo mínimo" cuando stock actual ≤ stock mínimo (RN-52), y
  permitir filtrar por categoría.

**Proveedores**

- **FR-018**: Un proveedor DEBE tener razón social (obligatoria, hasta 100 caracteres), NIT
  (obligatorio, único, hasta 20, solo dígitos), nombre de contacto (opcional, hasta 80), teléfono
  (opcional, hasta 20; dígitos, espacios, `+` y `-`), correo (opcional, hasta 100, con formato de
  correo) y dirección (opcional, hasta 150).
- **FR-019**: El sistema DEBE permitir que dos proveedores compartan la razón social si sus NIT son
  distintos.

**Centros de salud y representantes**

- **FR-020**: Un centro de salud DEBE tener nombre (obligatorio, único, hasta 100 caracteres),
  teléfono (opcional, hasta 20) y dirección (opcional, hasta 150).
- **FR-021**: Un representante DEBE tener nombre (obligatorio, hasta 60), apellido (obligatorio,
  hasta 60), CI (obligatorio, único, hasta 15; dígitos, con complemento opcional de letras y
  dígitos separado por guion, por ejemplo `4567890-1B`), servicio o área (obligatorio, hasta 60),
  teléfono (opcional, hasta 20) y centro de salud activo.
- **FR-022**: El sistema DEBE preseleccionar el centro de salud cuando hay uno solo activo.
- **FR-023**: El sistema DEBE impedir desactivar un centro de salud con representantes activos,
  indicando cuántos son (RN-13).

**Reactivación**

- **FR-024**: El sistema DEBE impedir reactivar un producto cuya categoría o unidad está inactiva,
  y un representante cuyo centro de salud está inactivo, indicando qué registro reactivar primero
  (RN-17).

**Proveedor–producto (P3)**

- **FR-025**: El sistema DEBE permitir asociar, desde la ficha de un proveedor activo, productos
  activos con precio referencial opcional (mayor que 0, con 2 decimales), sin repetir el par.
- **FR-026**: La ficha de un producto DEBE mostrar los proveedores activos que lo ofrecen, con su
  precio referencial.

### Entidades clave

- **Categoría**: agrupación de productos. Nombre único y descripción. Activa o inactiva.
- **Unidad de medida**: presentación en que se cuenta un producto (unidad, bidón, caja…). Nombre
  único y abreviatura. Activa o inactiva.
- **Producto**: artículo de limpieza del almacén. Código y nombre únicos, descripción, una
  categoría, una unidad de medida, stock actual (solo lectura en el catálogo) y stock mínimo.
  Activo o inactivo.
- **Proveedor**: empresa que vende productos. Razón social, NIT único y datos de contacto. Activo o
  inactivo.
- **Proveedor–producto**: indica que un proveedor ofrece un producto, con precio referencial
  opcional. Par único. Activa o inactiva.
- **Centro de salud**: establecimiento atendido por el almacén. Nombre único, teléfono y dirección.
  En operación hay uno solo (D-11). Activo o inactivo.
- **Representante**: persona responsable de un servicio o área del centro de salud que solicita
  productos. Nombre, apellido, CI único, servicio, teléfono y centro de salud. Activo o inactivo.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El encargado registra un producto nuevo, con todos sus datos, en menos de 1 minuto.
- **SC-002**: El 100 % de los intentos de registrar o modificar con un valor único repetido (en
  cualquiera de los 8 campos o pares únicos, con variaciones de mayúsculas o espacios) se rechaza
  con un mensaje que nombra el campo y el valor.
- **SC-003**: El 0 % de los registros de catálogo se pierde por una baja: todo registro desactivado
  se puede encontrar filtrando inactivos y reactivar.
- **SC-004**: Ningún registro inactivo aparece en los selectores de documentos nuevos, y el 100 %
  de los documentos anteriores sigue mostrando los registros que usaban.
- **SC-005**: En ningún caso el stock actual de un producto cambia por una acción realizada desde el
  catálogo.
- **SC-006**: Con el catálogo de demostración cargado (unos 25 productos), el encargado encuentra
  cualquier registro con la búsqueda en menos de 10 segundos.
- **SC-007**: Una persona que no participó en el desarrollo puede explicar, leyendo esta
  especificación, por qué no se borran registros y cuándo se rechaza una baja.

## Supuestos

- **Actor:** un solo rol con acceso total (D-10); todas las acciones exigen sesión (F-001).
- **Varios centros de salud:** el catálogo permite registrar más de un centro, pero la operación,
  las pruebas y la simulación usan uno solo (D-11); no se agrega lógica específica para varios.
- **Código de producto:** lo escribe el encargado; el sistema no lo genera.
- **Unicidad con inactivos:** un valor único queda reservado aunque el registro esté inactivo,
  para que el histórico no muestre dos registros distintos con el mismo identificador.
- **Edición de identificadores:** código, nombre, NIT y CI se pueden modificar respetando la
  unicidad; los documentos anteriores muestran el valor vigente.
- **Abreviatura de unidad:** no es única.
- **Volumen:** decenas de registros por catálogo (S-05); no se requiere carga masiva.
- **Carga inicial:** los catálogos empiezan vacíos; el generador de datos simulados de F-007 los
  completa para la demostración.
- **Fuera de alcance:** importación masiva, imágenes de productos, lotes y vencimientos, historial
  de precios, varios almacenes.
- **Dependencias:** requiere F-001 (sesión). F-003, F-004, F-005, F-006 y F-007 dependen de estos
  catálogos. Los escenarios que mencionan compras, pedidos o movimientos se verifican por completo
  cuando esas funcionalidades existan.
