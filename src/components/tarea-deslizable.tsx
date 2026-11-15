import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { Tarea } from "../services/tarea";
import { TareaItem } from "./tarea-item";

const UMBRAL_ACCION = 72;
const LIMITE_DESPLAZAMIENTO = 112;
const COLOR_COMPLETAR = "#0F7B3E";
const COLOR_POSPONER = "#8A5A00";

type Props = {
  tarea: Tarea;
  onAlternar: (tarea: Tarea) => void;
  onPosponer: (tarea: Tarea) => void;
  onEditar: (tarea: Tarea) => void;
};

function useDeslizamiento(
  tarea: Tarea,
  onAlternar: (tarea: Tarea) => void,
  onPosponer: (tarea: Tarea) => void,
) {
  const desplazamiento = useSharedValue(0);

  const gesto = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onUpdate((evento) => {
      desplazamiento.value = Math.max(
        -LIMITE_DESPLAZAMIENTO,
        Math.min(LIMITE_DESPLAZAMIENTO, evento.translationX),
      );
    })
    .onEnd((evento) => {
      if (evento.translationX >= UMBRAL_ACCION) {
        runOnJS(onAlternar)(tarea);
      } else if (evento.translationX <= -UMBRAL_ACCION) {
        runOnJS(onPosponer)(tarea);
      }

      desplazamiento.value = withTiming(0, { duration: 150 });
    });

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: desplazamiento.value }],
  }));

  return { gesto, estilo };
}

export function TareaDeslizable({ tarea, onAlternar, onPosponer, onEditar }: Props) {
  const { gesto, estilo } = useDeslizamiento(tarea, onAlternar, onPosponer);

  return (
    <View testID="tarea-deslizable" style={styles.contenedor}>
      <View
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[StyleSheet.absoluteFill, styles.fondo]}
      >
        <View style={[styles.accion, styles.completar]}>
          <Text style={styles.textoAccion}>Completar</Text>
        </View>
        <View style={[styles.accion, styles.posponer]}>
          <Text style={styles.textoAccion}>Posponer 1 día</Text>
        </View>
      </View>

      <GestureDetector gesture={gesto}>
        <Animated.View style={estilo}>
          <TareaItem
            tarea={tarea}
            onAlternar={onAlternar}
            onPosponer={onPosponer}
            onEditar={onEditar}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    borderRadius: 12,
    overflow: "hidden",
  },
  fondo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  accion: {
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  completar: {
    alignItems: "flex-start",
    backgroundColor: COLOR_COMPLETAR,
  },
  posponer: {
    alignItems: "flex-end",
    backgroundColor: COLOR_POSPONER,
  },
  textoAccion: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
