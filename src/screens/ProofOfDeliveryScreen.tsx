import { useState, useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Image, Text, YStack, XStack, Spinner, useTheme } from 'tamagui';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCamera, faSignature, faQrcode, faKeyboard } from '@fortawesome/free-solid-svg-icons';
import { translate } from '../utils/localize';
import { saveScan } from '../utils/smayta-order';
import { Order, Place } from '@fleetbase/sdk';
import { titleize } from 'inflected';
import { SectionHeader, SectionInfoLine } from '../components/Content';
import { isNone, resizePhoto } from '../utils';
import { toast } from '../utils/toast';
import { useTempStore } from '../contexts/TempStoreContext';
import useDimensions from '../hooks/use-dimensions';
import useFleetbase from '../hooks/use-fleetbase';
import useAppTheme from '../hooks/use-app-theme';
import QrCodeScanner from '../components/QrCodeScanner';
import CameraCapture from '../components/CameraCapture';
import BackButton from '../components/BackButton';
import CustomHeader from '../components/CustomHeader';
import LoadingOverlay from '../components/LoadingOverlay';
import SignatureCanvas from 'react-native-signature-canvas';

const ProofOfDeliveryScreen = ({ route }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { isDarkMode } = useAppTheme();
    const { adapter } = useFleetbase();
    const { setValue } = useTempStore();
    const { screenWidth, screenHeight } = useDimensions();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingOverlayMessage, setLoadingOverlayMessage] = useState(translate('Smayta.savingProof'));
    const signatureScreenRef = useRef();
    const params = route.params ?? {};
    const activity = params.activity;
    const order = new Order(params.order, adapter);
    const waypoint = new Place(params.waypoint, adapter);
    const entity = params.entity;
    // Smayta: `scanOnly` es el botón «Escanear» de la parada (guarda la prueba para el paso siguiente);
    // si no, el conductor puede elegir firma, foto o código aunque el viaje pida otra.
    const scanOnly = params.scanOnly === true;
    const [chosenMethod, setChosenMethod] = useState(scanOnly ? 'scan' : null);
    const method = chosenMethod;
    const [manualCode, setManualCode] = useState('');
    const [showManual, setShowManual] = useState(false);
    const isWaypointActivity = waypoint && typeof waypoint.getAttribute('tracking') === 'string' && waypoint.getAttribute('tracking').length;
    const subject = entity ?? (isWaypointActivity ? waypoint : order);

    const signatureWebStyle = `.m-signature-pad { box-shadow: none; border: none; }
              .m-signature-pad--body { border: none; }
              .m-signature-pad--footer { position: absolute; bottom: 0; left: 0; right: 0; min-height: 80px; padding-bottom: 2rem; padding-top: 1.75rem; border-top: 1px ${theme['$borderColor'].val} solid; background-color: ${theme['$surface'].val} }
              .m-signature-pad--footer > .button { background-color: 'transparent'; font-size: 0.75rem; color: ${theme['$textPrimary'].val}; }
              .m-signature-pad--footer > .description { font-size: 0.75rem; color: ${theme['$textSecondary'].val}; }
              body,html { width: ${screenWidth}px; height: ${screenHeight}px; }`;

    const handleQrCodeScan = useCallback(
        async (data) => {
            setIsLoading(true);

            try {
                const proof = await order.captureQrCode(subject, { code: data.value, data, waypoint: waypoint?.id });
                if (scanOnly) {
                    saveScan(order.id, waypoint?.id, proof?.id);
                    toast.success(translate('Smayta.codeOk'));
                } else {
                    setValue('proof', { proof, activity, order: order.id, waypoint: waypoint?.id, entity: entity?.id });
                }
                navigation.goBack();
            } catch (err) {
                toast.error(translate('Smayta.codeWrong'));
                console.warn('Error capturing QR code as proof:', err);
            } finally {
                setIsLoading(false);
            }
        },
        [navigation, scanOnly]
    );

    const handleSignatureCompleted = useCallback(
        async (signature) => {
            setIsLoading(true);

            try {
                const proof = await order.captureSignature(subject, { signature });
                setValue('proof', { proof, activity, order: order.id, waypoint: waypoint?.id, entity: entity?.id });
                navigation.goBack();
            } catch (err) {
                toast.error(translate('Smayta.signatureError'));
                console.warn('Error capturing signature as proof:', err);
            } finally {
                setIsLoading(false);
            }
        },
        [navigation]
    );

    const handlePhotosCaptured = useCallback(
        async (photos = []) => {
            setIsLoading(true);

            // Resize all photos first in parallel
            const resizedPhotos = await Promise.all(
                photos.map(async (p) => {
                    const smallUri = await resizePhoto(p.uri);
                    // const smallBase64 = await RNFS.readFile(smallUri, 'base64');
                    // return { uri: smallUri, base64: smallBase64 };

                    return { uri: smallUri };
                })
            );

            const form = new FormData();
            resizedPhotos.forEach((p, i) => {
                form.append(`photos[${i}]`, {
                    uri: p.uri,
                    name: `photo-${i}.jpg`,
                    type: 'image/jpeg',
                });
            });

            try {
                const proof = await adapter.post(`orders/${order.id}/capture-photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
                setValue('proof', { proof, activity, order: order.id, waypoint: waypoint?.id, entity: entity?.id });
                navigation.goBack();
            } catch (err) {
                toast.error(translate('Smayta.photoError'));
                console.warn('Error capturing photos as proof:', err);
            } finally {
                setIsLoading(false);
            }
        },
        [adapter, navigation]
    );

    if (method === 'scan') {
        return (
            <YStack bg='transparent' flex={1}>
                <LoadingOverlay visible={isLoading} text={loadingOverlayMessage} textColor={isDarkMode ? '$textPrimary' : '$white'} />
                <CustomHeader headerTransparent={true} headerShadowVisible={false} headerLeft={<BackButton />} headerLeftStyle={{ paddingLeft: 10 }} />
                <QrCodeScanner onScan={handleQrCodeScan} />
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
                    <YStack p='$4' pb='$6' space='$2' bg='rgba(0,0,0,0.65)'>
                        <Text color='$white' fontSize='$4' textAlign='center'>
                            {translate(scanOnly ? 'Smayta.scanHint' : 'Smayta.scanProofHint')}
                        </Text>
                        {showManual ? (
                            <XStack space='$2'>
                                <Input
                                    flex={1}
                                    size='$5'
                                    value={manualCode}
                                    onChangeText={setManualCode}
                                    autoCapitalize='characters'
                                    autoCorrect={false}
                                    placeholder={translate('Smayta.typeCodePlaceholder')}
                                    bg='$white'
                                    color='$black'
                                />
                                <Button size='$5' bg='$primary' disabled={!manualCode.trim()} onPress={() => handleQrCodeScan({ value: manualCode.trim(), type: 'manual' })}>
                                    <Button.Text color='$white' fontWeight='bold'>
                                        {translate('Smayta.check')}
                                    </Button.Text>
                                </Button>
                            </XStack>
                        ) : (
                            <Button size='$5' bg='$surface' onPress={() => setShowManual(true)}>
                                <Button.Icon>
                                    <FontAwesomeIcon icon={faKeyboard} color={theme.textPrimary.val} />
                                </Button.Icon>
                                <Button.Text color='$textPrimary'>{translate('Smayta.typeCode')}</Button.Text>
                            </Button>
                        )}
                    </YStack>
                </KeyboardAvoidingView>
            </YStack>
        );
    }

    if (method === 'photo') {
        return (
            <YStack bg='transparent' flex={1} position='relative'>
                <LoadingOverlay visible={isLoading} text={loadingOverlayMessage} textColor={isDarkMode ? '$textPrimary' : '$white'} />
                <CustomHeader
                    headerTransparent={true}
                    headerShadowVisible={false}
                    headerLeft={<BackButton />}
                    headerLeftStyle={{ paddingLeft: 10 }}
                    headerStyle={{ position: 'absolute', top: 0, left: 0, right: 0 }}
                />
                <CameraCapture onDone={handlePhotosCaptured} />
            </YStack>
        );
    }

    if (method === 'signature') {
        return (
            <YStack bg='$white' flex={1}>
                <LoadingOverlay visible={isLoading} text={loadingOverlayMessage} textColor={isDarkMode ? '$textPrimary' : '$white'} />
                <CustomHeader headerTransparent={true} headerShadowVisible={false} headerLeft={<BackButton />} headerLeftStyle={{ paddingLeft: 10 }} />
                <SignatureCanvas
                    ref={signatureScreenRef}
                    onOK={handleSignatureCompleted}
                    backgroundColor={'white'}
                    style={{ backgroundColor: 'white', flex: 1, width: '100%', height: '100%' }}
                    webStyle={signatureWebStyle}
                />
            </YStack>
        );
    }

    // Elegir la prueba: la que pide el viaje va primero.
    const requested = activity?.pod_method ?? order.getAttribute('pod_method');
    const methods = [
        { value: 'signature', icon: faSignature, label: 'Smayta.pod.signatureLong' },
        { value: 'photo', icon: faCamera, label: 'Smayta.pod.photoLong' },
        { value: 'scan', icon: faQrcode, label: 'Smayta.pod.scanLong' },
    ].sort((a, b) => (a.value === requested ? -1 : b.value === requested ? 1 : 0));

    return (
        <YStack flex={1} bg='$background'>
            <CustomHeader headerShadowVisible={false} headerLeft={<BackButton />} headerLeftStyle={{ paddingLeft: 10 }} />
            <YStack p='$4' space='$3'>
                <Text color='$textPrimary' fontSize='$7' fontWeight='bold'>
                    {translate('Smayta.chooseProof')}
                </Text>
                <Text color='$textSecondary' fontSize='$4'>
                    {translate('Smayta.chooseProofHint')}
                </Text>
                {methods.map((m) => (
                    <Button
                        key={m.value}
                        height={64}
                        bg={m.value === requested ? '$success' : '$info'}
                        borderWidth={1}
                        borderColor={m.value === requested ? '$successBorder' : '$infoBorder'}
                        onPress={() => setChosenMethod(m.value)}
                        justifyContent='flex-start'
                    >
                        <Button.Icon>
                            <FontAwesomeIcon icon={m.icon} color={m.value === requested ? theme.successText.val : theme.infoText.val} size={22} />
                        </Button.Icon>
                        <Button.Text color={m.value === requested ? '$successText' : '$infoText'} fontSize='$5' fontWeight='bold'>
                            {translate(m.label)}
                        </Button.Text>
                    </Button>
                ))}
            </YStack>
        </YStack>
    );
};

export default ProofOfDeliveryScreen;
