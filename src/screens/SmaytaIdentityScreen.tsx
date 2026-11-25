import React, { useState } from 'react';
import { Image, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Checkbox, Text, XStack, YStack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { translate } from '../utils/localize';
import { toast } from '../utils/toast';
import { smayta, type PhotoFile } from '../utils/smayta-api';
import { BigButton, Card, Chips, Field, pickPhoto, smaytaErrorMessage } from '../components/SmaytaUi';

/** Documentos que acepta Smayta según el país del documento (docs/identidad.md del repo de Smayta). */
const DOCUMENT_TYPES: Record<string, string[]> = { ES: ['dni', 'nie', 'passport'], DZ: ['cni', 'passport'] };
/** Países en los que hay que escribir el número de identificación nacional (NIN argelino, 18 cifras). */
const NIN_COUNTRIES = ['DZ'];

/**
 * Verificación de identidad: foto del documento (por las dos caras, salvo el
 * pasaporte) y un selfie. Una persona de Smayta la revisa; las fotos van
 * cifradas y se borran en los plazos de docs/identidad.md.
 */
const SmaytaIdentityScreen = ({ route }) => {
    const navigation = useNavigation();
    const [country, setCountry] = useState<string>(route?.params?.country === 'DZ' ? 'DZ' : 'ES');
    const types = DOCUMENT_TYPES[country];
    const [documentType, setDocumentType] = useState<string>(types[0]);
    const [front, setFront] = useState<PhotoFile | null>(null);
    const [back, setBack] = useState<PhotoFile | null>(null);
    const [selfie, setSelfie] = useState<PhotoFile | null>(null);
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [nin, setNin] = useState('');
    const needsBack = documentType !== 'passport';
    const askNin = NIN_COUNTRIES.includes(country);
    const ninDigits = nin.replace(/[\s.-]/g, '');
    const ninOk = !askNin || /^\d{18}$/.test(ninDigits);
    const ready = front && (!needsBack || back) && selfie && consent && ninOk;

    const changeCountry = (c: string) => {
        setCountry(c);
        setDocumentType(DOCUMENT_TYPES[c][0]);
    };

    const submit = async () => {
        setBusy(true);
        try {
            await smayta.submitIdentity({ country, document_type: documentType, nin: askNin ? ninDigits : null, front: front!, back: needsBack ? back : null, selfie: selfie! });
            toast.success(translate('Smayta.identity.sent'));
            navigation.goBack();
        } catch (err) {
            toast.error(smaytaErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const PhotoStep = ({ label, photo, onPick }: { label: string; photo: PhotoFile | null; onPick: () => void }) => (
        <Card tone={photo ? 'success' : undefined}>
            <Text color='$textPrimary' fontWeight='bold'>
                {label}
            </Text>
            {photo && <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 160, borderRadius: 8 }} resizeMode='contain' />}
            <BigButton tone='info' title={translate(photo ? 'Smayta.identity.retake' : 'Smayta.identity.take')} onPress={onPick} />
        </Card>
    );

    return (
        <ScrollView style={{ flex: 1 }}>
            <YStack p='$4' space='$3'>
                <Text color='$textPrimary' fontSize='$8' fontWeight='bold'>
                    {translate('Smayta.identity.title')}
                </Text>
                <Text color='$textSecondary'>{translate('Smayta.identity.intro')}</Text>

                <Text color='$textSecondary' fontSize='$3' fontWeight='bold'>
                    {translate('Smayta.identity.country')}
                </Text>
                <Chips
                    options={[
                        { value: 'ES', label: translate('Smayta.driver.countryES') },
                        { value: 'DZ', label: translate('Smayta.driver.countryDZ') },
                    ]}
                    value={country}
                    onChange={changeCountry}
                />
                <Text color='$textSecondary' fontSize='$3' fontWeight='bold'>
                    {translate('Smayta.identity.documentType')}
                </Text>
                <Chips options={types.map((t) => ({ value: t, label: translate(`Smayta.identity.types.${t}`) }))} value={documentType} onChange={setDocumentType} />

                {askNin && (
                    <Field
                        label={translate('Smayta.identity.nin')}
                        hint={translate(nin.length > 0 && !ninOk ? 'Smayta.identity.ninInvalid' : 'Smayta.identity.ninHint')}
                        value={nin}
                        onChangeText={setNin}
                        keyboardType='number-pad'
                        maxLength={24}
                        placeholder='000000000000000000'
                        autoCorrect={false}
                    />
                )}

                <PhotoStep
                    label={translate(needsBack ? 'Smayta.identity.front' : 'Smayta.identity.passportPage')}
                    photo={front}
                    onPick={async () => setFront((await pickPhoto({ name: 'front' })) ?? front)}
                />
                {needsBack && <PhotoStep label={translate('Smayta.identity.back')} photo={back} onPick={async () => setBack((await pickPhoto({ name: 'back' })) ?? back)} />}
                <PhotoStep
                    label={translate('Smayta.identity.selfie')}
                    photo={selfie}
                    onPick={async () => setSelfie((await pickPhoto({ name: 'selfie', front: true, cameraOnly: true })) ?? selfie)}
                />

                <XStack alignItems='center' space='$3'>
                    <Checkbox size='$5' checked={consent} onCheckedChange={(v) => setConsent(v === true)}>
                        <Checkbox.Indicator>
                            <FontAwesomeIcon icon={faCheck} />
                        </Checkbox.Indicator>
                    </Checkbox>
                    <Text color='$textPrimary' flex={1} onPress={() => setConsent(!consent)}>
                        {translate('Smayta.identity.consent')}
                    </Text>
                </XStack>
                <BigButton title={translate('Smayta.identity.send')} onPress={submit} loading={busy} disabled={!ready} />
            </YStack>
        </ScrollView>
    );
};

export default SmaytaIdentityScreen;
