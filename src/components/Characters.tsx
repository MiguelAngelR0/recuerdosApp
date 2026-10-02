import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { CharacterKind, StatusId } from '@/lib/supabase';

// Pollito y cara de oso: Noto Emoji de Google (licencia Apache 2.0).
const CHICK = {
  feet: [
    'M78.49,99.47l-5.35,0.56c0,0-0.57,13.78,0.99,16.75c1.55,2.96,6.41,3.68,10.56,3.24c3.94-0.42,4.22-2.96,3.66-4.79c-0.56-1.83-3.1-3.52-5.21-4.79c-1.71-1.02-2.11-4.36-2.39-9.15C80.6,98.77,78.49,99.47,78.49,99.47z',
    'M56.25,99.8l-8.12,0.52c0,0,0.23,6.62-0.19,9.15c-0.51,3.05-6.08,3.2-7.74,5.54c-1.27,1.78,0.31,4.92,3.85,5.35c2.35,0.28,8.54,0.66,10.65-3.14C56.54,113.89,56.25,99.8,56.25,99.8z',
  ],
  body: 'M29.97,50.06c0,0-3.94-16.33,9.39-31.72S76.9,5.38,89.1,18.71s9.76,32.29,9.76,32.29s4.88,9.2,12.39,15.39c5.12,4.23,14.27,11.07,12.2,15.39c-2.06,4.32-4.13,3.38-7.7,3.19s-14.27-5.44-14.27-5.44s-2.44,26.65-36.04,27.41S26.59,79.71,26.59,79.71s-13.89,4.32-16.14,4.32s-6.18-0.99-6.01-5.44c0.19-4.69,9.2-9.2,12.95-12.76C21.15,62.26,27.34,56.63,29.97,50.06z',
  wings: [
    'M122.11,83.91c0,0-2.37,3.03-6.03,3.31c-3.95,0.3-10.42-0.7-14.36-4.22S96.8,71.88,98.2,70.33c1.41-1.55,3.52,4.96,9.15,8.45C113.45,82.55,122.11,83.91,122.11,83.91z',
    'M18.52,79.9c5.34-2.41,13.06-11.8,13.94-10.84c1.55,1.69-0.03,9.6-4.79,13.66c-4.79,4.08-12.01,4.69-18.07,2.16c-3.32-1.39-4.41-2.91-4.88-3.85C3.59,78.76,11.34,83.14,18.52,79.9z',
  ],
  beak: 'M63.99,40.34c-7.04,0.16-9.15,3.64-9.15,5.91c0,2.67,6.76,8.59,9.01,8.59s9.15-6.19,9.22-8.59C73.14,44,70.33,40.2,63.99,40.34z',
};

const BEAR = {
  head: 'M63.29,9.93c14.92,0.22,16.4,3.61,20.77,3.73c6.32,0.18,15.98-11.97,29.07-0.99c12.9,10.82,2.39,27.8,2.39,27.8s7.18,12.72,8.02,32.1c0.61,14.03-4.79,31.49-29,41.39c-22.29,9.12-55.55,7.3-75.88-8.31C2.9,93.56,4.01,75.92,4.44,69.91c1.13-15.77,8.02-28.44,8.02-28.44s-10.19-20.15,2.25-29.7c13.66-10.49,23.38,1.86,29,1.41C47.8,12.84,49.14,9.72,63.29,9.93z',
  ears: [
    'M35.98,20.77c-0.19-1.11-7.43-8.29-14.92-0.99c-5.77,5.63,0,15.42,0.99,14.64c0.76-0.6,3.56-4.21,6.83-7.32C32.23,23.91,36.05,21.2,35.98,20.77z',
    'M92.5,20.84c-0.05,0.62,3.81,2.95,7.32,6.26c3.55,3.35,6.75,7.67,7.32,7.6c1.13-0.14,5.98-9.64-0.35-14.99S92.64,19.01,92.5,20.84z',
  ],
  muzzle: 'M64.51,60.38c14.64,0,23.42,16.52,22.9,26.84c-0.47,9.39-5.82,17.18-23.84,17.08c-18.02-0.09-22.59-8.36-22.9-17.18C40.39,79.24,46.02,60.38,64.51,60.38z',
  eyes: [
    'M92.92,59.7c0.33,4.16-1.9,7.95-6.17,7.63c-4.12-0.32-7.13-3.66-7.13-7.84s2.22-7.14,5.56-7.6C89.26,51.32,92.45,53.79,92.92,59.7z',
    'M48.37,61.25c-0.43,4.15-4.33,7.06-7.98,6.17c-4.01-0.98-5.81-5.2-4.97-9.29c0.75-3.66,3.96-6.51,7.6-6.1C46.82,52.45,48.91,56.02,48.37,61.25z',
  ],
  nose: 'M74.55,76.99c-0.34,4.16-3.1,8.61-11.12,8.33c-6.73-0.24-9.9-4.72-10-8.89c-0.14-5.89,3-8.06,10.61-8.17C72.72,68.15,75.02,71.27,74.55,76.99z',
  mouth: 'M63.99,95.04c5.49,0,8.49-3.03,9.34-3.87s1.99-2.28,3.75-0.84c1.5,1.22,0.02,3.12-0.66,3.85c-1.22,1.31-4.9,5.31-12.93,4.95c-7.88-0.35-10.91-3.92-11.76-4.76c-0.84-0.84-2.25-3-0.66-4.22c1.91-1.46,2.53,0.19,4.5,1.78S58.78,95.04,63.99,95.04z',
};

type Motion = { lift: number; liftMs: number; tilt: number; tiltMs: number };

const MOTION: Record<StatusId, Motion> = {
  ejercicio: { lift: -28, liftMs: 300, tilt: 0, tiltMs: 1000 },
  estudiando: { lift: -3, liftMs: 1100, tilt: 3, tiltMs: 1200 },
  durmiendo: { lift: 3, liftMs: 1500, tilt: 0, tiltMs: 1000 },
  trabajando: { lift: -4, liftMs: 250, tilt: 0, tiltMs: 1000 },
  comiendo: { lift: -4, liftMs: 450, tilt: 0, tiltMs: 1000 },
  extrano: { lift: -4, liftMs: 1100, tilt: 2, tiltMs: 1000 },
};

function useLoop(ms: number, deps: unknown[]) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return v;
}

function useRise(ms: number, delay: number, active: boolean) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    v.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [active, ms, delay, v]);
  return v;
}

function Floating({ active, x, y, dx, dy, ms, delay, children }: { active: boolean; x: number; y: number; dx: number; dy: number; ms: number; delay: number; children: React.ReactNode }) {
  const t = useRise(ms, delay, active);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: t.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

const Drop = ({ s }: { s: number }) => (
  <Svg width={16 * s} height={22 * s} viewBox="-8 -12 16 22">
    <Path d="M0 -12 C 5 -5 8 0 8 5 A 8 8 0 0 1 -8 5 C -8 0 -5 -5 0 -12 Z" fill="#4FC3F7" />
  </Svg>
);
const Heart = ({ s }: { s: number }) => (
  <Svg width={20 * s} height={18 * s} viewBox="-10 -4 20 20">
    <Path d="M0 4 C -8 -4 -14 2 -8 8 L0 15 L8 8 C 14 2 8 -4 0 4 Z" fill="#EC407A" />
  </Svg>
);
const Zed = ({ s, big }: { s: number; big?: boolean }) => (
  <Svg width={24 * s} height={26 * s} viewBox="0 0 24 26">
    <SvgText x="2" y="22" fontSize={big ? 24 : 18} fontWeight="800" fill="#7E57C2">
      Z
    </SvgText>
  </Svg>
);

function Props({ status, kind }: { status: StatusId; kind: CharacterKind }) {
  const bear = kind === 'osito';
  return (
    <>
      {status === 'ejercicio' && (
        <Path d={bear ? 'M48 34 Q90 16 132 34' : 'M56 40 Q90 24 124 40'} fill="none" stroke="#E53935" strokeWidth={9} strokeLinecap="round" />
      )}
      {status === 'durmiendo' && (
        <Path
          d={bear ? 'M62 62q8 6 16 0M102 62q8 6 16 0' : 'M57 66q8 6 16 0M107 66q8 6 16 0'}
          fill="none"
          stroke="#2E302D"
          strokeWidth={4}
          strokeLinecap="round"
        />
      )}
      {status === 'estudiando' && (
        <G>
          <Path d="M48 134 L90 142 L90 172 L48 164 Z" fill={bear ? '#66BB6A' : '#42A5F5'} />
          <Path d="M132 134 L90 142 L90 172 L132 164 Z" fill={bear ? '#43A047' : '#1E88E5'} />
          <Path d="M56 144l26 5M56 152l26 5M98 149l26-5M98 157l26-5" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
        </G>
      )}
      {status === 'trabajando' && (
        <G>
          <Rect x={52} y={124} width={76} height={46} rx={5} fill="#546E7A" />
          <Rect x={58} y={130} width={64} height={34} rx={3} fill="#B3E5FC" />
          <Path d="M40 170 h100 l8 10 h-116 z" fill="#78909C" />
        </G>
      )}
      {status === 'comiendo' &&
        (bear ? (
          <G>
            <Path d="M68 132 h44 l-6 26 h-32 z" fill="#FFB300" />
            <Rect x={66} y={126} width={48} height={10} rx={5} fill="#FFCA28" />
          </G>
        ) : (
          <G>
            <Circle cx={90} cy={140} r={20} fill="#D4A056" />
            <Circle cx={83} cy={134} r={3} fill="#5D4037" />
            <Circle cx={97} cy={142} r={3} fill="#5D4037" />
            <Circle cx={86} cy={148} r={2.5} fill="#5D4037" />
          </G>
        ))}
    </>
  );
}

export function Character({ kind, status, size = 180 }: { kind: CharacterKind; status: StatusId; size?: number }) {
  const m = MOTION[status];
  const s = size / 180;
  const lift = useLoop(m.liftMs, [status]);
  const tilt = useLoop(m.tiltMs, [status]);
  const eyesOpen = status !== 'durmiendo';

  return (
    <View style={{ width: size, height: size * (200 / 180) }}>
      <Svg width={size} height={size * (200 / 180)} viewBox="0 0 180 200" style={StyleSheet.absoluteFill}>
        <Ellipse cx={90} cy={193} rx={48} ry={6} fill="#000000" opacity={0.12} />
      </Svg>
      <Animated.View
        style={{
          position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
          transform: [
            { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, m.lift * s] }) },
            { rotate: tilt.interpolate({ inputRange: [0, 1], outputRange: [`${-m.tilt}deg`, `${m.tilt}deg`] }) },
          ],
        }}
      >
        <Svg width={size} height={size * (200 / 180)} viewBox="0 0 180 200">
          {kind === 'pollito' ? (
            <G transform="translate(0 12) scale(1.4)">
              {CHICK.feet.map((d) => (
                <Path key={d} d={d} fill="#FE8F01" />
              ))}
              <Path d={CHICK.body} fill="#FFB903" />
              {CHICK.wings.map((d) => (
                <Path key={d} d={d} fill="#FE8F01" />
              ))}
              {eyesOpen && (
                <G fill="#2E302D">
                  <Ellipse cx={46.36} cy={37.06} rx={4.59} ry={5.27} />
                  <Ellipse cx={81.97} cy={36.92} rx={4.59} ry={5.27} />
                </G>
              )}
              <Path d={CHICK.beak} fill="#FE8F01" />
            </G>
          ) : (
            <G>
              <Ellipse cx={66} cy={182} rx={17} ry={10} fill="#6F4A43" />
              <Ellipse cx={114} cy={182} rx={17} ry={10} fill="#6F4A43" />
              <Ellipse cx={90} cy={146} rx={46} ry={40} fill="#855B52" />
              <Ellipse cx={90} cy={152} rx={27} ry={25} fill="#B99277" />
              <Ellipse cx={46} cy={140} rx={12} ry={21} fill="#6F4A43" transform="rotate(25 46 140)" />
              <Ellipse cx={134} cy={140} rx={12} ry={21} fill="#6F4A43" transform="rotate(-25 134 140)" />
              <G transform="translate(32.4 6) scale(0.9)">
                <Path d={BEAR.head} fill="#855B52" />
                {BEAR.ears.map((d) => (
                  <Path key={d} d={d} fill="#B99277" />
                ))}
                <Path d={BEAR.muzzle} fill="#F2A258" />
                <Path d={BEAR.nose} fill="#2F3030" />
                <Path d={BEAR.mouth} fill="#2F3030" />
                {eyesOpen && BEAR.eyes.map((d) => <Path key={d} d={d} fill="#171716" />)}
              </G>
            </G>
          )}
          <Props status={status} kind={kind} />
        </Svg>
      </Animated.View>
      <Floating active={status === 'ejercicio'} x={140 * s} y={44 * s} dx={10 * s} dy={40 * s} ms={1100} delay={0}>
        <Drop s={s} />
      </Floating>
      <Floating active={status === 'ejercicio'} x={24 * s} y={60 * s} dx={-8 * s} dy={36 * s} ms={1100} delay={500}>
        <Drop s={s * 0.8} />
      </Floating>
      <Floating active={status === 'durmiendo'} x={136 * s} y={24 * s} dx={10 * s} dy={-24 * s} ms={2200} delay={0}>
        <Zed s={s} />
      </Floating>
      <Floating active={status === 'durmiendo'} x={136 * s} y={24 * s} dx={18 * s} dy={-38 * s} ms={2200} delay={800}>
        <Zed s={s} big />
      </Floating>
      <Floating active={status === 'extrano'} x={134 * s} y={36 * s} dx={8 * s} dy={-38 * s} ms={1900} delay={0}>
        <Heart s={s} />
      </Floating>
      <Floating active={status === 'extrano'} x={28 * s} y={46 * s} dx={-6 * s} dy={-38 * s} ms={1900} delay={900}>
        <Heart s={s} />
      </Floating>
    </View>
  );
}
