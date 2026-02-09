# Informe de Arquitectura y Auditoría: Hoja de Ruta v2.0

## 1. Semáforo de Estado

*   🟢 **ECS (Entity-Component-System):** LISTO.
    *   La implementación actual (`src/core/ecs.js`) es genérica y flexible. Soporta entidades sin componente `position`, lo cual es crucial para entidades abstractas como "Eventos de Mercado" o "Necesidades". No requiere cambios estructurales.
*   🟡 **Store (Gestión de Estado):** REFACTOR LEVE.
    *   Actualmente mezcla configuración visual (`viewMode`), input (`hover`) y estado de simulación (`heat`, `economy`).
    *   **Brecha:** Para la "Simulación Híbrida Estocástica", el Store necesita estructuras dedicadas (ej: arrays para historial de precios, buffers para movimiento browniano) separadas del estado visual para evitar contaminación de datos.
*   🟡 **Sistema Económico (`economy.js`):** REFACTOR NECESARIO.
    *   La lógica actual es lineal y simplista. Mezcla la lógica de "minado" (recompensa por hashrate) con la "simulación de mercado" (precio BTC).
    *   **Brecha:** La Hoja de Ruta exige fórmulas complejas (Browniano). Mantener esto en un solo archivo hará que sea inmanejable. Se requiere separación.
*   🔴 **Life Simulator:** BLOQUEANTE / INEXISTENTE.
    *   No existe lógica ni estructuras de datos para soportar al personaje. Se requiere implementar desde cero.

## 2. Análisis de Brechas y Soluciones

### ECS y Entidades No Físicas
El ECS actual permite crear entidades simplemente añadiendo componentes.
*   **Solución:** Para eventos de mercado, crearemos entidades con componentes como `MarketEvent` (duración, impacto). Para el jugador, una entidad con componente `Player` (energía, hambre).
*   **Rendimiento:** El ECS es ligero. Sin embargo, si añadimos miles de partículas de mercado, podríamos saturar el loop.
*   **Recomendación:** Mantener la simulación de mercado matemática en el `Store` o un System dedicado sin crear una entidad por cada "tick" de precio, pero sí entidades para "Eventos Mayores" (ej: Halving).

### Estructura del Store
El `Store` necesita segregación.
*   **Propuesta:** Dividir conceptualmente dentro del objeto `Store`:
    *   `Store.world`: Grid, Heat, Noise.
    *   `Store.market`: PriceHistory, Volatility, Trends (NUEVO).
    *   `Store.player`: Stats, Inventory (NUEVO).

### Integración de Life Simulator
*   **Enfoque:** Crear un componente `Player` en `src/ecs/components/player.js`.
*   **Sistema:** Crear `src/systems/life.js` que itere sobre entidades con componente `Player`.
*   **Ventaja:** Permite tener múltiples personajes (ej: empleados) en el futuro si se escala, en lugar de un objeto global hardcodeado.

## 3. Propuesta de Estructura de Archivos

Para mantener el orden sin sobre-ingeniería, propongo la siguiente adición de archivos:

### Nuevos Archivos
1.  `src/systems/market.js`: Lógica pura de simulación de precios (Movimiento Browniano).
2.  `src/systems/life.js`: Lógica de supervivencia y estado del jugador.
3.  `src/ecs/components/player.js`: Estructura de datos del personaje.
4.  `src/ecs/components/market_event.js`: Para eventos temporales.
5.  `src/data/economy_config.js`: Constantes para las fórmulas estocásticas.

### Reorganización (Opcional pero Recomendada)
Mover sistemas actuales a carpetas temáticas para limpiar la raíz `src/systems/`:
*   `src/systems/core/` -> `input.js`, `ui.js`, `hierarchy.js`
*   `src/systems/sim/` -> `simulation.js` (Física), `economy.js` (Mining), `market.js` (Trading), `life.js` (RPG)

## 4. Plan de Acción Paso a Paso

Recomiendo la siguiente secuencia para minimizar roturas:

1.  **Fase 1: Desacople Económico (Prioridad Alta)**
    *   Crear `src/systems/market.js`.
    *   Mover la lógica de fluctuación de precio de `economy.js` a `market.js`.
    *   Implementar Movimiento Browniano básico en `market.js`.
    *   *Resultado:* `economy.js` solo maneja Hashrate/Rewards; `market.js` maneja Precio BTC.

2.  **Fase 2: Estructura del Jugador (Life Sim Base)**
    *   Crear `src/ecs/components/player.js`.
    *   Instanciar la entidad Jugador en `game.js`.
    *   Crear `src/systems/life.js` (inicialmente solo consumiendo energía pasiva).
    *   *Resultado:* Tenemos un "Tamagotchi" invisible que gasta energía.

3.  **Fase 3: Integración UI**
    *   Conectar los nuevos datos de `Store.market` y `Store.player` al `UISystem`.
    *   Visualizar gráficas o stats básicas.

4.  **Fase 4: Gameplay Loop**
    *   Conectar input para mover al jugador (si aplica) o acciones de menú (Comer, Dormir).
