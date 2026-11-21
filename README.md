# Smayta Transporte · app del conductor

App para los transportistas de **Smayta Transporte**, el servicio de entregas
de [Smayta](https://smayta.com) en España y Argelia. El conductor ve los
viajes que le ofrecen cerca, los acepta, navega a la recogida y a la entrega,
y confirma con firma y fotos.

Está basada en **[Fleetbase Navigator](https://github.com/fleetbase/navigator-app)**
(versión 2.0.12), de Fleetbase Pte Ltd, con licencia
[AGPL-3.0](LICENSE.md). Este repositorio es público porque la licencia lo
exige: cualquier cambio que hagamos a la app se publica aquí, con la misma
licencia y manteniendo los avisos de autoría de Fleetbase. El README original
está en [README.fleetbase.md](README.fleetbase.md).

## Qué cambia respecto a Navigator

- Nombre, logo, colores e identificador de Smayta Transporte.
- La conexión con el servidor de Fleetbase de Smayta ya viene puesta: el
  conductor no tiene que configurar nada.
- Idiomas: español, francés y árabe (además del inglés).
- Enlace al código fuente dentro de la app (lo pide la AGPL).

El marketplace de Smayta habla con Fleetbase solo por su API; este repositorio
no lleva código de Smayta ni Smayta lleva código de Fleetbase.

## Configuración

1. Copia `.env.example` a `.env`.
2. Pon en `FLEETBASE_KEY` la clave pública «Navigator» de la consola de
   Fleetbase (Desarrolladores → Claves de API). El `.env` no se sube a Git.
3. Para el mapa, `GOOGLE_MAPS_API_KEY`.

Antes de publicar, cambia `FLEETBASE_HOST` y `SOCKETCLUSTER_HOST` al servidor
definitivo. `APP_IDENTIFIER` no se puede cambiar después de publicar la app.

## Compilar

Igual que Navigator (ver [README.fleetbase.md](README.fleetbase.md)):

```bash
yarn install
yarn android   # o: yarn pod:install && yarn ios
```

Para Google Play hace falta una cuenta de desarrollador de Google; para la App
Store, una de Apple.

## Licencia

GNU Affero General Public License v3.0 o posterior ([LICENSE.md](LICENSE.md)).
Copyright © Fleetbase Pte Ltd por Navigator; los cambios de Smayta, con la
misma licencia.
