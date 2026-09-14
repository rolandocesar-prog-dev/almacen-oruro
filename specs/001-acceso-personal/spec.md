# Especificación de funcionalidad: F-001 · Acceso y personal

**Rama de la funcionalidad**: `001-acceso-personal` (sin rama propia; se trabaja en la rama actual)

**Creada**: 2026-09-13

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Acceso al sistema y gestión del personal. El sistema lo usa
un único tipo de usuario, el Encargado de almacén, que tiene acceso a todas las funciones. El
personal que opera el sistema es a la vez el usuario: al registrar a una persona se guardan sus
datos personales (nombre, apellido, cargo, dirección, teléfono), su nombre de usuario y su
contraseña. Solo el personal activo puede ingresar, con usuario y contraseña; toda sesión queda
registrada con su hora de inicio y de fin. El encargado puede registrar, modificar, desactivar y
reactivar personal, y restablecer la contraseña de otra persona. Motivo: en el sistema de 2022 las
contraseñas se guardaban en texto plano y el personal se borraba físicamente; ahora las
contraseñas se protegen y nada se borra."

**Referencias**: `docs/especificacion/02-modelo-de-dominio.md` §2.1 y reglas RN-01 a RN-06 ·
`docs/especificacion/03-funcionalidades.md` §F-001 · Capítulo II: requerimientos 1, 11 y 13;
RF 1 y RF 7 · Decisiones D-10 y D-15 · Defecto corregido X-04.

## Clarifications

### Session 2026-09-13

- Q: ¿Se registran también los intentos de ingreso fallidos, o solo los ingresos exitosos? → A: Solo
  los ingresos exitosos (sesiones); los intentos fallidos no se registran.
- Q: Al restablecer la contraseña de otra persona, ¿quién define la contraseña temporal? → A: La
  escribe el encargado (mínimo 8 caracteres) y se la comunica en persona; el sistema no la genera.
- Q: Si una persona ya tiene una sesión abierta e ingresa desde otra computadora o pestaña, ¿se
  permiten las dos sesiones a la vez? → A: Sí; se permiten varias sesiones simultáneas, y cada una
  expira y se cierra por separado.
- Q: ¿Las 8 horas de expiración se cuentan desde el ingreso o desde la última acción? → A: Desde el
  ingreso, sin importar la actividad; no hay cierre por inactividad.
- Q: Tras un restablecimiento, ¿la persona debe cambiar obligatoriamente la contraseña en su
  siguiente ingreso? → A: Sí; no puede usar ninguna otra función hasta definir una contraseña nueva
  (igual que el usuario inicial).

## Escenarios de usuario y pruebas *(obligatorio)*

**Actor único:** Encargado de almacén (D-10). Todo usuario activo tiene acceso a todas las
funciones; el cargo es informativo y no otorga permisos.

### Historia 1 - Ingresar al sistema (Prioridad: P1)

El encargado abre el sistema, escribe su nombre de usuario y su contraseña y entra a la pantalla
de inicio. Si los datos no son correctos, o si su cuenta está desactivada, no entra y ve un
mensaje genérico que no revela qué falló. Ninguna página del sistema, salvo la de inicio de
sesión, se puede ver sin haber ingresado.

**Por qué esta prioridad**: sin ingreso no se puede usar ninguna otra funcionalidad, y proteger
el acceso es la corrección principal frente al sistema de 2022 (X-04).

**Prueba independiente**: con el usuario inicial que crea la carga de datos inicial, se ingresa
con credenciales correctas e incorrectas y se intenta abrir una página interna sin sesión.

**Escenarios de aceptación**:

1. **Dado** un usuario activo, **cuando** ingresa su nombre de usuario y su contraseña correctos,
   **entonces** accede a la pantalla de inicio y queda registrada una sesión con su hora de inicio.
2. **Dado** un usuario activo, **cuando** escribe su nombre de usuario con otras mayúsculas
   (por ejemplo `JPerez` en lugar de `jperez`) y la contraseña correcta, **entonces** accede
   igual.
3. **Dada** una contraseña incorrecta, **cuando** intenta ingresar, **entonces** se le niega el
   acceso con el mensaje "Usuario o contraseña incorrectos", sin indicar cuál de los dos falló.
4. **Dado** un nombre de usuario que no existe, **cuando** intenta ingresar, **entonces** ve el
   mismo mensaje "Usuario o contraseña incorrectos".
5. **Dado** un usuario **inactivo** con credenciales correctas, **cuando** intenta ingresar,
   **entonces** se le niega el acceso con el mismo mensaje genérico (RN-01).
6. **Dada** una persona sin sesión, **cuando** intenta abrir cualquier página o ejecutar cualquier
   acción del sistema, **entonces** es redirigida al inicio de sesión.
7. **Dado** un usuario que ya inició sesión, **cuando** abre la página de inicio de sesión,
   **entonces** es llevado a la pantalla de inicio.

---

### Historia 2 - Cerrar sesión y expiración (Prioridad: P1)

El encargado cierra su sesión al terminar para que nadie use su cuenta en la computadora del
almacén. Si la olvida abierta, la sesión deja de valer a las 8 horas de haberse iniciado.

**Por qué esta prioridad**: la computadora del almacén es compartida; sin cierre ni expiración,
cualquiera podría operar con la cuenta de otro.

**Prueba independiente**: se ingresa, se cierra sesión y se verifica que las páginas internas ya
no son accesibles y que la sesión figura con hora de fin.

**Escenarios de aceptación**:

1. **Dado** un usuario con sesión iniciada, **cuando** elige "Cerrar sesión", **entonces** vuelve
   al inicio de sesión, la sesión queda registrada con su hora de fin y las páginas internas ya no
   son accesibles sin volver a ingresar.
2. **Dada** una sesión iniciada hace más de 8 horas, **cuando** el usuario intenta cualquier
   acción, **entonces** es redirigido al inicio de sesión con el aviso "Tu sesión expiró. Ingresa
   nuevamente" y la sesión queda cerrada en la bitácora (RN-03).
3. **Dada** una sesión que nunca se cerró (por ejemplo, se apagó la computadora), **cuando** se
   consulta la bitácora después de las 8 horas, **entonces** figura como cerrada por expiración,
   con hora de fin igual a la hora de inicio más 8 horas.

---

### Historia 3 - Registrar personal (Prioridad: P1)

El encargado registra a una persona que va a operar el sistema con sus datos personales, su
nombre de usuario y una contraseña inicial. Desde ese momento la persona puede ingresar.

**Por qué esta prioridad**: el sistema parte con un solo usuario inicial; sin registro no hay
forma de dar acceso a más personal.

**Prueba independiente**: se registra una persona nueva y se verifica que puede ingresar con el
usuario y la contraseña indicados, y que no se aceptan duplicados ni datos inválidos.

**Escenarios de aceptación**:

1. **Dados** nombre, apellido, cargo, nombre de usuario válido y contraseña de al menos 8
   caracteres, **cuando** se registra la persona, **entonces** queda activa y puede ingresar con
   esas credenciales.
2. **Dado** un usuario existente `jperez`, **cuando** se registra otra persona con el nombre de
   usuario `JPerez` o ` jperez `, **entonces** no se guarda y se indica "Ya existe un usuario con
   el nombre de usuario 'jperez'" (RN-10, RN-11).
3. **Dada** una contraseña de menos de 8 caracteres, **cuando** se intenta registrar, **entonces**
   no se guarda y se indica que la contraseña debe tener al menos 8 caracteres (RN-02).
4. **Dado** un nombre de usuario con caracteres no permitidos (por ejemplo `juan perez` o
   `juan-pérez`), **cuando** se intenta registrar, **entonces** no se guarda y se indica que solo
   se admiten letras minúsculas sin tildes, dígitos, punto y guion bajo.
5. **Dado** un teléfono con letras, **cuando** se intenta registrar, **entonces** no se guarda y se
   indica que solo se admiten dígitos, espacios, `+` y `-`.
6. **Dada** una persona ya registrada, **cuando** se consulta su ficha o el listado, **entonces**
   la contraseña no se muestra en ningún lugar, ni siquiera de forma parcial.

---

### Historia 4 - Modificar, desactivar y reactivar personal (Prioridad: P1)

El encargado corrige los datos de una persona, la desactiva cuando deja de operar el sistema y la
reactiva si vuelve. Nada se borra: la persona desactivada sigue apareciendo en el histórico de los
documentos que registró.

**Por qué esta prioridad**: mantener el acceso al día es parte del control básico; en 2022 el
personal se borraba físicamente y se perdía el rastro (D-15, X-11).

**Prueba independiente**: se modifica una persona, se la desactiva, se comprueba que no puede
ingresar, se la reactiva y se comprueba que vuelve a ingresar.

**Escenarios de aceptación**:

1. **Dada** una persona registrada, **cuando** se modifican su nombre, apellido, cargo, dirección,
   teléfono o nombre de usuario con datos válidos, **entonces** los cambios se guardan; si el
   nombre de usuario cambia, en adelante ingresa con el nuevo.
2. **Dada** una persona activa distinta del usuario que opera, **cuando** se la desactiva,
   **entonces** ya no puede ingresar y, si tenía una sesión abierta, su siguiente acción la
   redirige al inicio de sesión y la sesión queda cerrada en la bitácora.
3. **Dado** el usuario que tiene la sesión abierta, **cuando** intenta desactivarse a sí mismo,
   **entonces** se rechaza con el mensaje "No puedes desactivar tu propio usuario" (RN-04).
4. **Dada** una persona inactiva, **cuando** se la reactiva, **entonces** puede volver a ingresar
   con su contraseña anterior.
5. **Dado** el listado de personal, **cuando** se busca por nombre, apellido o nombre de usuario y
   se filtra por activos, inactivos o todos, **entonces** se muestran solo las coincidencias; por
   defecto se muestran los activos.
6. **Dada** una persona desactivada, **cuando** se consulta el sistema, **entonces** no existe
   ninguna opción que la borre de forma definitiva.

---

### Historia 5 - Cambiar la propia contraseña y restablecer la de otro (Prioridad: P2)

El encargado cambia su propia contraseña indicando la actual. Si otra persona olvidó la suya, el
encargado le asigna una contraseña temporal, que esa persona debe cambiar al ingresar.

**Por qué esta prioridad**: no hay recuperación por correo (fuera de alcance), así que el
restablecimiento entre usuarios es la única salida ante un olvido; además la contraseña del
usuario inicial debe cambiarse en el primer uso (RN-05). Es P2 porque el sistema funciona sin
ella mientras nadie olvide su contraseña.

**Prueba independiente**: se cambia la propia contraseña y se ingresa con la nueva; se restablece
la de otra persona y se verifica que al ingresar se le exige cambiarla.

**Escenarios de aceptación**:

1. **Dado** un usuario con sesión, **cuando** indica su contraseña actual correcta y una nueva
   válida, confirmada dos veces, **entonces** la contraseña cambia y en adelante solo sirve la
   nueva.
2. **Dada** una contraseña actual incorrecta, **cuando** intenta cambiarla, **entonces** se rechaza
   con "La contraseña actual no es correcta" y no cambia nada.
3. **Dada** una nueva contraseña igual a la actual, **cuando** intenta cambiarla, **entonces** se
   rechaza indicando que debe ser distinta.
4. **Dada** otra persona registrada, **cuando** el encargado le restablece la contraseña con una
   temporal válida, **entonces** la contraseña anterior deja de servir, se cierran las sesiones
   abiertas de esa persona y, en su siguiente ingreso, debe definir una contraseña nueva antes de
   usar cualquier otra función.
5. **Dado** el usuario inicial creado por la carga de datos inicial, **cuando** ingresa por
   primera vez, **entonces** debe definir una contraseña nueva antes de usar cualquier otra
   función (RN-05).
6. **Dado** el usuario que opera, **cuando** busca restablecer su propia contraseña desde el
   listado de personal, **entonces** esa opción no está disponible y se le indica usar "Cambiar mi
   contraseña".

---

### Historia 6 - Consultar el historial de sesiones (Prioridad: P3)

El encargado revisa quién ingresó al sistema y cuándo.

**Por qué esta prioridad**: cubre el RF 7 (bitácora), pero la operación diaria no depende de
consultarla; el registro de sesiones sí es obligatorio desde la Historia 1.

**Prueba independiente**: con varias sesiones registradas, se filtra por persona y por fechas y se
comparan los resultados con los ingresos realizados.

**Escenarios de aceptación**:

1. **Dadas** varias sesiones registradas, **cuando** se abre el historial, **entonces** se muestran
   de la más reciente a la más antigua, con persona, nombre de usuario, hora de inicio, hora de
   fin y cómo terminó: "Cerrada por el usuario", "Expirada", "Cerrada por desactivación o
   restablecimiento" o "Abierta".
2. **Dado** el historial, **cuando** se filtra por persona y por rango de fechas de inicio,
   **entonces** solo aparecen las sesiones que cumplen ambos filtros; por defecto el rango es el
   mes en curso.

---

### Casos borde

- **Único usuario activo:** como nadie puede desactivarse a sí mismo, siempre queda al menos un
  usuario activo (RN-04); el sistema no permite llegar a cero usuarios activos por ningún camino.
- **Espacios en el nombre de usuario:** los espacios al inicio y al final se quitan y las
  mayúsculas se convierten a minúsculas antes de validar y guardar; si quedan espacios internos,
  se rechaza.
- **Espacios en la contraseña:** la contraseña se guarda tal como se escribe, sin recortar
  espacios, y distingue mayúsculas de minúsculas.
- **Cambio de nombre de usuario a uno existente:** se rechaza con el mismo mensaje de duplicado
  que en el registro.
- **Desactivación mientras la persona trabaja:** su siguiente acción la saca del sistema; lo que
  ya había guardado se conserva.
- **Dos pestañas o computadoras:** una misma persona puede tener más de una sesión abierta; cada
  una se registra y expira por separado, y cerrar una no cierra las otras.
- **Cambio obligatorio pendiente:** quien debe cambiar su contraseña solo puede cambiarla o cerrar
  sesión; si cierra sin cambiarla, se le vuelve a exigir en el siguiente ingreso.
- **Formulario enviado sin sesión válida** (por ejemplo, tras expirar): no se guarda nada y se
  redirige al inicio de sesión.
- **Mensajes del ingreso:** la respuesta ante usuario inexistente, contraseña incorrecta y usuario
  inactivo es idéntica, para no revelar qué cuentas existen.
- **Contraseña en registros de actividad:** ninguna contraseña, ni actual, ni nueva, ni temporal,
  aparece en mensajes, pantallas o registros de actividad del sistema.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Ingreso y sesión**

- **FR-001**: El sistema DEBE permitir ingresar solo a personal **activo** que indique un nombre de
  usuario y una contraseña correctos (RN-01).
- **FR-002**: El sistema DEBE comparar el nombre de usuario sin distinguir mayúsculas ni espacios
  al inicio y al final, y la contraseña de forma exacta.
- **FR-003**: El sistema DEBE responder con el mismo mensaje, "Usuario o contraseña incorrectos",
  cuando el usuario no existe, la contraseña es incorrecta o el usuario está inactivo.
- **FR-004**: El sistema DEBE exigir una sesión válida para toda página y toda acción, salvo el
  inicio de sesión, y redirigir al inicio de sesión cuando no la hay.
- **FR-005**: El sistema DEBE registrar cada ingreso exitoso como una sesión con persona y hora de
  inicio. Los intentos fallidos no se registran.
- **FR-006**: El sistema DEBE permitir cerrar sesión y registrar en ese momento la hora de fin.
  Una persona puede tener varias sesiones abiertas a la vez; cerrar una no cierra las demás.
- **FR-007**: El sistema DEBE dar por terminada una sesión cuando pasan 8 horas desde su inicio,
  sin importar la actividad, y registrar como hora de fin la hora de inicio más 8 horas (RN-03).
- **FR-008**: El sistema DEBE dar por terminadas las sesiones abiertas de una persona cuando se la
  desactiva o se le restablece la contraseña, y registrar la hora de fin en ese momento (RN-06).
- **FR-009**: El sistema DEBE registrar cómo terminó cada sesión: cerrada por el usuario, expirada,
  o cerrada por desactivación o restablecimiento.

**Personal**

- **FR-010**: El sistema DEBE permitir registrar personal con nombre (obligatorio, hasta 60
  caracteres), apellido (obligatorio, hasta 60), cargo (obligatorio, hasta 60), dirección
  (opcional, hasta 150), teléfono (opcional, hasta 20; solo dígitos, espacios, `+` y `-`), nombre
  de usuario (obligatorio) y contraseña inicial (obligatoria).
- **FR-011**: El sistema DEBE aceptar como nombre de usuario de 3 a 30 caracteres formados solo por
  letras minúsculas sin tildes, dígitos, punto y guion bajo, convirtiendo a minúsculas y quitando
  espacios de los extremos antes de validar.
- **FR-012**: El sistema DEBE impedir que dos personas tengan el mismo nombre de usuario, comparado
  sin distinguir mayúsculas, incluidas las personas inactivas, e informar el duplicado nombrando el
  campo y el valor (RN-10, RN-11).
- **FR-013**: El sistema DEBE exigir contraseñas de al menos 8 caracteres (RN-02).
- **FR-014**: El sistema DEBE guardar las contraseñas de forma irreversible, de modo que nadie,
  ni siquiera con acceso a los datos almacenados, pueda leerlas; y NO DEBE mostrarlas, devolverlas
  ni registrarlas en ningún lugar (RN-02, X-04).
- **FR-015**: El sistema DEBE permitir modificar todos los datos de una persona salvo la
  contraseña, que solo cambia mediante FR-019 o FR-020.
- **FR-016**: El sistema DEBE permitir desactivar y reactivar personal, y NO DEBE ofrecer ninguna
  forma de borrarlo definitivamente (D-15, RN-12).
- **FR-017**: El sistema DEBE impedir que un usuario se desactive a sí mismo (RN-04).
- **FR-018**: El sistema DEBE listar el personal con búsqueda por nombre, apellido o nombre de
  usuario, y filtro por activos (por defecto), inactivos o todos, mostrando nombre completo, cargo,
  nombre de usuario y estado.

**Contraseñas**

- **FR-019**: El sistema DEBE permitir a cada usuario cambiar su propia contraseña indicando la
  actual, la nueva y su confirmación; la nueva debe cumplir FR-013 y ser distinta de la actual.
- **FR-020**: El sistema DEBE permitir restablecer la contraseña de **otra** persona asignándole
  una contraseña temporal que escribe el encargado, confirmada dos veces y que cumpla FR-013, sin
  pedir la contraseña anterior. El sistema no genera contraseñas.
- **FR-021**: El sistema DEBE obligar a definir una contraseña nueva, antes de permitir cualquier
  otra función, a quien ingresa con una contraseña temporal o con la contraseña del usuario inicial
  (RN-05, RN-06). Mientras no la cambie, cualquier página o acción lo lleva a la pantalla de cambio;
  la nueva contraseña se escribe dos veces, debe cumplir FR-013 y ser distinta de la temporal.

**Bitácora y datos iniciales**

- **FR-022**: El sistema DEBE permitir consultar el historial de sesiones, del más reciente al más
  antiguo, filtrando por persona y por rango de fechas de inicio (por defecto, el mes en curso).
- **FR-023**: El sistema DEBE crearse con un usuario inicial activo, mediante la carga de datos
  inicial, cuya contraseña esté marcada como pendiente de cambio (RN-05).
- **FR-024**: Todos los mensajes de validación y error DEBEN estar en español e indicar qué está mal
  y cómo corregirlo.

### Entidades clave

- **Usuario (personal)**: persona que opera el sistema. Datos: nombre, apellido, cargo (solo
  informativo), dirección, teléfono, nombre de usuario (único), contraseña protegida, indicador de
  contraseña pendiente de cambio y estado activo o inactivo. No se borra. Registra los documentos
  de las demás funcionalidades (compras, pedidos, distribuciones, informes).
- **Sesión**: cada ingreso de un usuario. Datos: usuario, hora de inicio, hora de fin (vacía
  mientras está abierta) y forma de cierre. Constituye la bitácora de ingresos (RF 7).

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Un usuario con sus credenciales ingresa al sistema en menos de 30 segundos desde que
  abre la página de inicio de sesión.
- **SC-002**: El encargado registra a una persona nueva, con todos sus datos, en menos de 2 minutos.
- **SC-003**: El 100 % de los intentos de abrir páginas internas o ejecutar acciones sin sesión
  válida, incluidas sesiones expiradas, terminan en el inicio de sesión sin mostrar ni guardar
  datos.
- **SC-004**: En una revisión de los datos almacenados, el 0 % de las contraseñas se puede leer o
  recuperar en texto legible.
- **SC-005**: El 100 % de los ingresos exitosos figura en el historial con hora de inicio, y el
  100 % de las sesiones con más de 8 horas figura con hora de fin.
- **SC-006**: Tras desactivar a una persona, ninguno de sus intentos de ingreso ni de sus acciones
  posteriores tiene éxito, y la persona sigue apareciendo en el listado de inactivos.
- **SC-007**: Ante ingresos fallidos, un observador no puede distinguir, por el mensaje recibido,
  si el nombre de usuario existe o no.
- **SC-008**: Una persona que no participó en el desarrollo puede explicar, leyendo esta
  especificación, qué pasa en cada caso de ingreso fallido y por qué el personal no se borra.

## Supuestos

- **Actor y permisos:** hay un solo rol, con acceso total (D-10). Roles y permisos diferenciados
  quedan fuera de alcance.
- **Expiración absoluta:** las 8 horas (FR-007) cubren una jornada laboral completa; por eso no se
  renuevan con la actividad.
- **Contraseña temporal:** la contraseña asignada al restablecer la escribe el encargado y se la
  comunica a la persona en forma personal; el sistema no la envía por ningún medio.
- **Usuario inicial:** la carga de datos inicial crea un único usuario activo con contraseña
  pendiente de cambio; sus credenciales iniciales se documentan en la guía de instalación.
- **Complejidad de contraseña:** además de la longitud mínima, no se exigen mayúsculas, símbolos
  ni caducidad periódica, para no complicar el uso en un almacén con pocos usuarios.
- **Datos de contacto:** dirección y teléfono son opcionales y no se validan contra ningún registro
  externo.
- **Sin carnet de identidad:** el personal no registra CI; la unicidad se garantiza por el nombre de
  usuario.
- **Fuera de alcance:** roles y permisos, recuperación de contraseña por correo, registro y
  bloqueo de intentos fallidos, autenticación en dos pasos, cierre de sesión por inactividad.
- **Dependencias:** esta funcionalidad no depende de otras; todas las demás (F-002 a F-007)
  dependen de ella para exigir sesión y registrar qué usuario hizo cada operación.
