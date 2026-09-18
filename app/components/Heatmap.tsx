import {
  colorHeatmap,
  etiquetaTrimestre,
  formatearTasa,
  nombresDeComunidades,
} from "@/lib/litigiosidad/presentacion";
import type { InformeTrimestral } from "@/lib/litigiosidad/tipos";

export default function Heatmap({ informes }: { informes: InformeTrimestral[] }) {
  const nombres = nombresDeComunidades(informes);
  const valores = informes.flatMap((informe) =>
    informe.comunidades.map((comunidad) => comunidad.tasa_litigiosidad),
  );
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);

  return (
    <div className="heatmapContenedor">
      <table className="heatmap">
        <thead>
          <tr>
            <th scope="col">Comunidad</th>
            {informes.map((informe) => (
              <th key={etiquetaTrimestre(informe)} scope="col">
                {etiquetaTrimestre(informe)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nombres.map((nombre) => (
            <tr key={nombre}>
              <th scope="row">{nombre}</th>
              {informes.map((informe) => {
                const registro = informe.comunidades.find(
                  (comunidad) => comunidad.comunidad_autonoma === nombre,
                );
                const valor = registro?.tasa_litigiosidad;
                const etiqueta = etiquetaTrimestre(informe);
                return (
                  <td
                    key={etiqueta}
                    style={
                      valor !== undefined
                        ? { backgroundColor: colorHeatmap(valor, minimo, maximo) }
                        : undefined
                    }
                    title={
                      valor !== undefined
                        ? `${nombre} · ${etiqueta}: ${formatearTasa(valor)} asuntos por 1.000 habitantes`
                        : `${nombre} · ${etiqueta}: sin dato publicado`
                    }
                  >
                    {formatearTasa(valor)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
