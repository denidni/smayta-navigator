import React, { useEffect, useRef, useState } from 'react';
import { Polyline } from 'react-native-maps';
import axios from 'axios';

// Smayta Transporte: ruta con la Routes API de Google.
// Sustituye a react-native-maps-directions, que usa la Directions API antigua:
// Google ya no deja activarla en proyectos nuevos de Google Cloud.

type LatLng = { latitude: number; longitude: number };

type Props = {
    origin: LatLng;
    destination: LatLng;
    waypoints?: LatLng[];
    apikey?: string;
    strokeWidth?: number;
    strokeColor?: string;
    onReady?: (result: { coordinates: LatLng[] }) => void;
};

// Decodifica una polilínea codificada de Google (algoritmo estándar, precisión 1e5).
export const decodePolyline = (encoded: string): LatLng[] => {
    const points: LatLng[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        for (const eje of ['lat', 'lng']) {
            let shift = 0;
            let result = 0;
            let byte;
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20 && index < encoded.length);
            const delta = result & 1 ? ~(result >> 1) : result >> 1;
            if (eje === 'lat') {
                lat += delta;
            } else {
                lng += delta;
            }
        }
        points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }

    return points;
};

const toWaypoint = ({ latitude, longitude }: LatLng) => ({ location: { latLng: { latitude, longitude } } });

const valid = (point?: LatLng) => !!point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude);

const RouteDirections = ({ origin, destination, waypoints = [], apikey, strokeWidth = 4, strokeColor, onReady }: Props) => {
    const [coordinates, setCoordinates] = useState<LatLng[]>([]);
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;

    const key = JSON.stringify([origin, destination, waypoints]);

    useEffect(() => {
        if (!valid(origin) || !valid(destination)) {
            return;
        }

        let cancelled = false;
        const stops = waypoints.filter(valid);
        // Si no hay clave o falla Google, se dibuja una línea recta entre las paradas.
        const straight = [origin, ...stops, destination];

        const finish = (points: LatLng[]) => {
            if (cancelled) {
                return;
            }
            setCoordinates(points);
            onReadyRef.current?.({ coordinates: points });
        };

        if (!apikey) {
            finish(straight);
            return;
        }

        axios
            .post(
                'https://routes.googleapis.com/directions/v2:computeRoutes',
                {
                    origin: toWaypoint(origin),
                    destination: toWaypoint(destination),
                    intermediates: stops.map(toWaypoint),
                    travelMode: 'DRIVE',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apikey,
                        'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
                    },
                    timeout: 15000,
                }
            )
            .then((response) => {
                const encoded = response.data?.routes?.[0]?.polyline?.encodedPolyline;
                const points = encoded ? decodePolyline(encoded) : [];
                finish(points.length > 1 ? points : straight);
            })
            .catch((error) => {
                console.warn('Routes API error:', error?.response?.data ?? error?.message);
                finish(straight);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, apikey]);

    if (coordinates.length < 2) {
        return null;
    }

    return <Polyline coordinates={coordinates} strokeWidth={strokeWidth} strokeColor={strokeColor} />;
};

export default RouteDirections;
