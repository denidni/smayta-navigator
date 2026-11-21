# Smayta Transporte · app del conductor

App para los transportistas de **Smayta Transporte**: reciben las ofertas de
viaje cercanas, las aceptan, navegan hasta la recogida y la entrega, y
confirman la entrega con foto y firma del cliente.

Está basada en [Fleetbase Navigator](https://github.com/fleetbase/navigator-app)
(versión v2.0.12), de Fleetbase Pte. Ltd., y se publica con la misma licencia,
**GNU AGPL-3.0** ([LICENSE.md](LICENSE.md)). El README original de Fleetbase,
con la instalación completa, está en [README.fleetbase.md](README.fleetbase.md).

## Qué cambia respecto a Navigator

Cuanto menos, mejor: configuración antes que código, para poder seguir las
versiones nuevas de Fleetbase.

- Conexión con el servidor de Smayta Transporte ya puesta en `.env`, sin que el
  conductor tenga que configurar nada en la app.
- Próximamente: nombre, logo y colores de Smayta Transporte, y la app en
  español, francés y árabe.

## Preparar el entorno

Hace falta lo mismo que para Navigator (Node, Yarn, Android Studio y, para iOS,
Xcode); los detalles están en [README.fleetbase.md](README.fleetbase.md).

```sh
yarn
cp .env.smayta.example .env
```

En `.env`, rellenar:

- `FLEETBASE_KEY`: clave pública (`flb_live_…`) creada en la consola de
  Fleetbase, **Developers → API Keys**, solo para la app.
- `GOOGLE_MAPS_API_KEY`: clave de Google Maps restringida a la app.

`.env` no se sube nunca a Git.

Para probar en un móvil Android conectado: `yarn android`.

## Entrar como conductor

El conductor entra con su número de teléfono y el código que le llega por SMS.
El alta del conductor la hace Smayta en la consola de Fleetbase.

## Código fuente y licencia

La AGPL-3.0 obliga a publicar el código de la app con los cambios de Smayta:
es este repositorio. La marca «Smayta Transporte» y su logo son de Smayta y no
forman parte de la licencia del código.
