/**
 * Smayta Transporte: la cuenta de Smayta del conductor dentro de la app.
 *
 * Es la misma cuenta que en smayta.es (correo y contraseña): con ella el
 * conductor se da de alta, sube sus documentos y su verificación de identidad,
 * y ve su saldo y su cartera. Usa la API de tienda de Smayta (`/store/...`),
 * igual que la tienda web y la app de compradores:
 * - `/auth/customer/emailpass` (entrar) y `/auth/customer/emailpass/register` + `/store/customers` (crear cuenta).
 * - `/store/transporte/transportista` (alta), `/documentos`, `/saldo` y `/efectivo`.
 * - `/store/identidad` (documento y selfie).
 * - `/store/cartera` (cartera única; si el servidor aún no la tiene, la app usa `/saldo`).
 *
 * La clave publicable de Smayta es pública (la misma que la tienda web).
 * El token de la sesión se guarda en el móvil y no sale de él.
 */
import { config } from './index';
import { getString, setString, remove } from './storage';
import { getLocale } from './localize';

const TOKEN_KEY = '_smayta_token';

export class SmaytaApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public code?: string
    ) {
        super(message);
    }
}

export const smaytaApiUrl = () => String(config('SMAYTA_API_URL', 'https://api.2-29-220-121.sslip.io')).replace(/\/+$/, '');
export const smaytaWebUrl = () => String(config('SMAYTA_WEB_URL', 'https://tienda.2-29-220-121.sslip.io')).replace(/\/+$/, '');
const publishableKey = () => String(config('SMAYTA_PUBLISHABLE_KEY', ''));

export const getSmaytaToken = (): string | null => getString(TOKEN_KEY) || null;
export const setSmaytaToken = (token: string) => setString(TOKEN_KEY, token);
export const clearSmaytaToken = () => remove(TOKEN_KEY);

type RequestInit = { method?: string; body?: unknown; form?: FormData; token?: string | null };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = init.token !== undefined ? init.token : getSmaytaToken();
    const headers: Record<string, string> = {
        'x-publishable-api-key': publishableKey(),
        'accept-language': getLocale(),
    };
    if (token) headers.authorization = `Bearer ${token}`;
    if (init.body !== undefined) headers['content-type'] = 'application/json';

    let response: Response;
    try {
        response = await fetch(`${smaytaApiUrl()}${path}`, {
            method: init.method ?? 'GET',
            headers,
            body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
        });
    } catch {
        throw new SmaytaApiError(0, 'network');
    }
    const text = await response.text();
    let json: any = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = null;
    }
    if (!response.ok) {
        if (response.status === 401 && token && init.token === undefined) clearSmaytaToken();
        throw new SmaytaApiError(response.status, json?.message || `HTTP ${response.status}`, typeof json?.code === 'string' ? json.code : undefined);
    }
    return json as T;
}

// Tipos de la API de Smayta (packages/api/src/workflows/transporte/alta.ts, saldo.ts, efectivo.ts e identidad).
export type VehicleKind = 'bicycle' | 'scooter' | 'motorbike' | 'car' | 'van' | 'truck';
export type DocumentKind = 'alta_fiscal' | 'driving_license' | 'vehicle_insurance' | 'goods_insurance';
export type IdentityState = 'approved' | 'pending' | 'rejected' | 'expired' | 'missing';

export type DriverDocument = {
    id: string;
    kind: DocumentKind;
    filename: string;
    expires_at: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'replaced';
    review_note: string | null;
    created_at: string;
};

export type MiTransportista = {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    country: string;
    vehicle_kind: VehicleKind | null;
    vehicle_plate: string | null;
    legal_name: string | null;
    tax_id: string | null;
    address_line: string | null;
    postal_code: string | null;
    city: string | null;
    province: string | null;
    holder_name: string | null;
    iban_hint: string | null;
    status: 'pending' | 'active' | 'suspended';
    driver_app: boolean;
    required_documents: DocumentKind[];
    missing_documents: DocumentKind[];
    missing: string[];
    documents: DriverDocument[];
    /** Fotos del vehículo (la primera la ve el cliente con la matrícula); servidores antiguos no la mandan. */
    vehicle_photos?: { id: string; url: string }[];
    identity: IdentityState;
    identity_required: boolean;
};

export type TransportistaInput = Partial<{
    name: string;
    phone: string;
    email: string;
    country: 'ES' | 'DZ';
    vehicle_kind: VehicleKind;
    vehicle_plate: string | null;
    legal_name: string | null;
    tax_id: string | null;
    address_line: string | null;
    postal_code: string | null;
    city: string | null;
    province: string | null;
    holder_name: string | null;
    iban: string | null;
    accept_conditions: true;
}>;

export type DriverBalance = { currency_code: string; trips: number; earned: number; moved: number; charges: number; available: number; waiting_cash: number };
export type DriverPayout = {
    id: string;
    period: string;
    currency_code: string;
    trips: number;
    net: number;
    wallet: number;
    charges: number;
    transfer: number;
    status: 'pending' | 'paid';
    paid_at: string | null;
};
export type MyEarnings = { empresa: boolean; wallet_currency: string; wallet_enabled: boolean; balances: DriverBalance[]; payouts: DriverPayout[] };

export type CashDeposit = {
    id: string;
    reference: string;
    status: string;
    currency_code: string;
    amount: number;
    trips: number;
    created_at: string;
    receipt_uploaded_at: string | null;
    confirmed_at: string | null;
    note: string | null;
};
export type CashAccount = { name: string; bank_name: string | null; iban: string; holder: string };
export type MyCash = { blocked: boolean; blocked_at: string | null; deposits: CashDeposit[]; accounts: Record<string, CashAccount[]> };

export type WalletMovement = { id: string; type: string; amount: number; created_at: string; source?: 'driver_earnings' | 'transport' | null };
export type Cartera = {
    wallet: {
        enabled: boolean;
        number?: string;
        number_formatted?: string;
        state?: string;
        balance: number;
        currency_code: string;
        expires_at?: string | null;
        movements: WalletMovement[];
    } | null;
    can?: { redeem?: boolean; topup_online?: boolean; topup_in_store?: boolean; pay_transport?: boolean };
    topup_methods?: string[];
    driver: MyEarnings | null;
};

export type IdentityView = {
    required: boolean;
    state: IdentityState;
    last: { status: string; country: string; document_type: string; submitted_at: string; reject_reason: string | null; review_note: string | null } | null;
};

export type PhotoFile = { uri: string; name: string; type: string };

export const smayta = {
    async login(email: string, password: string): Promise<void> {
        const { token } = await request<{ token: string }>('/auth/customer/emailpass', { method: 'POST', body: { email: email.trim(), password }, token: null });
        setSmaytaToken(token);
    },

    /** Crea la cuenta de Smayta (la misma que en la web) y entra con ella. */
    async register(input: { email: string; password: string; first_name: string; last_name: string; phone: string }): Promise<void> {
        const email = input.email.trim();
        const { token } = await request<{ token: string }>('/auth/customer/emailpass/register', { method: 'POST', body: { email, password: input.password }, token: null });
        await request('/store/customers', {
            method: 'POST',
            body: { email, first_name: input.first_name.trim(), last_name: input.last_name.trim(), phone: input.phone.trim() },
            token,
        });
        await this.login(email, input.password);
    },

    logout() {
        clearSmaytaToken();
    },

    async me(): Promise<{ id: string; email: string; first_name: string | null; last_name: string | null; phone: string | null }> {
        const { customer } = await request<{ customer: any }>('/store/customers/me?fields=id,email,first_name,last_name,phone');
        return customer;
    },

    async transportista(): Promise<MiTransportista | null> {
        const { transportista } = await request<{ transportista: MiTransportista | null }>('/store/transporte/transportista');
        return transportista;
    },

    async saveTransportista(input: TransportistaInput): Promise<MiTransportista> {
        const { transportista } = await request<{ transportista: MiTransportista }>('/store/transporte/transportista', { method: 'POST', body: input });
        return transportista;
    },

    async uploadDocument(kind: DocumentKind, file: PhotoFile, expiresAt: string | null): Promise<MiTransportista> {
        const form = new FormData();
        form.append('file', file as any);
        form.append('kind', kind);
        if (expiresAt) form.append('expires_at', expiresAt);
        const { transportista } = await request<{ transportista: MiTransportista }>('/store/transporte/transportista/documentos', { method: 'POST', form });
        return transportista;
    },

    async addVehiclePhoto(file: PhotoFile): Promise<MiTransportista> {
        const form = new FormData();
        form.append('file', file as any);
        const { transportista } = await request<{ transportista: MiTransportista }>('/store/transporte/transportista/vehiculo/fotos', { method: 'POST', form });
        return transportista;
    },

    async removeVehiclePhoto(photoId: string): Promise<MiTransportista> {
        const { transportista } = await request<{ transportista: MiTransportista }>(`/store/transporte/transportista/vehiculo/fotos/${encodeURIComponent(photoId)}`, { method: 'DELETE' });
        return transportista;
    },

    async identity(): Promise<IdentityView> {
        const { identity } = await request<{ identity: IdentityView }>('/store/identidad');
        return identity;
    },

    async submitIdentity(input: { country: string; document_type: string; nin?: string | null; front: PhotoFile; back: PhotoFile | null; selfie: PhotoFile }): Promise<IdentityView> {
        const form = new FormData();
        form.append('country', input.country);
        form.append('document_type', input.document_type);
        form.append('consent', 'true');
        // Argelia: el NIN (18 cifras del anverso de la CNI), que no va en la MRZ.
        if (input.nin) form.append('nin', input.nin);
        form.append('front', input.front as any);
        if (input.back) form.append('back', input.back as any);
        form.append('selfie', input.selfie as any);
        const { identity } = await request<{ identity: IdentityView }>('/store/identidad', { method: 'POST', form });
        return identity;
    },

    /** Cartera y ganancias juntas; con un servidor sin `/store/cartera`, solo las ganancias. */
    async cartera(): Promise<Cartera> {
        try {
            return await request<Cartera>('/store/cartera');
        } catch (err) {
            if (!(err instanceof SmaytaApiError) || err.status !== 404) throw err;
            const { saldo } = await request<{ saldo: MyEarnings | null }>('/store/transporte/transportista/saldo');
            return { wallet: null, driver: saldo };
        }
    },

    /** Pasa lo ganado (todo, o `amount`) a la cartera de Smayta, para gastarlo en compras. */
    async moveToWallet(amount: number | null = null): Promise<MyEarnings> {
        const { saldo } = await request<{ saldo: MyEarnings }>('/store/transporte/transportista/saldo', { method: 'POST', body: amount ? { amount } : {} });
        return saldo;
    },

    async efectivo(): Promise<MyCash | null> {
        const { efectivo } = await request<{ efectivo: MyCash | null }>('/store/transporte/transportista/efectivo');
        return efectivo;
    },

    async uploadCashReceipt(depositId: string, file: PhotoFile): Promise<void> {
        const form = new FormData();
        form.append('file', file as any);
        await request(`/store/transporte/transportista/efectivo/${encodeURIComponent(depositId)}/justificante`, { method: 'POST', form });
    },

    /** Canjear una tarjeta regalo en la cartera. */
    async redeemGiftCard(code: string): Promise<void> {
        await request('/store/tarjetas-regalo/mi-saldo/canjear', { method: 'POST', body: { code: code.trim() } });
    },
};
