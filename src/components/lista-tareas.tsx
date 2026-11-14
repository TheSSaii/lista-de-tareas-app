import { SectionList, StyleSheet, View } from "react-native";

import type { Tarea } from "../services/tarea";
import { TareaItem } from "./tarea-item";
import { ThemedText } from "./themed-text";

export type SeccionTareas = {
  etiqueta: string;
  data: Tarea[];
};

type Props = {
  secciones: SeccionTareas[];
  onAlternar: (tarea: Tarea) => void;
  onEditar: (tarea: Tarea) => void;
};

export function ListaTareas({ secciones, onAlternar, onEditar }: Props) {
  return (
    <SectionList
      style={styles.lista}
      sections={secciones}
      keyExtractor={(tarea) => String(tarea.id)}
      renderSectionHeader={({ section }) => (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.encabezado}>
          {section.etiqueta}
        </ThemedText>
      )}
      renderItem={({ item }) => (
        <TareaItem tarea={item} onAlternar={onAlternar} onEditar={onEditar} />
      )}
      ItemSeparatorComponent={() => <View style={styles.separador} />}
      contentContainerStyle={styles.contenido}
      stickySectionHeadersEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  lista: {
    flex: 1,
  },
  contenido: {
    paddingBottom: 24,
  },
  encabezado: {
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: "uppercase",
  },
  separador: {
    height: 8,
  },
});
