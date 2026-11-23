import React, { useCallback, useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, RefreshControl, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Checkbox, Spinner, Text, XStack, YStack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { config } from '../utils';
import { translate, getLocale } from '../utils/localize';
import { toast } from '../utils/toast';
import { smayta, getSmaytaToken, type DocumentKind, type MiTransportista, type VehicleKind } from '../utils/smayta-api';
import { BigButton, Card, Chips, Field, pickPhoto, smaytaErrorMessage } from '../components/SmaytaUi';

const VEHICLES: VehicleKind[] = ['bicycle', 'scooter', 'motorbike', 'car', 'van', 'truck'];
const EXPIRES: Record<DocumentKind, boolean> = { alta_fiscal: false, driving_license: true, vehicle_insurance: true, goods_insurance: true };
const INTL_LOCALE = { es: 'es-ES', en: 'en-GB', fr: 'fr-FR', ar: 'ar-DZ' };
const day = (iso: string) => new Intl.DateTimeFormat(INTL_LOCALE[getLocale()] ?? 'es-ES', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso));
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * «Hazte conductor» en la app: el alta con la cuenta de Smayta, los
 * documentos (según el vehículo), la verificación de identidad y los datos
 * de cobro. Smayta lo revisa y lo activa; después entra con su teléfono.
 */
const SmaytaDriverScreen = () => {
    const navigation = useNavigation();
    const [me, setMe] = useState<MiTransportista | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (!getSmaytaToken()) {
            navigation.navigate('SmaytaAccount', { goal: 'signup' });
            return;
        }
        setLoading(true);
        try {
            setMe(await smayta.transportista());
            setLoaded(true);
        } catch (err) {
            toast.error(smaytaErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [navigation]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    if (!loaded) {
        return (
            <YStack flex={1} alignItems='center' justifyContent='center'>
                <Spinner />
            </YStack>
        );
    }

    return (
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps='handled' refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
            <YStack p='$4' space='$4'>
                {me ? <DriverStatus me={me} onChange={setMe} /> : <SignUp onDone={setMe} />}
            </YStack>
        </ScrollView>
    );
};

const SignUp = ({ onDone }: { onDone: (me: MiTransportista) => void }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState<'ES' | 'DZ'>(String(config('DEFAULT_COUNTRY', 'ES')).toUpperCase() === 'DZ' ? 'DZ' : 'ES');
    const [vehicle, setVehicle] = useState<VehicleKind | null>(null);
    const [plate, setPlate] = useState('');
    const [accept, setAccept] = useState(false);
    const [busy, setBusy] = useState(false);
    const ready = name.trim().length >= 2 && /^\+?[0-9 ]{6,20}$/.test(phone.trim()) && vehicle && accept;

    const submit = async () => {
        setBusy(true);
        try {
            onDone(
                await smayta.saveTransportista({
                    name: name.trim(),
                    phone: phone.trim(),
                    country,
                    vehicle_kind: vehicle!,
                    vehicle_plate: plate.trim() || null,
                    accept_conditions: true,
                })
            );
            toast.success(translate('Smayta.driver.signedUp'));
        } catch (err) {
            toast.error(smaytaErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <YStack space='$3'>
            <Text color='$textPrimary' fontSize='$8' fontWeight='bold'>
                {translate('Smayta.driver.signupTitle')}
            </Text>
            <Card tone='info'>
                <Text color='$infoText' fontWeight='bold'>
                    {translate('Smayta.driver.needTitle')}
                </Text>
                {['needTax', 'needGoods', 'needVehicle', 'needBank', 'needIdentity'].map((k) => (
                    <Text key={k} color='$infoText'>
                        • {translate(`Smayta.driver.${k}`)}
                    </Text>
                ))}
            </Card>
            <Field label={translate('Smayta.driver.fullName')} value={name} onChangeText={setName} autoComplete='name' />
            <Field
                label={translate('Smayta.account.phone')}
                hint={translate('Smayta.driver.phoneHint')}
                value={phone}
                onChangeText={setPhone}
                keyboardType='phone-pad'
                placeholder='+34 600 000 000'
            />
            <Text color='$textSecondary' fontSize='$3' fontWeight='bold'>
                {translate('Smayta.driver.country')}
            </Text>
            <Chips
                options={[
                    { value: 'ES', label: translate('Smayta.driver.countryES') },
                    { value: 'DZ', label: translate('Smayta.driver.countryDZ') },
                ]}
                value={country}
                onChange={setCountry}
            />
            <Text color='$textSecondary' fontSize='$3' fontWeight='bold'>
                {translate('Smayta.driver.vehicle')}
            </Text>
            <Chips options={VEHICLES.map((v) => ({ value: v, label: translate(`Smayta.vehicles.${v}`) }))} value={vehicle} onChange={setVehicle} />
            {vehicle && vehicle !== 'bicycle' && vehicle !== 'scooter' && (
                <Field label={translate('Smayta.driver.plate')} value={plate} onChangeText={setPlate} autoCapitalize='characters' />
            )}
            <XStack alignItems='center' space='$3'>
                <Checkbox size='$5' checked={accept} onCheckedChange={(v) => setAccept(v === true)}>
                    <Checkbox.Indicator>
                        <FontAwesomeIcon icon={faCheck} />
                    </Checkbox.Indicator>
                </Checkbox>
                <Text color='$textPrimary' flex={1} onPress={() => setAccept(!accept)}>
                    {translate('Smayta.driver.acceptConditions')}
                </Text>
            </XStack>
            <Button bg='transparent' onPress={() => Linking.openURL(config('TERMS_URL', 'https://smayta.es/info/condiciones'))}>
                <Button.Text color='$textSecondary' textDecorationLine='underline'>
                    {translate('Smayta.driver.readConditions')}
                </Button.Text>
            </Button>
            <BigButton title={translate('Smayta.driver.signupButton')} onPress={submit} loading={busy} disabled={!ready} />
        </YStack>
    );
};

const DriverStatus = ({ me, onChange }: { me: MiTransportista; onChange: (me: MiTransportista) => void }) => {
    const navigation = useNavigation();
    const [uploading, setUploading] = useState<DocumentKind | null>(null);
    const [askDateFor, setAskDateFor] = useState<DocumentKind | null>(null);
    const [pendingPhoto, setPendingPhoto] = useState<any>(null);

    const upload = async (kind: DocumentKind, photo: any, expiresAt: string | null) => {
        setUploading(kind);
        try {
            onChange(await smayta.uploadDocument(kind, photo, expiresAt));
            toast.success(translate('Smayta.driver.uploaded'));
        } catch (err) {
            toast.error(smaytaErrorMessage(err));
        } finally {
            setUploading(null);
        }
    };

    const startUpload = async (kind: DocumentKind) => {
        const photo = await pickPhoto({ name: kind });
        if (!photo) return;
        if (EXPIRES[kind]) {
            // Los que caducan necesitan la fecha: se pide después de la foto.
            setPendingPhoto(photo);
            setAskDateFor(kind);
            return;
        }
        upload(kind, photo, null);
    };

    const statusText =
        me.status === 'active'
            ? translate(me.driver_app ? 'Smayta.account.driverActive' : 'Smayta.account.driverActiveNoApp')
            : me.status === 'suspended'
              ? translate('Smayta.account.driverSuspended')
              : translate('Smayta.driver.pendingReview');

    return (
        <YStack space='$4'>
            <Card tone={me.status === 'active' ? 'success' : 'warning'}>
                <Text color={me.status === 'active' ? '$successText' : '$warningText'} fontSize='$6' fontWeight='bold'>
                    {translate(`Smayta.driver.status.${me.status}`)}
                </Text>
                <Text color={me.status === 'active' ? '$successText' : '$warningText'}>{statusText}</Text>
            </Card>

            <YStack space='$2'>
                <Text color='$textPrimary' fontSize='$6' fontWeight='bold'>
                    {translate('Smayta.driver.identityTitle')}
                </Text>
                <Card tone={me.identity === 'approved' ? 'success' : me.identity === 'pending' ? 'info' : 'warning'}>
                    <Text color='$textPrimary'>{translate(`Smayta.identity.state.${me.identity}`)}</Text>
                    {(me.identity === 'missing' || me.identity === 'rejected' || me.identity === 'expired') && (
                        <BigButton tone='info' title={translate('Smayta.identity.start')} onPress={() => navigation.navigate('SmaytaIdentity', { country: me.country })} />
                    )}
                </Card>
            </YStack>

            <YStack space='$2'>
                <Text color='$textPrimary' fontSize='$6' fontWeight='bold'>
                    {translate('Smayta.driver.documentsTitle')}
                </Text>
                {me.required_documents.map((kind) => {
                    const doc = me.documents.find((d) => d.kind === kind && d.status !== 'replaced');
                    const missing = me.missing_documents.includes(kind);
                    const tone = !doc ? 'warning' : doc.status === 'approved' && !missing ? 'success' : doc.status === 'rejected' ? 'error' : 'info';
                    return (
                        <Card key={kind} tone={tone}>
                            <Text color='$textPrimary' fontWeight='bold' fontSize='$5'>
                                {translate(`Smayta.documents.${kind}`)}
                            </Text>
                            <Text color='$textSecondary' fontSize='$3'>
                                {translate(`Smayta.documents.${kind}Hint`)}
                            </Text>
                            <Text color='$textPrimary'>
                                {!doc
                                    ? translate('Smayta.documents.notUploaded')
                                    : translate(`Smayta.documents.status.${doc.status}`) +
                                      (doc.expires_at ? ` · ${translate('Smayta.documents.expires', { date: day(doc.expires_at) })}` : '')}
                            </Text>
                            {!!doc?.review_note && <Text color='$textPrimary'>{doc.review_note}</Text>}
                            {(!doc || missing || doc.status === 'rejected') && (
                                <BigButton
                                    tone='info'
                                    title={translate(doc ? 'Smayta.documents.uploadAgain' : 'Smayta.documents.upload')}
                                    onPress={() => startUpload(kind)}
                                    loading={uploading === kind}
                                />
                            )}
                        </Card>
                    );
                })}
                <Text color='$textSecondary' fontSize='$2'>
                    {translate('Smayta.documents.pdfHint')}
                </Text>
            </YStack>

            {askDateFor && (
                <Card tone='info'>
                    <Text color='$infoText' fontWeight='bold'>
                        {translate('Smayta.documents.askExpiry', { document: translate(`Smayta.documents.${askDateFor}`) })}
                    </Text>
                    <DateTimePicker
                        value={new Date(Date.now() + 365 * 24 * 3600 * 1000)}
                        minimumDate={new Date()}
                        mode='date'
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        onChange={(event, date) => {
                            const kind = askDateFor;
                            setAskDateFor(null);
                            if (event.type === 'dismissed' || !date || !kind) return;
                            upload(kind, pendingPhoto, ymd(date));
                            setPendingPhoto(null);
                        }}
                    />
                </Card>
            )}

            <VehicleData me={me} onChange={onChange} />

            <PayoutData me={me} onChange={onChange} />
        </YStack>
    );
};

/** Su vehículo: tipo, matrícula y hasta 4 fotos (el cliente ve la primera con la matrícula). */
const MAX_VEHICLE_PHOTOS = 4;
const VehicleData = ({ me, onChange }: { me: MiTransportista; onChange: (me: MiTransportista) => void }) => {
    const [vehicle, setVehicle] = useState<VehicleKind | null>(me.vehicle_kind);
    const [plate, setPlate] = useState(me.vehicle_plate ?? '');
    const [busy, setBusy] = useState(false);
    const [adding, setAdding] = useState(false);
    const photos = me.vehicle_photos ?? [];
    const changed = vehicle !== me.vehicle_kind || plate.trim() !== (me.vehicle_plate ?? '');
    const needsPlate = vehicle && vehicle !== 'bicycle' && vehicle !== 'scooter';

    const save = async () => {
        setBusy(true);
        try {
            onChange(await smayta.saveTransportista({ ...(vehicle ? { vehicle_kind: vehicle } : {}), vehicle_plate: plate.trim().toUpperCase() || null }));
            toast.success(translate('Smayta.driver.saved'));
        } catch (err) {
            toast.error(smaytaErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const add = async () => {
        const photo = await pickPhoto({ name: 'vehiculo' });
        if (!photo) return;
        setAdding(true);
        try {
            onChange(await smayta.addVehiclePhoto(photo));
        } catch (err) {
            toast.error(smaytaErrorMessage(err));
        } finally {
            setAdding(false);
        }
    };

    const remove = (id: string) =>
        Alert.alert(translate('Smayta.vehicle.removeTitle'), '', [
            { text: translate('common.cancel'), style: 'cancel' },
            {
                text: translate('Smayta.vehicle.remove'),
                style: 'destructive',
                onPress: async () => {
                    try {
                        onChange(await smayta.removeVehiclePhoto(id));
                    } catch (err) {
                        toast.error(smaytaErrorMessage(err));
                    }
                },
            },
        ]);

    return (
        <YStack space='$3'>
            <Text color='$textPrimary' fontSize='$6' fontWeight='bold'>
                {translate('Smayta.vehicle.title')}
            </Text>
            <Text color='$textSecondary' fontSize='$3'>
                {translate('Smayta.vehicle.hint')}
            </Text>
            <Chips options={VEHICLES.map((v) => ({ value: v, label: translate(`Smayta.vehicles.${v}`) }))} value={vehicle} onChange={setVehicle} />
            {needsPlate && <Field label={translate('Smayta.driver.plate')} value={plate} onChangeText={setPlate} autoCapitalize='characters' />}
            {changed && <BigButton title={translate('Smayta.driver.save')} onPress={save} loading={busy} />}
            {vehicle !== me.vehicle_kind && (
                <Text color='$warningText' fontSize='$3'>
                    {translate('Smayta.vehicle.kindChangeHint')}
                </Text>
            )}
            <XStack flexWrap='wrap' gap='$2'>
                {photos.map((p, i) => (
                    <Pressable key={p.id} onLongPress={() => remove(p.id)} onPress={() => remove(p.id)}>
                        <YStack>
                            <Image source={{ uri: p.url }} style={{ width: 150, height: 110, borderRadius: 8 }} resizeMode='cover' />
                            {i === 0 && (
                                <Text color='$textSecondary' fontSize='$2'>
                                    {translate('Smayta.vehicle.mainPhoto')}
                                </Text>
                            )}
                        </YStack>
                    </Pressable>
                ))}
            </XStack>
            {photos.length < MAX_VEHICLE_PHOTOS && (
                <BigButton tone='info' title={translate(photos.length ? 'Smayta.vehicle.addMore' : 'Smayta.vehicle.add')} onPress={add} loading={adding} />
            )}
        </YStack>
    );
};

/** Datos de cobro: a quién paga Smayta cada mes (titular, NIF, dirección y cuenta). */
const PayoutData = ({ me, onChange }: { me: MiTransportista; onChange: (me: MiTransportista) => void }) => {
    const [legalName, setLegalName] = useState(me.legal_name ?? '');
    const [taxId, setTaxId] = useState(me.tax_id ?? '');
    const [address, setAddress] = useState(me.address_line ?? '');
    const [postalCode, setPostalCode] = useState(me.postal_code ?? '');
    const [city, setCity] = useState(me.city ?? '');
    const [province, setProvince] = useState(me.province ?? '');
    const [holder, setHolder] = useState(me.holder_name ?? '');
    const [iban, setIban] = useState('');
    const [busy, setBusy] = useState(false);

    const save = async () => {
        setBusy(true);
        try {
            onChange(
                await smayta.saveTransportista({
                    legal_name: legalName.trim() || null,
                    tax_id: taxId.trim() || null,
                    address_line: address.trim() || null,
                    postal_code: postalCode.trim() || null,
                    city: city.trim() || null,
                    province: province.trim() || null,
                    holder_name: holder.trim() || null,
                    ...(iban.trim() ? { iban: iban.replace(/\s+/g, '').toUpperCase() } : {}),
                })
            );
            setIban('');
            toast.success(translate('Smayta.driver.saved'));
        } catch (err) {
            toast.error(smaytaErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <YStack space='$3'>
            <Text color='$textPrimary' fontSize='$6' fontWeight='bold'>
                {translate('Smayta.driver.payoutTitle')}
            </Text>
            <Text color='$textSecondary' fontSize='$3'>
                {translate('Smayta.driver.payoutHint')}
            </Text>
            <Field label={translate('Smayta.driver.legalName')} value={legalName} onChangeText={setLegalName} />
            <Field label={translate('Smayta.driver.taxId')} value={taxId} onChangeText={setTaxId} autoCapitalize='characters' />
            <Field label={translate('Smayta.driver.address')} value={address} onChangeText={setAddress} />
            <XStack space='$2'>
                <YStack flex={1}>
                    <Field label={translate('Smayta.driver.postalCode')} value={postalCode} onChangeText={setPostalCode} keyboardType='number-pad' />
                </YStack>
                <YStack flex={2}>
                    <Field label={translate('Smayta.driver.city')} value={city} onChangeText={setCity} />
                </YStack>
            </XStack>
            <Field label={translate('Smayta.driver.province')} value={province} onChangeText={setProvince} />
            <Field label={translate('Smayta.driver.holder')} value={holder} onChangeText={setHolder} />
            <Field
                label={translate('Smayta.driver.iban')}
                hint={me.iban_hint ? translate('Smayta.driver.ibanSaved', { last: me.iban_hint }) : undefined}
                value={iban}
                onChangeText={setIban}
                autoCapitalize='characters'
                placeholder={me.country === 'DZ' ? 'RIB' : 'ES00 0000 0000 0000 0000 0000'}
            />
            <BigButton title={translate('Smayta.driver.save')} onPress={save} loading={busy} />
        </YStack>
    );
};

export default SmaytaDriverScreen;
