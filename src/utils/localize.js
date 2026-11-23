import { getLangNameFromCode } from 'language-name-map';
import { getString } from '../utils/storage';
import { get, navigatorConfig } from '../utils';
import en from '../../translations/en.json';
import es from '../../translations/es.json';
import fr from '../../translations/fr.json';
import ar from '../../translations/ar.json';
import I18n from 'react-native-i18n';

export const translations = {
    es,
    fr,
    ar,
    en,
};

export function getAvailableLocales() {
    const availableLocales = navigatorConfig('availableLocales', ['es', 'fr', 'ar', 'en']);
    return Object.fromEntries(Object.entries(translations).filter(([locale]) => availableLocales.includes(locale)));
}

export function getLocale() {
    return getString('_locale') ?? navigatorConfig('defaultLocale', 'en');
}

export function getLanguage() {
    const locale = getLocale();
    return { code: locale, ...getLangNameFromCode(locale) };
}

export function translate(key, options) {
    return I18n.t(key, options);
}

// Idioma guardado (o el de por defecto) desde el arranque, para los textos que
// se calculan antes de montar LanguageProvider (pestañas, avisos).
I18n.fallbacks = true;
I18n.defaultLocale = 'en';
I18n.translations = { ...I18n.translations, ...getAvailableLocales() };
I18n.locale = getLocale();
