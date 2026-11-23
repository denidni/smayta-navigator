import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FlatList, TextInput, Keyboard } from 'react-native';
import { countries, getEmojiFlag } from 'countries-list';
import BottomSheet, { BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useTheme, View, Text, Button, XStack, YStack, Input } from 'tamagui';
import { Portal } from '@gorhom/portal';
import { getCountryByPhoneCode, getCountryByISO2, parsePhoneNumber, debounce, config, toArray } from '../utils';
import useAppTheme from '../hooks/use-app-theme';

import { translate, getLocale } from '../utils/localize';

// País inicial y países que van primero en la lista; se pueden cambiar en el .env.
const DEFAULT_COUNTRY = String(config('DEFAULT_COUNTRY', 'ES') || 'ES').toUpperCase();
const PRIORITY_COUNTRIES = toArray(config('PRIORITY_COUNTRIES', 'ES,DZ'))
    .map((code) => String(code).trim().toUpperCase())
    .filter((code) => code && countries[code]);

// Nombre del país en el idioma de la app si el motor JS lo permite; si no, en inglés.
function getCountryDisplayName(code, fallbackName, locale) {
    try {
        if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
            const name = new Intl.DisplayNames([locale], { type: 'region' }).of(code);
            if (name && name !== code) {
                return name;
            }
        }
    } catch (error) {
        // Sin soporte de Intl.DisplayNames: se usa el nombre en inglés.
    }
    return fallbackName;
}

function buildCountryList(locale) {
    const list = Object.entries(countries).map(([code, details]) => ({
        code,
        name: getCountryDisplayName(code, details.name, locale),
        englishName: details.name,
        nativeName: details.native,
        phone: details.phone[0],
        emoji: getEmojiFlag(code),
    }));
    const priority = PRIORITY_COUNTRIES.map((code) => list.find((country) => country.code === code)).filter(Boolean);
    const rest = list.filter((country) => !PRIORITY_COUNTRIES.includes(country.code)).sort((a, b) => a.name.localeCompare(b.name, locale));
    return [...priority, ...rest];
}

function getDefaultValues(value = null, fallbackCountry = DEFAULT_COUNTRY) {
    if (typeof value === 'string' && value.startsWith('+')) {
        const segments = parsePhoneNumber(value);
        return {
            phoneNumber: segments.localNumber ?? '',
            ...segments,
        };
    }

    const country = getCountryByISO2(fallbackCountry);
    return {
        phoneNumber: '',
        country,
    };
}

const PhoneInput = ({ value, onChange, bg, width = '100%', defaultCountryCode = DEFAULT_COUNTRY, size = '$5', wrapperProps = {} }) => {
    const defaultValue = getDefaultValues(value, defaultCountryCode);
    const theme = useTheme();
    const { isDarkMode } = useAppTheme();
    const [selectedCountry, setSelectedCountry] = useState(defaultValue.country);
    const [phoneNumber, setPhoneNumber] = useState(defaultValue.phoneNumber);
    const [searchTerm, setSearchTerm] = useState('');
    const bottomSheetRef = useRef<BottomSheet>(null);
    const phoneInputRef = useRef(null);
    const searchInputRef = useRef(null);
    const snapPoints = useMemo(() => ['50%', '75%'], []);
    const backgroundColor = bg ? bg : isDarkMode ? '$surface' : '$gray-200';

    const locale = getLocale();
    const countryList = useMemo(() => buildCountryList(locale), [locale]);

    const filteredCountries = useMemo(() => {
        const lowerSearch = searchTerm.trim().toLowerCase().replace(/^\+/, '');
        if (!lowerSearch) {
            return countryList;
        }
        return countryList.filter(({ name, englishName, nativeName, code, phone }) => {
            return (
                name.toLowerCase().includes(lowerSearch) ||
                englishName.toLowerCase().includes(lowerSearch) ||
                String(nativeName ?? '').toLowerCase().includes(lowerSearch) ||
                code.toLowerCase().includes(lowerSearch) ||
                String(phone).startsWith(lowerSearch)
            );
        });
    }, [searchTerm, countryList]);

    const openBottomSheet = () => {
        phoneInputRef.current?.blur();
        bottomSheetRef.current?.collapse();
        searchInputRef.current?.focus();
    };

    const closeBottomSheet = () => {
        Keyboard.dismiss();
        bottomSheetRef.current?.close();
        phoneInputRef.current?.focus();
    };

    const handleInputFocus = () => {
        bottomSheetRef.current?.close();
    };

    const handleCountrySelect = (country: { code: string; phone: string }) => {
        setSelectedCountry(country);
        closeBottomSheet();
    };

    useEffect(() => {
        if (onChange) {
            const combinedValue = `+${selectedCountry.phone}${phoneNumber}`;
            onChange(combinedValue, phoneNumber, selectedCountry);
        }
    }, [selectedCountry, phoneNumber, onChange]);

    return (
        <YStack space='$4' {...wrapperProps}>
            <XStack width='100%' paddingHorizontal={0} shadowOpacity={0} shadowRadius={0} borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$5' bg={backgroundColor}>
                <Button size={size} onPress={openBottomSheet} bg={backgroundColor} borderWidth={0} width={80} maxWidth={80}>
                    <XStack alignItems='center' space='$2'>
                        <Text fontSize={size}>{getEmojiFlag(selectedCountry.code)}</Text>
                        <Text fontSize={size}>+{selectedCountry.phone}</Text>
                    </XStack>
                </Button>
                <Input
                    size={size}
                    ref={phoneInputRef}
                    flex={1}
                    placeholder={translate('PhoneInput.enterPhoneNumber')}
                    keyboardType='phone-pad'
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    onFocus={handleInputFocus}
                    bg={backgroundColor}
                    color='$textPrimary'
                    borderRadius={0}
                    borderTopRightRadius='$3'
                    borderBottomRightRadius='$3'
                    overflow='hidden'
                    placeholderTextColor={isDarkMode ? '$gray-700' : '$gray-400'}
                />
            </XStack>

            <Portal hostName='MainPortal'>
                <BottomSheet
                    ref={bottomSheetRef}
                    index={-1}
                    snapPoints={snapPoints}
                    keyboardBehavior='extend'
                    keyboardBlurBehavior='none'
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    enableOverDrag={false}
                    style={{ flex: 1, width: '100%' }}
                    backgroundStyle={{ backgroundColor: theme.background.val, borderWidth: 1, borderColor: theme.borderColorWithShadow.val }}
                    handleIndicatorStyle={{ backgroundColor: theme.secondary.val }}
                >
                    <YStack px='$2'>
                        <BottomSheetTextInput
                            ref={searchInputRef}
                            placeholder={translate('PhoneInput.searchCountry')}
                            onChangeText={setSearchTerm}
                            autoCapitalize={false}
                            autoComplete='off'
                            autoCorrect={false}
                            style={{
                                color: theme.textPrimary.val,
                                backgroundColor: theme.surface.val,
                                borderWidth: 1,
                                borderColor: theme.borderColor.val,
                                padding: 14,
                                borderRadius: 12,
                                fontSize: 13,
                                marginBottom: 10,
                            }}
                        />
                    </YStack>
                    {/* La lista va directamente dentro del panel: envuelta en BottomSheetView no se puede desplazar. */}
                    <BottomSheetFlatList
                        data={filteredCountries}
                        keyExtractor={(item) => item.code}
                        keyboardShouldPersistTaps='handled'
                        style={{ flex: 1, backgroundColor: theme.background.val, borderColor: theme.borderColorWithShadow.val, borderWidth: 1, borderTopWidth: 0 }}
                        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 24 }}
                        renderItem={({ item }) => (
                            <Button
                                size='$4'
                                onPress={() => handleCountrySelect({ code: item.code, phone: item.phone })}
                                bg='$surface'
                                justifyContent='space-between'
                                space='$2'
                                mb='$2'
                                px='$3'
                                hoverStyle={{
                                    scale: 0.9,
                                    opacity: 0.5,
                                }}
                                pressStyle={{
                                    scale: 0.9,
                                    opacity: 0.5,
                                }}
                            >
                                <XStack alignItems='center' space='$2' flexShrink={1}>
                                    <Text>{item.emoji}</Text>
                                    <Text numberOfLines={1} flexShrink={1}>
                                        {item.name}
                                    </Text>
                                </XStack>
                                <Text>+{item.phone}</Text>
                            </Button>
                        )}
                    />
                </BottomSheet>
            </Portal>
        </YStack>
    );
};

export default PhoneInput;
