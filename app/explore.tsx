import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";

export default function ExplorarScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
      style={[styles.container, { paddingBottom: insets.bottom + BottomTabInset + Spacing.three }]}
    >
      <ThemedText type="subtitle">Explorar</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.text}>
        Marcador de posición. Las pantallas de tareas se construyen en el hito 1.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  text: {
    textAlign: "center",
  },
});
