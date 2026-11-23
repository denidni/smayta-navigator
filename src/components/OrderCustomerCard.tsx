import { YStack, XStack, Text, Avatar, Separator, Button, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { Linking } from 'react-native';
import { faPhone, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { callPhone, openWhatsApp } from '../utils/smayta-order';
import FastImage from 'react-native-fast-image';

import { translate } from '../utils/localize';
const OrderCustomerCard = ({ customer }) => {
    const theme = useTheme();

    return (
        <YStack space='$2' borderWidth={1} borderColor='$borderColor' borderRadius='$4'>
            <YStack px='$3' py='$2'>
                <XStack space='$3'>
                    <YStack justifyContent='center'>
                        <Avatar size={30} circular>
                            <Avatar.Image src={customer.photo_url} />
                        </Avatar>
                    </YStack>
                    <YStack>
                        <Text color='$textPrimary' fontWeight='bold' mb='$1'>
                            {customer.name}
                        </Text>
                        <YStack>
                            {customer.phone && <Text color='$textSecondary'>{customer.phone}</Text>}
                            {customer.email && <Text color='$textSecondary'>{customer.email}</Text>}
                        </YStack>
                    </YStack>
                </XStack>
            </YStack>
            <Separator />
            <YStack px='$3' py='$2'>
                <XStack space='$3'>
                    <Button
                        bg='$info'
                        size='$4'
                        borderWidth={1}
                        borderColor='$infoBorder'
                        disabled={!customer.phone}
                        opacity={customer.phone ? 1 : 0.5}
                        onPress={() => callPhone(customer.phone)}
                    >
                        <Button.Icon>
                            <FontAwesomeIcon icon={faPhone} color={theme.infoText.val} />
                        </Button.Icon>
                        <Button.Text color='$infoText'>{translate('OrderCustomerCard.call')}</Button.Text>
                    </Button>
                    <Button
                        bg='$info'
                        size='$4'
                        borderWidth={1}
                        borderColor='$infoBorder'
                        disabled={!customer.email}
                        opacity={customer.email ? 1 : 0.5}
                        onPress={() => customer.email && Linking.openURL(`mailto:${customer.email}`)}
                    >
                        <Button.Icon>
                            <FontAwesomeIcon icon={faEnvelope} color={theme.infoText.val} />
                        </Button.Icon>
                        <Button.Text color='$infoText'>{translate('OrderCustomerCard.email')}</Button.Text>
                    </Button>
                    <Button
                        bg='$info'
                        size='$4'
                        borderWidth={1}
                        borderColor='$infoBorder'
                        disabled={!customer.phone}
                        opacity={customer.phone ? 1 : 0.5}
                        onPress={() => openWhatsApp(customer.phone)}
                    >
                        <Button.Icon>
                            <FontAwesomeIcon icon={faWhatsapp} color={theme.infoText.val} />
                        </Button.Icon>
                        <Button.Text color='$infoText'>WhatsApp</Button.Text>
                    </Button>
                </XStack>
            </YStack>
        </YStack>
    );
};

export default OrderCustomerCard;
