import Ajustes, { PreferenciasCuenta, TarjetaAjustes } from '../../components/cuenta/Ajustes.jsx';
import { SECCIONES_PROFESIONAL } from '../../components/diseno/secciones.js';

const PREFERENCIAS = [
  {
    clave: 'autoconfirmar', icono: 'check', titulo: 'Confirmar reservas automáticamente',
    descripcion: 'Las solicitudes nuevas quedan confirmadas al instante, sin revisión manual.',
  },
  {
    clave: 'avisosCorreo', icono: 'correo', titulo: 'Avisos por correo',
    descripcion: 'Recibe un aviso cuando alguien pide o cancela una hora contigo.',
  },
  {
    clave: 'recordatorios', icono: 'campana', titulo: 'Recordatorio a tus clientes',
    descripcion: 'Si tu cliente acepta recordatorios, le enviamos un correo 24 horas antes de su cita confirmada.',
  },
];

export default function Configuracion() {
  return <Ajustes rol="profesional">
    <TarjetaAjustes id="ajustes-agenda" titulo="Agenda y notificaciones" icono="calendario" ancha>
      <PreferenciasCuenta ruta="/profesionales/mi-ficha/configuracion" preferencias={PREFERENCIAS} rutaFicha={SECCIONES_PROFESIONAL.perfil.ruta} />
    </TarjetaAjustes>
  </Ajustes>;
}
