module.exports = {
    dependencies: {
        // Smayta Transporte: en Android el GPS en segundo plano es propio y libre (no hace falta la licencia de pago).
        // En iOS se sigue usando este plugin, que allí es gratuito.
        'react-native-background-geolocation': {
            platforms: {
                android: null,
            },
        },
        '@bam.tech/react-native-image-resizer': {
            platforms: {
                android: {
                    libraryName: null,
                    componentDescriptors: null,
                    cmakeListsPath: null,
                },
            },
        },
        '@react-native-community/blur': {
            platforms: {
                android: {
                    libraryName: null,
                    componentDescriptors: null,
                    cmakeListsPath: null,
                },
            },
        },
    },
};
