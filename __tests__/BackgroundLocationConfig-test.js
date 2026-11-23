import { toNativeConfig, toNativePositionOptions } from '../src/utils/background-location-config';

describe('GPS propio de Android: configuración', () => {
    test('pasa la dirección, cabeceras y el aviso al módulo nativo', () => {
        const native = toNativeConfig({
            distanceFilter: 10,
            startOnBoot: true,
            url: 'https://api-transporte.example/int/v1/drivers/d1/track',
            headers: { Authorization: 'Bearer x', 'Content-Type': 'application/json', Empty: undefined },
            notification: { title: 'Ubicación en uso', text: 'Texto', channelName: 'Smayta Transporte' },
        });
        expect(native).toEqual({
            distanceFilter: 10,
            interval: 5000,
            heartbeatInterval: 60000,
            startOnBoot: true,
            url: 'https://api-transporte.example/int/v1/drivers/d1/track',
            headers: { Authorization: 'Bearer x', 'Content-Type': 'application/json' },
            notificationTitle: 'Ubicación en uso',
            notificationText: 'Texto',
            channelName: 'Smayta Transporte',
        });
    });

    test('sin sesión no hay dirección y se usan valores por defecto', () => {
        expect(toNativeConfig({})).toEqual({
            distanceFilter: 10,
            interval: 5000,
            heartbeatInterval: 60000,
            startOnBoot: true,
            url: '',
            headers: {},
        });
        expect(toNativeConfig({ startOnBoot: false }).startOnBoot).toBe(false);
    });

    test('opciones de una posición al momento', () => {
        expect(toNativePositionOptions({ timeout: 15000, maximumAge: 10000, samples: 3 })).toEqual({ timeout: 15000, maximumAge: 10000 });
        expect(toNativePositionOptions()).toEqual({ timeout: 15000, maximumAge: 10000 });
    });
});
