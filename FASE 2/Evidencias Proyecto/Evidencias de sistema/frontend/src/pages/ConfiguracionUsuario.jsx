import Ajustes, { PreferenciasCuenta, TarjetaAjustes } from '../components/cuenta/Ajustes.jsx';

const PREFERENCIAS = [
  { clave: 'recordatoriosCitas', icono: 'calendario', titulo: 'Recordatorios de citas', descripcion: 'Recibe un correo antes de tus citas confirmadas cuando el profesional tenga activados los recordatorios.' },
  { clave: 'avisosMensajesCorreo', icono: 'chat', titulo: 'Mensajes nuevos por correo', descripcion: 'Recibe hasta un aviso cada 30 minutos cuando te escriba un profesional. El contenido queda en el chat.' },
];

export default function ConfiguracionUsuario() {
  return <Ajustes>
    <TarjetaAjustes id="ajustes-notificaciones" titulo="Notificaciones" icono="campana" ancha>
      <PreferenciasCuenta ruta="/perfil/configuracion" preferencias={PREFERENCIAS} />
    </TarjetaAjustes>
  </Ajustes>;
}
