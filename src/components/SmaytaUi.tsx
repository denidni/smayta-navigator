import React from 'react';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Button, Input, Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { showActionSheet, resizePhoto } from '../utils';
import { translate } from '../utils/localize';
import { SmaytaApiError, type PhotoFile } from '../utils/smayta-api';

/** Mensaje para el conductor a partir de un error de la API de Smayta. */
export function smaytaErrorMessage(err: unknown): string {
    if (err instanceof SmaytaApiError) {
        if (err.status === 0) return translate('Smayta.errors.network');
        if (err.status === 401) return translate('Smayta.errors.session');
        if (err.status === 429) return translate('Smayta.errors.tooMany');
        // NIN argelino (docs/identidad.md del repo de Smayta): la API manda un código.
        if (err.message.startsWith('SMAYTA_DZ_NIN_FALTA')) return translate('Smayta.errors.ninMissing');
        if (err.message.startsWith('SMAYTA_DZ_NIN_')) return translate('Smayta.errors.ninFormat');
        return err.message;
    }
    return translate('Smayta.errors.generic');
}

/**
 * Hacer una foto o elegirla de la galería, reducida para subirla (las fotos
 * de documentos pueden pesar hasta 5 MB). `front` abre la cámara delantera (selfie).
 */
export function pickPhoto({ name, front = false, cameraOnly = false }: { name: string; front?: boolean; cameraOnly?: boolean }): Promise<PhotoFile | null> {
    return new Promise((resolve) => {
        const handle = async (response: any) => {
            const asset = response?.assets?.[0];
            if (!asset?.uri) return resolve(null);
            let uri = asset.uri;
            try {
                uri = await resizePhoto(asset.uri, 1800);
            } catch {
                uri = asset.uri;
            }
            resolve({ uri, name: `${name}.jpg`, type: 'image/jpeg' });
        };
        const camera = () => launchCamera({ mediaType: 'photo', cameraType: front ? 'front' : 'back', saveToPhotos: false, quality: 0.8 }, handle);
        if (cameraOnly) return camera();
        const options = [translate('Smayta.photo.camera'), translate('Smayta.photo.gallery'), translate('common.cancel')];
        showActionSheet({
            options,
            cancelButtonIndex: 2,
            onSelect: (index) => {
                if (index === 0) return camera();
                if (index === 1) return launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 }, handle);
                resolve(null);
            },
        });
    });
}

export const Field = ({ label, hint, ...props }: { label: string; hint?: string } & React.ComponentProps<typeof Input>) => (
    <YStack space='$1'>
        <Text color='$textSecondary' fontSize='$3' fontWeight='bold'>
            {label}
        </Text>
        <Input size='$5' bg='$surface' color='$textPrimary' borderColor='$borderColor' {...props} />
        {!!hint && (
            <Text color='$textSecondary' fontSize='$2'>
                {hint}
            </Text>
        )}
    </YStack>
);

export const BigButton = ({
    title,
    onPress,
    loading = false,
    disabled = false,
    tone = 'success',
}: {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    tone?: 'success' | 'info' | 'error';
}) => {
    const theme = useTheme();
    return (
        <Button height={56} bg={`$${tone}`} borderWidth={1} borderColor={`$${tone}Border`} onPress={onPress} disabled={disabled || loading} opacity={disabled ? 0.5 : 1}>
            {loading && (
                <Button.Icon>
                    <Spinner color={theme[`${tone}Text`]?.val} />
                </Button.Icon>
            )}
            <Button.Text color={`$${tone}Text`} fontSize='$5' fontWeight='bold'>
                {title}
            </Button.Text>
        </Button>
    );
};

export const Card = ({ children, tone }: { children: React.ReactNode; tone?: 'warning' | 'info' | 'success' | 'error' }) => (
    <YStack borderWidth={1} borderColor={tone ? `$${tone}Border` : '$borderColor'} bg={tone ? `$${tone}` : '$surface'} borderRadius='$4' p='$3' space='$2'>
        {children}
    </YStack>
);

export const Chips = <T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void }) => (
    <XStack flexWrap='wrap' gap='$2'>
        {options.map((o) => (
            <Button
                key={o.value}
                size='$4'
                bg={value === o.value ? '$primary' : '$surface'}
                borderWidth={1}
                borderColor={value === o.value ? '$primary' : '$borderColor'}
                onPress={() => onChange(o.value)}
            >
                <Button.Text color={value === o.value ? '$white' : '$textPrimary'} fontWeight='bold'>
                    {o.label}
                </Button.Text>
            </Button>
        ))}
    </XStack>
);
