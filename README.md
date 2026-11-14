# OPERACIÓN EXTRACCIÓN

## Descripción

**Operación Extracción** es un videojuego FPS 3D desarrollado con **JavaScript y Three.js**.

El jugador debe avanzar por un escenario en 3D, enfrentarse a zombis, recoger munición y llegar hasta la zona de extracción para completar la misión.

El juego utiliza modelos 3D para las armas y los zombis, además de un sistema de iluminación, colisiones, navegación de enemigos y efectos visuales.

---

## Controles

| Tecla / Acción |     | Función |
        W                Avanzar
        S               Retroceder
        A           Moverse a la izquierda
        D            Moverse a la derecha
      Mouse                Mirar
  Click izquierdo        Disparar
        1            Seleccionar pistola
        2            Seleccionar carabina
        F           Encender/apagar linterna
        M           Activar/desactivar sonido
       Esc             Pausar el juego
        R         Reiniciar despues de perder o ganar



---

## Armas

El juego cuenta actualmente con dos armas:

### Pistola

- Munición inicial: **12 balas**
- Munición máxima: **48 balas**
- Daño: **1**
- Dispone de animación 3D.

### Carabina

- Munición inicial: **15 balas**
- Munición máxima: **60 balas**
- Daño: **1**
- Dispone de animación 3D.
- Se selecciona con la tecla **2**.

Las armas se encuentran en:

```text
assets/models/
├── pistol.glb
└── carbine.glb
```

---

## Zombis

El juego utiliza el modelo:

```text
assets/models/zombie.glb
```

El modelo contiene animaciones para los zombis.

Los zombis pueden:

- Permanecer inicialmente en estado de espera.
- Detectar al jugador.
- Comenzar a perseguirlo.
- Buscar caminos para rodear obstáculos.
- Chocar entre ellos.
- Recibir daño.
- Morir mediante una animación de caída.

Actualmente existen diferentes tipos de zombis, incluyendo zombis normales y rápidos.

---

## Objetivo de la misión

El objetivo principal es:

**Llegar a la zona de extracción.**

Durante el recorrido el jugador debe atravesar diferentes zonas del escenario y enfrentarse a los zombis.

La interfaz muestra:

```text
ETAPA
Objetivo
Distancia hasta la extracción
Zombis eliminados
Munición disponible
```

La misión termina cuando el jugador llega a la zona de extracción.

Si un zombi alcanza al jugador, se produce el **GAME OVER**.

---

## Munición y objetos

Durante el recorrido existen cajas y objetos que permiten recuperar munición.

También existen objetos de tipo **Adrenalina**, que aumentan temporalmente la velocidad del jugador.

Los objetos pueden ser recogidos acercándose a ellos.

---

## Escenario

El escenario está construido mediante código utilizando Three.js.

Incluye diferentes zonas:

- Zona inicial.
- Edificios.
- Calles.
- Tiendas.
- Vehículos.
- Barricadas.
- Hospital.
- Patio.
- Contenedores.
- Autobús.
- Helicóptero.
- Zona final de extracción.

El escenario también contiene iluminación y diferentes materiales para representar las superficies.

---

## Tecnologías utilizadas

El proyecto utiliza:

- **HTML5**
- **CSS3**
- **JavaScript**
- **Three.js 0.160.0**
- **GLTF / GLB**
- **WebGL**
- **Node.js** para las pruebas automáticas.

Three.js se carga mediante CDN desde:

```text
https://cdn.jsdelivr.net/npm/three@0.160.0/
```


## Cómo ejecutar el juego

El juego debe ejecutarse mediante un **servidor web local**.

No se recomienda abrir directamente:

```text
index.html
```

con doble clic, porque los navegadores pueden bloquear la carga de los modelos `.glb`.

### Opción 1: Python

Abrir una terminal dentro de la carpeta:

```bash
python -m http.server 8000
```

Después abrir en el navegador:

```text
http://localhost:8000
```

### Opción 2: Visual Studio Code

Si utilizas Visual Studio Code, puedes utilizar una extensión como **Live Server**.

Después:

1. Abrir el proyecto.
2. Abrir `index.html`.
3. Ejecutarlo con Live Server.
4. Abrir la dirección local indicada por Visual Studio Code.

---

## Pruebas del proyecto

El proyecto incluye pruebas automáticas dentro de:

```text
tests/
```

Las pruebas verifican diferentes partes del juego, entre ellas:

- Sistema de munición.
- Colisiones.
- Rayos de disparo.
- Detección de zombis.
- Navegación A*.
- Caminos del escenario.
- Ubicación de zombis.
- Ubicación de objetos.
- Camino hasta la zona de extracción.
- Imports y exports de los módulos JavaScript.

Para ejecutar las pruebas se necesita **Node.js**.

Desde la carpeta del proyecto:

```bash
node tests/run.mjs
```

Para comprobar el escenario:

```bash
node tests/level.mjs
```

Para comprobar los imports y exports:

```bash
node tests/imports.mjs
```

Si todo está correcto, las pruebas muestran mensajes indicando que fueron superadas.

---

## Configuración

La configuración principal del juego se encuentra en:

```text
js/config.js
```

Desde este archivo se pueden modificar elementos como:

- Velocidad del jugador.
- Altura del jugador.
- Sensibilidad del mouse.
- Munición.
- Daño de las armas.
- Velocidad de los zombis.
- Vida de los zombis.
- Distancia de detección.
- Posición inicial.
- Zona de extracción.
- Configuración de navegación.

---

## Modelos 3D

Los modelos utilizados por el juego son archivos `.glb`.

Actualmente:

```text
pistol.glb
carbine.glb
zombie.glb
```

Si se reemplaza un modelo, es importante conservar el nombre del archivo o actualizar la ruta correspondiente en:

```text
js/config.js
```

---

## Desarrollo

El archivo principal del juego es:

```text
js/main.js
```

Los principales módulos son:

```text
player.js       → movimiento del jugador
weapons.js      → armas y animaciones
zombies.js      → comportamiento de los zombis
collision.js    → colisiones y disparos
nav.js          → navegación de los enemigos
level.js        → construcción del escenario
levelLayout.js  → distribución del escenario
effects.js      → efectos visuales
ammo.js         → sistema de munición
ui.js           → interfaz del juego
config.js       → configuración general
audio.js        → sistema de sonido
```

---

## Final de la partida

Existen dos resultados posibles:

### Victoria

El jugador llega a la zona de extracción.

Se muestra:

```text
¡MISIÓN COMPLETADA!
```

### Derrota

Un zombi alcanza al jugador.

Se muestra:

```text
GAME OVER
```

En ambos casos se muestran estadísticas de la partida, como:

- Tiempo.
- Zombis eliminados.
- Disparos realizados.
- Precisión.
- Munición restante.

---

## Proyecto

**Nombre:** Operación Extracción

**Tipo:** Videojuego FPS 3D

**Tecnología principal:** Three.js + JavaScript

**Plataforma:** Navegador web

**Formato de modelos:** GLB

**Motor gráfico:** WebGL / Three.js

---

## Nota

Para ejecutar correctamente el proyecto se necesita una conexión a Internet, ya que Three.js y sus módulos se cargan desde un CDN.

También se deben conservar las carpetas:

```text
js/
css/
assets/
```

y los modelos `.glb` dentro de:

```text
assets/models/
```

No cambiar los nombres de los archivos de los modelos sin actualizar las rutas en la configuración del juego.