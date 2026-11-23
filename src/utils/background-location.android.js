// Smayta Transporte: GPS en segundo plano propio y libre para Android.
// Mismo uso que el plugin de Transistorsoft (ready, start, stop, getCurrentPosition, onLocation,
// onMotionChange), pero con el módulo nativo SmaytaLocation
// (android/app/src/main/java/io/fleetbase/navigator/location): sin licencia de pago.
import { NativeEventEmitter, NativeModules } from 'react-native';
import { toNativeConfig, toNativePositionOptions } from './background-location-config';

const Native = NativeModules.SmaytaLocation;
const emitter = Native ? new NativeEventEmitter(Native) : null;
const noop = { remove: () => {} };

const missing = () => Promise.reject(new Error('SmaytaLocation native module is not available'));

const withCallbacks = (promise, success, failure) => {
    if (typeof success === 'function' || typeof failure === 'function') {
        promise.then(
            (value) => success?.(value),
            (error) => failure?.(error)
        );
    }
    return promise;
};

let moving = null;

const BackgroundLocation = {
    DESIRED_ACCURACY_HIGH: -1,

    ready(config = {}, success, failure) {
        const promise = Native ? Native.configure(toNativeConfig(config)) : missing();
        return withCallbacks(promise, success, failure);
    },

    setConfig(config = {}, success, failure) {
        return this.ready(config, success, failure);
    },

    start(success, failure) {
        return withCallbacks(Native ? Native.start() : missing(), success, failure);
    },

    stop(success, failure) {
        return withCallbacks(Native ? Native.stop() : missing(), success, failure);
    },

    getState(success, failure) {
        return withCallbacks(Native ? Native.getState() : missing(), success, failure);
    },

    getCurrentPosition(options = {}, success, failure) {
        const promise = Native ? Native.getCurrentPosition(toNativePositionOptions(options)) : missing();
        return withCallbacks(promise, success, failure);
    },

    onLocation(success, failure) {
        if (!emitter) return noop;
        const subs = [emitter.addListener('SmaytaLocation.location', (location) => success?.(location))];
        if (typeof failure === 'function') {
            subs.push(emitter.addListener('SmaytaLocation.error', failure));
        }
        return { remove: () => subs.forEach((s) => s.remove()) };
    },

    /** Avisa cuando el conductor pasa de quieto a en marcha o al revés (según la velocidad). */
    onMotionChange(callback) {
        if (!emitter) return noop;
        return emitter.addListener('SmaytaLocation.location', (location) => {
            const isMoving = Boolean(location?.is_moving);
            if (isMoving !== moving) {
                moving = isMoving;
                callback?.({ isMoving, location });
            }
        });
    },
};

export default BackgroundLocation;
