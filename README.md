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
- GPS en segundo plano propio en Android (ver abajo), sin la licencia de pago
  de Transistorsoft.

El marketplace de Smayta habla con Fleetbase solo por su API; este repositorio
no lleva código de Smayta ni Smayta lleva código de Fleetbase.

## Configuración

1. Copia `.env.example` a `.env`.
2. Pon en `FLEETBASE_KEY` la clave pública «Navigator» de la consola de
   Fleetbase (Desarrolladores → Claves de API). El `.env` no se sube a Git.
3. Para el mapa, `GOOGLE_MAPS_API_KEY`.

Antes de publicar, cambia `FLEETBASE_HOST` y `SOCKETCLUSTER_HOST` al servidor
definitivo. `APP_IDENTIFIER` no se puede cambiar después de publicar la app.

## GPS en segundo plano

Navigator usa el plugin `react-native-background-geolocation` de Transistorsoft,
que en Android pide una licencia de pago para las versiones publicadas. En
Android lo hemos sustituido por un módulo propio y libre
(`android/app/src/main/java/io/fleetbase/navigator/location`):

- Mientras el conductor está conectado, un servicio con aviso fijo («Ubicación
  en uso») sigue su posición con el GPS y la red del propio Android, también
  con la app en segundo plano o cerrada.
- El teléfono envía cada posición (cada 10 m, y la última cada minuto si está
  quieto) directamente al servidor de Fleetbase (`drivers/{id}/track`). Sin
  cobertura guarda hasta 100 posiciones y las manda al volver.
- Al desconectarse o cerrar sesión se para. Tras reiniciar el teléfono vuelve
  solo si la ubicación está en «Permitir siempre»; si no, al abrir la app.
- No necesita Google Play Services ni ninguna clave.

En iOS se sigue usando el plugin de Transistorsoft, que allí es gratuito.
La app llama a los dos igual (`src/utils/background-location*.js`).

## Compilar

Igual que Navigator (ver [README.fleetbase.md](README.fleetbase.md)):

```bash
yarn install
yarn android   # o: yarn pod:install && yarn ios
```

## Publicar en Google Play y la App Store

Las cuentas son las de Smayta (Google Play Console «Smayta» y Apple Developer
de Smayta Holding Group SLU). La guía completa, con las fichas, la privacidad y
la clasificación de las tres apps de Smayta, está en el repositorio principal:
`docs/publicar-apps.md`.

- Identificador: `com.smayta.transporte` en Android (`APP_IDENTIFIER`) y en
  iPhone (`PRODUCT_BUNDLE_IDENTIFIER` del proyecto de Xcode). No se puede
  cambiar después de publicar.
- **Android**: `yarn install && cd android && ./gradlew bundleRelease` con la
  clave de subida en `android/local.properties` (`ANDROID_NAVIGATOR_APP_UPLOAD_*`,
  ver [RELEASE.md](RELEASE.md)). Sale `android/app/build/outputs/bundle/release/app-release.aab`,
  que se sube a la prueba interna de Play Console. Google firma la app con su
  propia clave (Firma de apps de Google Play).
- **iPhone**: necesita un Mac con Xcode. `yarn pod:install`, abrir
  `ios/NavigatorApp.xcworkspace`, elegir el equipo de Smayta en «Signing &
  Capabilities» y Product → Archive → Distribute App → App Store Connect. Los
  textos de la ficha (es, en, fr, ar) están en `ios/fastlane/metadata`.
- **Ubicación en segundo plano**: Google pide rellenar la declaración de
  ubicación en segundo plano con un vídeo corto de la app pidiéndola, y Apple
  pide explicar en la revisión por qué la usa (seguir el viaje del conductor
  mientras está de servicio).
- «Borrar mi cuenta» (cuenta → protección de datos) abre `DELETE_ACCOUNT_URL`,
  la página de Smayta para pedir el borrado; las dos tiendas lo exigen.

## Licencia

GNU Affero General Public License v3.0 o posterior ([LICENSE.md](LICENSE.md)).
Copyright © Fleetbase Pte Ltd por Navigator; los cambios de Smayta, con la
misma licencia.
