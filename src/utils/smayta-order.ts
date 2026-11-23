/**
 * Smayta Transporte: lo que el conductor necesita ver de un viaje de Smayta.
 *
 * Smayta crea los viajes en Fleetbase con datos propios en `meta`
 * (packages/api/src/workflows/transporte/servicios.ts del repo de Smayta):
 * - `smayta_payment`: «cash» si el cliente paga en efectivo al conductor, «paid» si ya pagó.
 * - `smayta_cash_amount` y `smayta_cash_currency`: lo que hay que cobrar.
 */
import { Linking, Platform } from 'react-native';
import LaunchNavigator from 'react-native-launch-navigator';
import { config, showActionSheet } from './index';
import { getCoordinates } from './location';
import { getLocale, translate } from './localize';
import { get as getStored, set as setStored, getString, setString } from './storage';

export type CashToCollect = { amount: number; currency: string };

/** Lo que el conductor tiene que cobrar en efectivo al entregar, o null si el cliente ya pagó. */
export function cashToCollect(order: any): CashToCollect | null {
    const meta = order?.getAttribute?.('meta') ?? {};
    if (meta?.smayta_payment !== 'cash') return null;
    const amount = Number(meta.smayta_cash_amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return { amount, currency: String(meta.smayta_cash_currency || 'EUR').toUpperCase() };
}

const INTL_LOCALE = { es: 'es-ES', en: 'en-GB', fr: 'fr-FR', ar: 'ar-DZ' };

/** Importe con su moneda en el idioma de la app (los importes de Smayta van en unidades, no en céntimos). */
export function formatMoney(amount: number, currency: string): string {
    const locale = INTL_LOCALE[getLocale()] ?? 'es-ES';
    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: currency === 'DZD' ? 0 : 2 }).format(amount);
    } catch {
        return `${amount.toFixed(currency === 'DZD' ? 0 : 2)} ${currency}`;
    }
}

/** Atributo de un lugar, sea un recurso del SDK de Fleetbase o un objeto simple. */
const attr = (place: any, key: string) => (typeof place?.getAttribute === 'function' ? place.getAttribute(key) : place?.[key]);

export type StopKind = 'pickup' | 'dropoff' | 'stop';

/** Si el destino actual es la recogida, la entrega o una parada intermedia. */
export function stopKind(order: any, destination: any): StopKind {
    const id = attr(destination, 'id');
    const pickup = order?.getAttribute?.('payload.pickup');
    const dropoff = order?.getAttribute?.('payload.dropoff');
    const waypoints = order?.getAttribute?.('payload.waypoints', []) ?? [];
    if (pickup && pickup.id === id) return 'pickup';
    if (dropoff && dropoff.id === id) return 'dropoff';
    if (!pickup && !dropoff && waypoints.length) {
        if (waypoints[0]?.id === id) return 'pickup';
        if (waypoints[waypoints.length - 1]?.id === id) return 'dropoff';
    }
    return 'stop';
}

/** Teléfono para llamar en el destino actual: el del lugar o, en la entrega, el del cliente. */
export function stopPhone(order: any, destination: any, kind: StopKind): string | null {
    const phone = attr(destination, 'phone');
    if (phone) return String(phone);
    if (kind !== 'pickup') {
        const customer = order?.getAttribute?.('customer');
        if (customer?.phone) return String(customer.phone);
    }
    return null;
}

export function callPhone(phone?: string | null) {
    if (phone) Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
}

/** Abre WhatsApp con ese número (solo cifras, con prefijo de país). */
export function openWhatsApp(phone?: string | null) {
    const digits = String(phone ?? '').replace(/[^0-9]/g, '');
    if (digits) Linking.openURL(`https://wa.me/${digits}`);
}

const NAV_APP_KEY = '_smayta_nav_app';

/**
 * «Navegar»: abre Google Maps, Waze u otra app con el destino y el guiado por voz.
 * La primera vez pregunta qué app usar y la recuerda (se puede cambiar con `ask`).
 */
export async function navigateTo(destination: any, { ask = false }: { ask?: boolean } = {}) {
    if (!destination) return;
    if (Platform.OS === 'android') {
        LaunchNavigator.setGoogleApiKey(config('GOOGLE_MAPS_API_KEY'));
    }
    const coordinates = getCoordinates(destination);
    const destinationName = attr(destination, 'name') || attr(destination, 'street1') || attr(destination, 'address');
    const launch = async (app?: string) => {
        try {
            await LaunchNavigator.navigate(coordinates, { ...(app ? { app } : {}), launchMode: LaunchNavigator.LAUNCH_MODE.TURN_BY_TURN, destinationName });
        } catch (err) {
            // Sin la app elegida (desinstalada): Google Maps en el navegador.
            const [lat, lng] = coordinates;
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`);
        }
    };

    let apps: Record<string, boolean> = {};
    try {
        apps = await LaunchNavigator.getAvailableApps();
    } catch {
        apps = {};
    }
    const available = Object.keys(apps).filter((name) => apps[name] === true);
    const saved = getString(NAV_APP_KEY);
    if (!ask && saved && available.includes(saved)) return launch(saved);
    if (available.length <= 1) return launch(available[0]);

    // Google Maps y Waze primero: son las que usan casi todos los conductores.
    const preferred = ['google_maps', 'waze'];
    const ordered = [...preferred.filter((name) => available.includes(name)), ...available.filter((name) => !preferred.includes(name))];
    showActionSheet({
        title: translate('Smayta.chooseNavigationApp'),
        options: [...ordered.map((name) => LaunchNavigator.APP_NAMES[name] ?? name), translate('common.cancel')],
        cancelButtonIndex: ordered.length,
        onSelect: (index) => {
            if (index === ordered.length || index === undefined) return;
            setString(NAV_APP_KEY, ordered[index]);
            launch(ordered[index]);
        },
    });
}

/**
 * Códigos escaneados: al escanear en la recogida o en la entrega, la prueba
 * se guarda para ese viaje y esa parada, y se usa sola cuando el paso siguiente
 * pide prueba de entrega.
 */
const SCANS_KEY = '_smayta_scans';
type ScanRecord = { proof: string; at: string };

const scanKey = (orderId: string, stopId?: string | null) => `${orderId}:${stopId ?? 'order'}`;

export function saveScan(orderId: string, stopId: string | null | undefined, proofId: string) {
    const all = (getStored(SCANS_KEY) as Record<string, ScanRecord>) ?? {};
    // Solo los de los últimos 7 días, para no acumular.
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const kept = Object.fromEntries(Object.entries(all).filter(([, r]) => r && Date.parse(r.at) > weekAgo));
    kept[scanKey(orderId, stopId)] = { proof: proofId, at: new Date().toISOString() };
    setStored(SCANS_KEY, kept);
}

export function scannedProof(orderId: string, stopId?: string | null): string | null {
    const all = (getStored(SCANS_KEY) as Record<string, ScanRecord>) ?? {};
    return all[scanKey(orderId, stopId)]?.proof ?? null;
}

export function consumeScan(orderId: string, stopId?: string | null) {
    const all = (getStored(SCANS_KEY) as Record<string, ScanRecord>) ?? {};
    delete all[scanKey(orderId, stopId)];
    setStored(SCANS_KEY, all);
}
