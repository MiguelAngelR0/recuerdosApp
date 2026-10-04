import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useSettings } from '@/lib/settings';

const BLOSSOMS: [number, number, number][] = [
  [70, 58, 1], [108, 40, 0.8], [140, 74, 1.1], [46, 104, 0.9], [182, 56, 0.7], [96, 92, 0.7], [214, 38, 0.6],
  [330, 96, 1], [296, 70, 0.8], [356, 140, 0.9], [262, 104, 0.7], [318, 40, 0.6],
];
const STARS: [number, number, number][] = [
  [40, 170, 1.5], [120, 150, 1], [210, 130, 1.6], [260, 190, 1.2], [350, 180, 1.4],
  [90, 230, 1.1], [180, 210, 1], [30, 300, 1.3], [370, 270, 1], [230, 280, 1.2],
];
const PETALS = [
  { x: 0.15, delay: 0 }, { x: 0.38, delay: 2200 }, { x: 0.62, delay: 4100 },
  { x: 0.85, delay: 1300 }, { x: 0.97, delay: 6000 }, { x: 0.28, delay: 7200 },
];

function Petal({ x, delay, height, color }: { x: number; delay: number; height: number; color: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [delay, t]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: -20,
        width: 12,
        height: 10,
        backgroundColor: color,
        borderTopLeftRadius: 12,
        borderBottomRightRadius: 12,
        opacity: t.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0.2] }),
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }) },
        ],
      }}
    />
  );
}

// Con "Reducir movimiento" activado las ramas siguen, pero los pétalos no caen.
function useReduceMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

export function Background() {
  const { pal, flowers } = useSettings();
  const { width, height } = useWindowDimensions();
  const reduced = useReduceMotion();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={pal.sky} style={StyleSheet.absoluteFill} />
      <Svg width={width} height={height} viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice" style={StyleSheet.absoluteFill}>
        <G fill="#FFFFFF" opacity={pal.stars}>
          {STARS.map(([x, y, r]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </G>
        <Circle cx={300} cy={250} r={56} fill={pal.sun} opacity={pal.sunOpacity} />
        <Path d="M0 560 L120 470 Q160 440 200 470 L320 540 L390 520 L390 844 L0 844 Z" fill={pal.mountain} />
        <Path d="M150 455 Q160 440 200 470 L182 476 L170 466 L158 474 Z" fill={pal.snow} />
        <Path d="M0 600 Q120 560 220 590 T390 580 L390 844 L0 844 Z" fill={pal.hill} />
        {flowers && (
          <G>
            <Path d="M-10 30 C 60 50 120 60 230 30 M60 46 C 70 70 50 100 40 110 M130 56 C 140 70 150 80 146 90" fill="none" stroke={pal.branch} strokeWidth={6} strokeLinecap="round" />
            <Path d="M400 120 C 340 110 300 90 250 100 M340 112 C 330 80 310 60 300 40 M300 96 C 290 110 270 110 260 106" fill="none" stroke={pal.branch} strokeWidth={5} strokeLinecap="round" />
            {BLOSSOMS.map(([x, y, s]) => (
              <G key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
                <G fill={pal.blossom}>
                  <Circle cx={0} cy={-7} r={6} />
                  <Circle cx={6.7} cy={-2.2} r={6} />
                  <Circle cx={4.1} cy={5.7} r={6} />
                  <Circle cx={-4.1} cy={5.7} r={6} />
                  <Circle cx={-6.7} cy={-2.2} r={6} />
                </G>
                <Circle r={3} fill={pal.blossomCenter} />
              </G>
            ))}
          </G>
        )}
      </Svg>
      {flowers && !reduced && PETALS.map((p) => <Petal key={p.delay} x={p.x * width} delay={p.delay} height={height} color={pal.blossom} />)}
    </View>
  );
}
