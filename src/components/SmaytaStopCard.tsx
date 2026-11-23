import React from 'react';
import { Button, Text, XStack, YStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faDiamondTurnRight, faPhone, faQrcode, faMoneyBillWave, faBoxOpen, faHouseFlag, faLocationDot, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { translate } from '../utils/localize';
import { type CashToCollect, type StopKind, formatMoney } from '../utils/smayta-order';

const attr = (place: any, key: string) => (typeof place?.getAttribute === 'function' ? place.getAttribute(key) : place?.[key]);

const KIND_ICON = { pickup: faBoxOpen, dropoff: faHouseFlag, stop: faLocationDot };
const KIND_TITLE = { pickup: 'Smayta.nowPickup', dropoff: 'Smayta.nowDropoff', stop: 'Smayta.nowStop' };

type Props = {
    destination: any;
    kind: StopKind;
    phone: string | null;
    cash: CashToCollect | null;
    scanned: boolean;
    onNavigate: () => void;
    onChangeNavigationApp: () => void;
    onCall: () => void;
    onScan: () => void;
};

/**
 * Smayta Transporte: la parada a la que va el conductor, grande y clara,
 * con los botones que usa en la calle (navegar, llamar, escanear) y lo que
 * tiene que cobrar en efectivo.
 */
const SmaytaStopCard = ({ destination, kind, phone, cash, scanned, onNavigate, onChangeNavigationApp, onCall, onScan }: Props) => {
    const theme = useTheme();
    const name = attr(destination, 'name');
    const address = attr(destination, 'address') || [attr(destination, 'street1'), attr(destination, 'city')].filter(Boolean).join(', ');

    return (
        <YStack space='$3'>
            <YStack borderWidth={1} borderColor='$borderColor' borderRadius='$4' bg='$surface' p='$3' space='$1'>
                <XStack alignItems='center' space='$2'>
                    <FontAwesomeIcon icon={KIND_ICON[kind]} color={theme['$primary']?.val ?? theme.textPrimary.val} size={18} />
                    <Text color='$textSecondary' fontSize='$4' fontWeight='bold' textTransform='uppercase'>
                        {translate(KIND_TITLE[kind])}
                    </Text>
                </XStack>
                {!!name && (
                    <Text color='$textPrimary' fontSize='$7' fontWeight='bold'>
                        {name}
                    </Text>
                )}
                <Text color='$textPrimary' fontSize='$5'>
                    {address}
                </Text>
            </YStack>

            {cash && kind !== 'pickup' && (
                <XStack alignItems='center' space='$3' bg='$warning' borderWidth={1} borderColor='$warningBorder' borderRadius='$4' p='$3'>
                    <FontAwesomeIcon icon={faMoneyBillWave} color={theme.warningText.val} size={28} />
                    <YStack flex={1}>
                        <Text color='$warningText' fontSize='$4' fontWeight='bold'>
                            {translate('Smayta.collectCash')}
                        </Text>
                        <Text color='$warningText' fontSize='$9' fontWeight='bold'>
                            {formatMoney(cash.amount, cash.currency)}
                        </Text>
                    </YStack>
                </XStack>
            )}
            {cash && kind === 'pickup' && (
                <XStack alignItems='center' space='$2' bg='$info' borderWidth={1} borderColor='$infoBorder' borderRadius='$4' p='$3'>
                    <FontAwesomeIcon icon={faMoneyBillWave} color={theme.infoText.val} />
                    <Text color='$infoText' fontSize='$4' flex={1}>
                        {translate('Smayta.cashAtDropoff', { amount: formatMoney(cash.amount, cash.currency) })}
                    </Text>
                </XStack>
            )}

            <XStack space='$2'>
                <Button flex={1} height={64} bg='$info' borderWidth={1} borderColor='$infoBorder' onPress={onNavigate} onLongPress={onChangeNavigationApp} flexDirection='column'>
                    <FontAwesomeIcon icon={faDiamondTurnRight} color={theme.infoText.val} size={22} />
                    <Text color='$infoText' fontWeight='bold' fontSize='$4' mt='$1'>
                        {translate('Smayta.navigate')}
                    </Text>
                </Button>
                <Button flex={1} height={64} bg='$info' borderWidth={1} borderColor='$infoBorder' onPress={onCall} disabled={!phone} opacity={phone ? 1 : 0.5} flexDirection='column'>
                    <FontAwesomeIcon icon={faPhone} color={theme.infoText.val} size={22} />
                    <Text color='$infoText' fontWeight='bold' fontSize='$4' mt='$1'>
                        {translate('Smayta.call')}
                    </Text>
                </Button>
                <Button
                    flex={1}
                    height={64}
                    bg={scanned ? '$success' : '$info'}
                    borderWidth={1}
                    borderColor={scanned ? '$successBorder' : '$infoBorder'}
                    onPress={onScan}
                    flexDirection='column'
                >
                    <FontAwesomeIcon icon={scanned ? faCircleCheck : faQrcode} color={scanned ? theme.successText.val : theme.infoText.val} size={22} />
                    <Text color={scanned ? '$successText' : '$infoText'} fontWeight='bold' fontSize='$4' mt='$1'>
                        {translate(scanned ? 'Smayta.scanned' : 'Smayta.scan')}
                    </Text>
                </Button>
            </XStack>
            <Text color='$textSecondary' fontSize='$2'>
                {translate('Smayta.navigateHint')}
            </Text>
        </YStack>
    );
};

export default SmaytaStopCard;
