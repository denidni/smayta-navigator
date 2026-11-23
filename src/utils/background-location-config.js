// Smayta Transporte: traduce la configuración que usa LocationContext (la del plugin de Transistorsoft)
// a la del módulo nativo propio de Android (SmaytaLocation).

const number = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

const stringHeaders = (headers = {}) =>
    Object.fromEntries(
        Object.entries(headers ?? {})
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)])
    );

export function toNativeConfig(config = {}) {
    const native = {
        distanceFilter: number(config.distanceFilter, 10),
        interval: number(config.locationUpdateInterval, 5000),
        heartbeatInterval: number(config.heartbeatInterval, 60) * 1000,
        startOnBoot: config.startOnBoot !== false,
        url: typeof config.url === 'string' ? config.url : '',
        headers: stringHeaders(config.headers),
    };
    if (config.notification?.title) native.notificationTitle = String(config.notification.title);
    if (config.notification?.text) native.notificationText = String(config.notification.text);
    if (config.notification?.channelName) native.channelName = String(config.notification.channelName);
    return native;
}

export function toNativePositionOptions(options = {}) {
    return {
        timeout: number(options.timeout, 15000),
        maximumAge: number(options.maximumAge, 10000),
    };
}
