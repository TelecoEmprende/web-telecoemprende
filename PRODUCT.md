# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Estudiantes de la UPM** (cualquier escuela) que se plantean emprender o sienten curiosidad por el ecosistema de startups. Llegan a la web para conocer el club e inscribirse.
- **Socios del club**, que usan la web para su día a día: inscripción, `/equipo` y el muro de noticias.
- En `/news`, el uso principal es un **vistazo diario en el móvil**: llegan desde el enlace del briefing de WhatsApp, leen titulares durante 1-2 minutos y abren la fuente que les interesa (confirmado el 2026-09-25).

## Product Purpose

TelecoEmprende es el club de emprendimiento nacido en la ETSIT-UPM y abierto desde el curso 2026/27 a toda la UPM. La web sirve para dar a conocer el club, gestionar las inscripciones y organizar el trabajo interno de sus equipos (`/equipo`, `/admin`).

`/news` publica cada día las noticias de IA, finanzas, inversión, startups y tech que selecciona el news-bot del club (repositorio `internal-tools/news-bot`), con una explicación de por qué importan a alguien que emprende. Es un segundo canal del mismo briefing que llega por WhatsApp.

## Positioning

El club selecciona y explica las noticias pensando en quien está montando algo, no en inversores ni en público general: cada noticia dice qué pasó y **por qué importa para emprender**, con prioridad para rondas, fondos y ecosistema de España y Europa.

## Operating Context

- El briefing se genera cada día a las 07:00 (Madrid); los viernes es el resumen de la semana.
- Datos: API pública de solo lectura en `https://n8n.telecoemprende.es/webhook/noticias` (lista por tema/días y detalle por id). Cada noticia trae titular, qué pasó, por qué importa, tema, relevancia (0-100), fecha y fuentes (medio, título, enlace).
- Temas: `ia`, `finanzas`, `inversion`, `startups`, `tech`.

## Capabilities and Constraints

- `/news` es pública, sin login, y se enlaza desde la navegación y desde la home (decidido el 2026-09-25).
- No se muestra el texto de los artículos de prensa (derechos de autor, art. 15 Directiva UE 2019/790): solo titulares, el análisis propio del club y enlaces a las fuentes.
- Los análisis los escribe un LLM y pueden contener errores: cada noticia enlaza a sus fuentes originales.

## Brand Commitments

- Manual de identidad visual v2.0 (septiembre 2026): Canva «Brand design TelecoEmprende» y `docs/brand-guide.html`, aplicados en `frontend/src/styles/tokens.css`.
- Voz en español, cercana y de tú, como el resto de la web pública.

## Evidence on Hand

- Noticias reales del pipeline desde el 2026-09-23 (unas 30 analizadas por día).
- No hay testimonios, métricas de lectura ni datos de uso de `/news`: no inventarlos.

## Product Principles

- Utilidad antes que volumen: pocas noticias, bien elegidas y explicadas.
- Siempre trazable: cada afirmación lleva a su fuente original.
- El móvil manda: se lee en 1-2 minutos desde WhatsApp.
- La web también es la puerta del club: quien llega por las noticias puede inscribirse.

## Accessibility & Inclusion

Sin requisitos propios de `/news` más allá de los de la web: contraste de la paleta de marca (ver `tokens.css`) y respeto de `prefers-reduced-motion`.
