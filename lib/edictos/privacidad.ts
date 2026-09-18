const PATRONES: Array<[RegExp, string]> = [
  [/\b\d{8}\s?-?[A-Za-z]\b/g, "[DNI]"],
  [/\b[XYZxyz]\s?-?\d{7}\s?-?[A-Za-z]\b/g, "[NIE]"],
  [/\b[ABCDEFGHJNPQRSUVW]\s?-?\d{7}\s?-?[0-9A-J]\b/g, "[CIF]"],
  [/\bES\d{2}(?:\s?\d{4}){5}\b/gi, "[IBAN]"],
  [
    /\b(?:Don|Doña|D\.|Dña\.|DON|DOÑA)\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+(?:de\s+|del\s+|la\s+)?[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)*/g,
    "[identidad]",
  ],
];

/**
 * Enmascara identificadores personales (DNI, NIE, CIF, IBAN y nombres tras
 * tratamiento de cortesía) antes de sacar cualquier texto de un edicto del
 * módulo. Los edictos son públicos, pero son notificaciones a personas
 * concretas: solo se guarda y se envía a jev el texto redactado.
 */
export function redactarDatosPersonales(texto: string): string {
  return PATRONES.reduce(
    (salida, [patron, reemplazo]) => salida.replace(patron, reemplazo),
    texto,
  );
}
