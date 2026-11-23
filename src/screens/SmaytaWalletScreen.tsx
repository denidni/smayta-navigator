import React, { useCallback, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Separator, Spinner, Text, XStack, YStack } from 'tamagui';
import { translate, getLocale } from '../utils/localize';
import { toast } from '../utils/toast';
import { smayta, getSmaytaToken, smaytaWebUrl, type Cartera, type MyCash } from '../utils/smayta-api';
import { formatMoney } from '../utils/smayta-order';
import { BigButton, Card, Field, pickPhoto, smaytaErrorMessage } from '../components/SmaytaUi';

const INTL_LOCALE = { es: 'es-ES', en: 'en-GB', fr: 'fr-FR', ar: 'ar-DZ' };
const day = (iso: string) => new Intl.DateTimeFormat(INTL_LOCALE[getLocale()] ?? 'es-ES', { dateStyle: 'medium' }).format(new Date(iso));
const money = (amount: number, currency: string) => formatMoney(amount, currency.toUpperCase());

/**
 * «Mi saldo»: la cartera de la cuenta de Smayta (la misma que en la web, para
 * comprar en Smayta), lo ganado con los viajes, las liquidaciones y el
 * efectivo cobrado que hay que ingresar a Smayta.
 */
const SmaytaWalletScreen = () => {
    const navigation = useNavigation();
    const [data, setData] = useState<Cartera | null>(null);
    const [cash, setCash] = useState<MyCash | null>(null);
    const [loading, setLoading] = useState(false);
    const [moving, setMoving] = useState(false);
    const [code, setCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!getSmaytaToken()) {
            navigation.navigate('SmaytaAccount', { goal: 'wallet' });
            return;
        }
        setLoading(true);
        try {
            const [cartera, efectivo] = await Promise.all([smayta.cartera(), smayta.efectivo().catch(() => null)]);
            setData(cartera);
            setCash(efectivo);
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

    const moveAll = (available: number, currency: string) =>
        Alert.alert(translate('Smayta.wallet.moveTitle'), translate('Smayta.wallet.moveText', { amount: money(available, currency) }), [
            { text: translate('common.cancel'), style: 'cancel' },
            {
                text: translate('Smayta.wallet.moveConfirm'),
                onPress: async () => {
                    setMoving(true);
                    try {
                        await smayta.moveToWallet(null);
                        toast.success(translate('Smayta.wallet.moved'));
                        await load();
                    } catch (err) {
                        toast.error(smaytaErrorMessage(err));
                    } finally {
                        setMoving(false);
                    }
                },
            },
        ]);

    const redeem = async () => {
        setRedeeming(true);
        try {
            await smayta.redeemGiftCard(code);
            setCode('');
            toast.success(translate('Smayta.wallet.redeemed'));
            await load();
        } catch (err) {
            toast.error(smaytaErrorMessage(err));
        } finally {
            setRedeeming(false);
        }
    };

    const uploadReceipt = async (depositId: string) => {
        const photo = await pickPhoto({ name: 'justificante' });
        if (!photo) return;
        setUploading(depositId);
        try {
            await smayta.uploadCashReceipt(depositId, photo);
            toast.success(translate('Smayta.cash.receiptSent'));
            await load();
        } catch (err) {
            toast.error(smaytaErrorMessage(err));
        } finally {
            setUploading(null);
        }
    };

    if (!data) {
        return (
            <YStack flex={1} alignItems='center' justifyContent='center'>
                <Spinner />
            </YStack>
        );
    }

    const wallet = data.wallet;
    const earnings = data.driver;
    const openDeposits = (cash?.deposits ?? []).filter((d) => d.status === 'pending' || d.status === 'review');

    return (
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps='handled' refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
            <YStack p='$4' space='$4'>
                {cash?.blocked && (
                    <Card tone='error'>
                        <Text color='$errorText' fontWeight='bold'>
                            {translate('Smayta.cash.blocked')}
                        </Text>
                    </Card>
                )}

                {wallet && (
                    <Card>
                        <Text color='$textSecondary'>{translate('Smayta.wallet.walletBalance')}</Text>
                        <Text color='$textPrimary' fontSize='$10' fontWeight='bold'>
                            {money(wallet.balance, wallet.currency_code)}
                        </Text>
                        {!!wallet.number_formatted && (
                            <Text color='$textSecondary' fontSize='$3'>
                                {translate('Smayta.wallet.number', { number: wallet.number_formatted })}
                            </Text>
                        )}
                        <Text color='$textSecondary' fontSize='$3'>
                            {translate('Smayta.wallet.spendHint')}
                        </Text>
                        {(wallet.movements ?? []).slice(0, 5).map((m) => (
                            <XStack key={m.id} justifyContent='space-between'>
                                <Text color='$textSecondary' fontSize='$3' flex={1} numberOfLines={1}>
                                    {day(m.created_at)} · {translate(`Smayta.wallet.source.${m.source ?? (m.amount < 0 ? 'purchase' : 'other')}`)}
                                </Text>
                                <Text color={m.amount < 0 ? '$errorText' : '$successText'} fontSize='$3' fontWeight='bold'>
                                    {money(m.amount, wallet.currency_code)}
                                </Text>
                            </XStack>
                        ))}
                    </Card>
                )}

                {earnings ? (
                    earnings.balances.map((b) => (
                        <Card key={b.currency_code} tone='success'>
                            <Text color='$successText'>{translate('Smayta.wallet.earnedAvailable')}</Text>
                            <Text color='$successText' fontSize='$10' fontWeight='bold'>
                                {money(b.available, b.currency_code)}
                            </Text>
                            <Text color='$successText' fontSize='$3'>
                                {translate('Smayta.wallet.earnedDetail', { trips: b.trips, earned: money(b.earned, b.currency_code), charges: money(b.charges, b.currency_code) })}
                            </Text>
                            {b.waiting_cash > 0 && (
                                <Text color='$successText' fontSize='$3'>
                                    {translate('Smayta.wallet.waitingCash', { amount: money(b.waiting_cash, b.currency_code) })}
                                </Text>
                            )}
                            <Text color='$successText' fontSize='$3'>
                                {translate('Smayta.wallet.payoutHint')}
                            </Text>
                            {earnings.wallet_enabled && !earnings.empresa && b.available > 0 && b.currency_code === earnings.wallet_currency && (
                                <BigButton tone='info' title={translate('Smayta.wallet.moveButton')} onPress={() => moveAll(b.available, b.currency_code)} loading={moving} />
                            )}
                        </Card>
                    ))
                ) : (
                    <Card tone='info'>
                        <Text color='$infoText'>{translate('Smayta.wallet.notDriver')}</Text>
                    </Card>
                )}

                {openDeposits.length > 0 && (
                    <YStack space='$2'>
                        <Text color='$textPrimary' fontSize='$6' fontWeight='bold'>
                            {translate('Smayta.cash.title')}
                        </Text>
                        {openDeposits.map((d) => (
                            <Card key={d.id} tone='warning'>
                                <Text color='$warningText' fontSize='$7' fontWeight='bold'>
                                    {money(d.amount, d.currency_code)}
                                </Text>
                                <Text color='$warningText'>{translate('Smayta.cash.deposit', { trips: d.trips, reference: d.reference })}</Text>
                                {(cash?.accounts?.[d.currency_code] ?? []).map((a) => (
                                    <YStack key={a.iban}>
                                        <Text color='$warningText' fontWeight='bold'>
                                            {a.bank_name ?? a.name}
                                        </Text>
                                        <Text color='$warningText' selectable>
                                            {a.iban}
                                        </Text>
                                        <Text color='$warningText' fontSize='$2'>
                                            {a.holder}
                                        </Text>
                                    </YStack>
                                ))}
                                {d.status === 'pending' && !!d.note && <Text color='$warningText'>{d.note}</Text>}
                                {d.status === 'review' ? (
                                    <Text color='$warningText'>{translate('Smayta.cash.receiptReview')}</Text>
                                ) : (
                                    <BigButton tone='info' title={translate('Smayta.cash.uploadReceipt')} onPress={() => uploadReceipt(d.id)} loading={uploading === d.id} />
                                )}
                            </Card>
                        ))}
                    </YStack>
                )}

                {earnings && earnings.payouts.length > 0 && (
                    <YStack space='$2'>
                        <Text color='$textPrimary' fontSize='$6' fontWeight='bold'>
                            {translate('Smayta.wallet.payouts')}
                        </Text>
                        {earnings.payouts.map((p) => (
                            <XStack key={p.id} justifyContent='space-between' py='$2'>
                                <YStack>
                                    <Text color='$textPrimary' fontWeight='bold'>
                                        {p.period}
                                    </Text>
                                    <Text color='$textSecondary' fontSize='$3'>
                                        {translate(p.status === 'paid' ? 'Smayta.wallet.paid' : 'Smayta.wallet.pending')}
                                        {p.paid_at ? ` · ${day(p.paid_at)}` : ''}
                                    </Text>
                                </YStack>
                                <Text color='$textPrimary' fontWeight='bold'>
                                    {money(p.transfer, p.currency_code)}
                                </Text>
                            </XStack>
                        ))}
                    </YStack>
                )}

                <Separator />
                <YStack space='$2'>
                    <Text color='$textPrimary' fontSize='$6' fontWeight='bold'>
                        {translate('Smayta.wallet.giftTitle')}
                    </Text>
                    <Field label={translate('Smayta.wallet.giftCode')} value={code} onChangeText={setCode} autoCapitalize='characters' autoCorrect={false} />
                    <BigButton tone='info' title={translate('Smayta.wallet.redeem')} onPress={redeem} loading={redeeming} disabled={code.trim().length < 6} />
                    <BigButton tone='info' title={translate('Smayta.wallet.topup')} onPress={() => Linking.openURL(`${smaytaWebUrl()}/es/user/balance`)} />
                </YStack>
            </YStack>
        </ScrollView>
    );
};

export default SmaytaWalletScreen;
