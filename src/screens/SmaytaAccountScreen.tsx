import React, { useCallback, useState } from 'react';
import { Linking, RefreshControl, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Separator, Spinner, Text, XStack, YStack } from 'tamagui';
import { translate } from '../utils/localize';
import { toast } from '../utils/toast';
import { smayta, getSmaytaToken, smaytaWebUrl, type MiTransportista, type Cartera } from '../utils/smayta-api';
import { formatMoney } from '../utils/smayta-order';
import { BigButton, Card, Field, smaytaErrorMessage } from '../components/SmaytaUi';

/**
 * «Mi cuenta Smayta» en la app del conductor: entrar o crear la cuenta (la
 * misma de smayta.es) y, con ella, el alta de conductor, los documentos, la
 * verificación de identidad y el saldo.
 */
const SmaytaAccountScreen = ({ route }) => {
    const navigation = useNavigation();
    const goal = route?.params?.goal as 'signup' | 'wallet' | undefined;
    const [token, setToken] = useState(getSmaytaToken());
    const [loading, setLoading] = useState(false);
    const [me, setMe] = useState<any>(null);
    const [driver, setDriver] = useState<MiTransportista | null>(null);
    const [cartera, setCartera] = useState<Cartera | null>(null);

    const load = useCallback(async () => {
        if (!getSmaytaToken()) return;
        setLoading(true);
        try {
            const [customer, transportista] = await Promise.all([smayta.me(), smayta.transportista()]);
            setMe(customer);
            setDriver(transportista);
            setCartera(await smayta.cartera().catch(() => null));
        } catch (err) {
            toast.error(smaytaErrorMessage(err));
            setToken(getSmaytaToken());
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            setToken(getSmaytaToken());
            load();
        }, [load])
    );

    const onLoggedIn = async () => {
        setToken(getSmaytaToken());
        await load();
        if (goal === 'wallet') navigation.navigate('SmaytaWallet');
        if (goal === 'signup') navigation.navigate('SmaytaDriver');
    };

    if (!token) return <SignIn onDone={onLoggedIn} />;

    const wallet = cartera?.wallet;
    const balances = cartera?.driver?.balances ?? [];

    return (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
            <YStack p='$4' space='$4'>
                <YStack>
                    <Text color='$textSecondary' fontSize='$3'>
                        {translate('Smayta.account.signedInAs')}
                    </Text>
                    <Text color='$textPrimary' fontSize='$6' fontWeight='bold'>
                        {me ? [me.first_name, me.last_name].filter(Boolean).join(' ') || me.email : '…'}
                    </Text>
                    {me?.email && <Text color='$textSecondary'>{me.email}</Text>}
                </YStack>

                <Card tone={driver?.status === 'active' ? 'success' : driver ? 'warning' : 'info'}>
                    <Text color='$textPrimary' fontSize='$5' fontWeight='bold'>
                        {translate('Smayta.account.driverTitle')}
                    </Text>
                    <Text color='$textPrimary'>
                        {!driver
                            ? translate('Smayta.account.driverNone')
                            : driver.status === 'active'
                              ? translate(driver.driver_app ? 'Smayta.account.driverActive' : 'Smayta.account.driverActiveNoApp')
                              : driver.status === 'suspended'
                                ? translate('Smayta.account.driverSuspended')
                                : translate('Smayta.account.driverPending', { count: driver.missing_documents.length })}
                    </Text>
                    <BigButton tone='info' title={translate(driver ? 'Smayta.account.openDriver' : 'Smayta.account.startSignup')} onPress={() => navigation.navigate('SmaytaDriver')} />
                </Card>

                <Card>
                    <Text color='$textPrimary' fontSize='$5' fontWeight='bold'>
                        {translate('Smayta.wallet.title')}
                    </Text>
                    {wallet?.enabled && (
                        <Text color='$textPrimary' fontSize='$8' fontWeight='bold'>
                            {formatMoney(wallet.balance, wallet.currency_code.toUpperCase())}
                        </Text>
                    )}
                    {balances.map((b) => (
                        <XStack key={b.currency_code} justifyContent='space-between'>
                            <Text color='$textSecondary'>{translate('Smayta.wallet.earnedAvailable')}</Text>
                            <Text color='$textPrimary' fontWeight='bold'>
                                {formatMoney(b.available, b.currency_code.toUpperCase())}
                            </Text>
                        </XStack>
                    ))}
                    <BigButton tone='info' title={translate('Smayta.wallet.open')} onPress={() => navigation.navigate('SmaytaWallet')} />
                </Card>

                <Separator />
                <Button
                    bg='transparent'
                    onPress={() => {
                        smayta.logout();
                        setToken(null);
                        setMe(null);
                        setDriver(null);
                        setCartera(null);
                    }}
                >
                    <Button.Text color='$errorText'>{translate('Smayta.account.signOut')}</Button.Text>
                </Button>
            </YStack>
        </ScrollView>
    );
};

const SignIn = ({ onDone }: { onDone: () => void }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [busy, setBusy] = useState(false);
    const isRegister = mode === 'register';
    const ready =
        /\S+@\S+\.\S+/.test(email.trim()) && password.length >= (isRegister ? 8 : 1) && (!isRegister || (firstName.trim() && lastName.trim() && /^\+?[0-9 ]{6,20}$/.test(phone.trim())));

    const submit = async () => {
        setBusy(true);
        try {
            if (isRegister) {
                await smayta.register({ email, password, first_name: firstName, last_name: lastName, phone });
            } else {
                await smayta.login(email, password);
            }
            onDone();
        } catch (err) {
            toast.error(isRegister ? smaytaErrorMessage(err) : translate('Smayta.errors.login'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps='handled'>
            <YStack p='$4' space='$3'>
                <Text color='$textPrimary' fontSize='$8' fontWeight='bold'>
                    {translate(isRegister ? 'Smayta.account.registerTitle' : 'Smayta.account.loginTitle')}
                </Text>
                <Text color='$textSecondary' fontSize='$4'>
                    {translate('Smayta.account.sameAccount')}
                </Text>
                {isRegister && (
                    <>
                        <Field label={translate('Smayta.account.firstName')} value={firstName} onChangeText={setFirstName} autoComplete='given-name' />
                        <Field label={translate('Smayta.account.lastName')} value={lastName} onChangeText={setLastName} autoComplete='family-name' />
                        <Field
                            label={translate('Smayta.account.phone')}
                            hint={translate('Smayta.account.phoneHint')}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType='phone-pad'
                            autoComplete='tel'
                            placeholder='+34 600 000 000'
                        />
                    </>
                )}
                <Field label={translate('Smayta.account.email')} value={email} onChangeText={setEmail} keyboardType='email-address' autoCapitalize='none' autoComplete='email' />
                <Field
                    label={translate('Smayta.account.password')}
                    hint={isRegister ? translate('Smayta.account.passwordHint') : undefined}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize='none'
                />
                <BigButton title={translate(isRegister ? 'Smayta.account.register' : 'Smayta.account.login')} onPress={submit} loading={busy} disabled={!ready} />
                <Button bg='transparent' onPress={() => setMode(isRegister ? 'login' : 'register')}>
                    <Button.Text color='$textPrimary' textDecorationLine='underline'>
                        {translate(isRegister ? 'Smayta.account.haveAccount' : 'Smayta.account.noAccount')}
                    </Button.Text>
                </Button>
                {!isRegister && (
                    <Button bg='transparent' onPress={() => Linking.openURL(`${smaytaWebUrl()}/es/reset-password`)}>
                        <Button.Text color='$textSecondary'>{translate('Smayta.account.forgotPassword')}</Button.Text>
                    </Button>
                )}
                {busy && <Spinner />}
            </YStack>
        </ScrollView>
    );
};

export default SmaytaAccountScreen;
