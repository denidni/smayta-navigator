import SmaytaAccountScreen from '../../screens/SmaytaAccountScreen';
import SmaytaDriverScreen from '../../screens/SmaytaDriverScreen';
import SmaytaIdentityScreen from '../../screens/SmaytaIdentityScreen';
import SmaytaWalletScreen from '../../screens/SmaytaWalletScreen';
import { translate } from '../../utils/localize';
import { getTheme } from '../../utils';

/**
 * Smayta Transporte: la cuenta de Smayta del conductor (alta, documentos,
 * identidad y saldo). Se puede abrir sin haber entrado como conductor, para
 * darse de alta, y desde «Cuenta» una vez dentro.
 */
const options = (title: string) => () => ({
    headerShown: true,
    title: translate(title),
    headerBackTitle: '',
    headerStyle: { backgroundColor: getTheme('background') },
    headerTintColor: getTheme('textPrimary'),
    contentStyle: { backgroundColor: getTheme('background') },
});

export const SmaytaAccount = { screen: SmaytaAccountScreen, options: options('Smayta.titles.account') };
export const SmaytaDriver = { screen: SmaytaDriverScreen, options: options('Smayta.titles.driver') };
export const SmaytaIdentity = { screen: SmaytaIdentityScreen, options: options('Smayta.titles.identity') };
export const SmaytaWallet = { screen: SmaytaWalletScreen, options: options('Smayta.titles.wallet') };

export default { SmaytaAccount, SmaytaDriver, SmaytaIdentity, SmaytaWallet };
