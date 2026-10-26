# ⚽ FULBO90

**¿Cuánto sabés de fulbo?** — *90 minutos no alcanzan para todo lo que sabés.*

Desafíos diarios de conocimiento futbolístico con foco en el fútbol argentino y CONMEBOL. El nombre, eslóganes, colores y voz de la marca están centralizados en `lib/config/brand.ts` y `lib/config/copy.ts`.

MVP: **Grid Sudamericano**, **El 11**, **¿Quién es?** e **Impostor**, con desafío diario (igual para todos, cambia a las 00:00 de Buenos Aires), modo infinito, estadísticas locales, compartir resultados y panel `/admin`.

## Puesta en marcha

```bash
npm install
npm run dev          # http://localhost:3000
```

Sin base de datos la app funciona igual: usa los datos de `/data` (modo estático, admin de sólo lectura).

### Con PostgreSQL (Neon) en desarrollo

1. En [Neon](https://neon.tech) creá un proyecto y un **branch `dev`** (el branch principal queda para producción).
2. Copiá `.env.example` a `.env` y completá, con las URLs del branch `dev`:
   - `DATABASE_URL`: conexión **pooled** (con `-pooler`), la usa la app.
   - `DATABASE_URL_UNPOOLED` (o `DIRECT_URL`): conexión **directa**, la usan migraciones y seed.
   - `APP_SECRET`: 32+ caracteres aleatorios (firma de partidas).
3. `npm run db:deploy` → aplica las migraciones versionadas de `prisma/migrations`.
4. `npm run db:seed` → carga jugadores, clubes, títulos, DTs y partidos desde `/data`.
5. `npm run daily:generate` → precarga y verifica los diarios de los próximos 30 días y las reservas.
6. `npm run admin:create -- --email vos@mail.com --password "una-clave-larga"` → primer administrador.

### Producción: GitHub → Vercel + Neon

1. Subí el repo a GitHub e importalo en Vercel.
2. Conectá la **integración Neon ⇄ Vercel** (o cargá a mano las variables) apuntando al **branch principal** de Neon. La integración crea `DATABASE_URL` y `DATABASE_URL_UNPOOLED`; también puede crear un branch por cada Preview Deployment.
3. En Vercel → Settings → Environment Variables agregá `APP_SECRET`, `CRON_SECRET`, `ADMIN_EMAILS` (opcional) y `NEXT_PUBLIC_SITE_URL`.
4. Cada deploy corre `vercel-build`: `prisma generate && prisma migrate deploy && next build`. Las migraciones se aplican solas y nunca se usa `db push` en producción.
5. La primera vez, con las variables de producción en tu terminal: `npm run db:seed` y `npm run admin:create -- …`.
6. `vercel.json` programa el cron `/api/cron/daily` (02:00 UTC = 23:00 Argentina) que mantiene el calendario completo. La primera carga de 30 días conviene hacerla con `npm run daily:generate` (desde lejos de la región de Neon tarda varios minutos); después el cron sólo agrega un día por juego.

**Cambios de schema:** editá `prisma/schema.prisma`, corré `npm run db:migrate -- --name descripcion` contra el branch `dev` y commiteá la carpeta de migración generada. Producción la aplica en el próximo deploy.

### Scripts

| Script | Qué hace |
| --- | --- |
| `npm test` | Tests del motor, tickets, generadores, validadores y scheduler |
| `npm run test:slow` | Sostenibilidad del calendario (90 días por juego, ~4 min) |
| `npm run data:check` | Verifica integridad del seed (referencias, años, títulos vs. palmarés de clubes) |
| `npm run typecheck` / `npm run lint` | Tipos y lint |
| `npm run db:migrate` | Crea una migración nueva (desarrollo) |
| `npm run db:deploy` / `db:status` | Aplica / muestra el estado de las migraciones |
| `npm run db:seed` | Seed idempotente (`-- --reset` reemplaza relaciones del seed; bloqueado en producción sin `--force-production`) |
| `npm run daily:generate` | Corre el motor a mano: completa el calendario y las reservas (`-- --from 2026-11-01`, `-- --backfill`) |
| `npm run admin:create` | Crea o promueve un administrador |

## Producción: decisiones de arquitectura

- **Datos sólo en el servidor.** Prisma vive en `lib/database/*` (marcado `server-only`); los componentes cliente hablan únicamente con server actions y route handlers. Las credenciales nunca llegan al navegador.
- **Prisma Client único** por proceso (`lib/database/prisma.ts`) con el adapter de Neon sobre la conexión pooled.
- **Validación de respuestas en el backend.** Cada respuesta se evalúa con el motor de condiciones contra las relaciones del jugador.
- **Intentos y duplicados controlados por el servidor, sin estado en memoria.** Cada partida lleva un *ticket* firmado con HMAC (`lib/game-engine/tickets.ts`) con intentos, celdas resueltas y jugadores usados; el servidor lo valida y lo devuelve actualizado. El cliente no puede alterarlo, y funciona en funciones serverless sin memoria compartida ni escrituras en Neon por cada jugada de un invitado. Las respuestas correctas sólo se revelan con el ticket cerrado.
- **Resultados.** Invitados: `localStorage`. Usuarios autenticados: `UserGameResult` en Neon, calculado desde el ticket (no desde números del cliente) y único por usuario y desafío.
- **Autenticación propia:** email + contraseña (scrypt), sesiones en Neon con token hasheado en cookie httpOnly. **Admin:** el proxy hace un chequeo optimista y el rol `ADMIN` se verifica en el servidor en el layout, en cada página y en cada server action.
- **Desafíos diarios verificados.** `lib/game-engine/daily-generator.ts` genera con el mismo seed que el fallback en tiempo real, comprueba que cada consigna tenga respuestas correctas (y que la grilla tenga 9 respuestas distintas) y guarda `Challenge`, `ChallengeCondition`, `ChallengeAnswer` y `DailyChallenge`. No hay generación por IA.
- **Fecha del desafío:** siempre `America/Argentina/Buenos_Aires` (`lib/game-engine/daily.ts`).
- **Índices:** trigram GIN sobre `Player.normalizedName` (búsqueda difusa en `/api/jugadores`), `PlayerClub(clubId, playerId)`, `PlayerCompetitionAchievement(competitionId, clubId)`, `DailyChallenge(date)` y `(date, gameId)`, `UserGameResult(gameId, dailyDate)` y `(userId, challengeKey)`.
- **Cachés, no dependencias:** el índice en memoria del grafo futbolístico se recarga desde Neon (TTL de 5 minutos o al editar en el admin); perderlo sólo cuesta una consulta.

## Arquitectura

```
app/
  page.tsx                  Home: desafío del día + grilla de juegos
  juegos/<juego>/page.tsx   Un juego por carpeta (grid, el-11, quien-es, impostor)
  juegos/[slug]/            Juegos "próximamente"
  estadisticas/             Estadísticas locales
  admin/                    Panel: jugadores, clubes, competiciones, partidos, desafíos
  api/jugadores             Búsqueda de jugadores (autocompletado)
  api/og                    Imagen Open Graph dinámica
components/
  games/<juego>/            UI de cada juego (cliente)
  games/shared/             Layout, pestañas Diario/Infinito, reglas, errores
  player-search/            PlayerSearch reutilizable
  pitch/                    FootballPitch
  results/                  Modal de resultados + compartir
  ui/                       Botones, modal, tooltip, banderas SVG, escudos genéricos…
lib/
  game-engine/
    conditions/             Motor de condiciones (tipos, normalización, evaluación, textos)
    dataset/                FootballIndex: índice en memoria de relaciones
    games/                  Un motor por juego: generate / validate / toPublic
    daily.ts                Calendario America/Argentina/Buenos_Aires
    rng.ts                  PRNG determinístico (seed diario)
    load-challenge.ts       Token → desafío (diario, infinito o guardado)
    rarity.ts               Porcentaje de elección y puntaje de rareza
  database/                 Prisma/Neon + fuente estática, persistencia de desafíos/resultados
  actions/                  Server actions (validación de respuestas, admin)
  stats/                    Estadísticas locales (interfaz StatsStore, lista para cuentas)
  games/registry.ts         Catálogo de juegos (metadata)
  config/brand.ts           Nombre, textos y colores: renombrar el producto se hace acá
data/                       Seed curado a mano (formato compacto, sólo datos verificables)
prisma/                     schema.prisma + seed.ts
tests/                      Tests del motor (node:test)
```

### Motor de condiciones

Las respuestas **nunca** se comparan contra strings del frontend. Cada consigna es una condición:

```json
{ "AND": [{ "PLAYED_FOR_CLUB": "River Plate" }, { "WON_COMPETITION": "Copa Libertadores" }] }
```

`normalizeCondition` la resuelve contra los datos (ids o nombres, forma canónica o abreviada) y `evaluate(condición, jugador)` consulta las relaciones del jugador (pasos por clubes, títulos, selecciones, DTs, partidos). Por eso una celda admite múltiples respuestas correctas.

Tipos: `PLAYED_FOR_CLUB`, `PLAYED_FOR_COUNTRY`, `NATIONALITY`, `POSITION`, `WON_COMPETITION` (con club/selección/temporada/resultado), `PLAYED_COMPETITION`, `PLAYED_IN_COUNTRY` (acepta `"EUROPE"`), `COACHED_BY`, `TEAMMATE_WITH`, `PLAYED_MATCH`, `SCORED_IN_MATCH`, `ACADEMY_OF`, `ACTIVE_PLAYER`, `RETIRED_PLAYER`, `DECADE`, `MIN_GOALS`, `MIN_APPEARANCES`; combinables con `AND`, `OR`, `NOT`.

### Daily Challenge Engine (rotación automática)

Todos los juegos diarios se renuevan solos, sin carga manual, mientras haya datos válidos en la base.

- **Calendario precargado:** `DailyChallenge` guarda un desafío por **(fecha, juego)** (restricción única) para los próximos 30 días (configurable). El cron diario `/api/cron/daily` completa los huecos y repone las reservas. Correrlo dos veces —o en paralelo— no duplica nada: cada día se inserta en una transacción que se revierte si otro proceso ganó.
- **Mismo desafío para todos:** a las 00:00 de `America/Argentina/Buenos_Aires` el servidor calcula la fecha y sirve el desafío **guardado**. Si faltara (cron caído), lo genera, valida y guarda en el momento: el primero que entra lo crea y todos los demás reciben ese.
- **Generadores por juego** (`lib/game-engine/games/*`) que sólo usan relaciones de la base, más un **adaptador diario** por juego (`lib/game-engine/daily/adapters/*`) que define:
  - *verificación*: respuestas correctas guardadas en `ChallengeAnswer` (Grid: solución completa con 9 jugadores distintos; El 11: 11 jugadores distintos posibles; Impostor: exactamente 4 cumplen y 1 no);
  - *ambigüedad*: condiciones repetidas, cruces redundantes, pistas de ¿Quién es? que describen a más de un jugador;
  - *dificultad* 1–3 calculada con datos (respuestas por celda, fama de los jugadores), calibrada por terciles;
  - *claves de repetición* y *contenido bloqueable*.
- **Historial anti-repetición** (`ContentUsage`) con dos ventanas configurables por juego: repetición **exacta** (misma grilla, mismo jugador de ¿Quién es?: 30 días) y **parcial** (un cruce del Grid, un impostor: 7 días).
- **Inmutabilidad:** un desafío cuya fecha llegó (o que ya se sirvió, `firstServedAt`) no se modifica. Sólo un admin puede forzarlo con motivo y confirmación, y queda registrado como `admin-override`.
- **Reservas y fallas:** si la generación falla, se usa una reserva validada (`Challenge.status = RESERVE`) y se registra el incidente en `GenerationLog`. Sin reservas, se relajan sólo las repeticiones (nunca la corrección) y también queda registrado.
- **Panel `/admin/calendario`:** próximos 30 días por juego, previsualización, regenerar lo no publicado (con dificultad elegida), override controlado, bloquear jugadores/clubes/consignas (regenera automáticamente los diarios futuros afectados), revisión de errores e incidentes, publicación manual y configuración de ventanas, dificultad, horizonte y reservas.
- **Modo infinito:** nunca toca el calendario. Usa los mismos generadores con un seed aleatorio de la URL y no se guarda en la base.
- **Tests:** `npm test` cubre generadores, validadores y scheduler (con un repositorio en memoria: idempotencia, carreras, reservas, bloqueos, overrides). `npm run test:slow` comprueba que cada juego sostiene 90 días seguidos sin repetir ni degradar validaciones con los datos actuales.

### Agregar un juego nuevo

1. Entrada en `lib/games/registry.ts` (pasa de `soon` a `available`).
2. Motor en `lib/game-engine/games/<juego>.ts` implementando `GameEngine` y registrarlo en `games/index.ts`.
3. Server actions en `lib/actions/<juego>.ts`.
4. UI en `components/games/<juego>/` y página en `app/juegos/<slug>/page.tsx` (copiar el patrón de cualquiera de los existentes).

## Datos

`/data` contiene ~240 jugadores, ~125 clubes y 13 competiciones, cargados a mano priorizando datos verificables: si un año o un título no se pudo confirmar, se omitió. Hay que tomarlo como un seed inicial a revisar y ampliar desde `/admin`. `npm run data:check` detecta inconsistencias (p. ej. un jugador campeón de una Libertadores que su club no ganó).

Los escudos son genéricos (colores + iniciales). Cuando haya derechos sobre logos, se cargan en `Club.logoUrl`.
