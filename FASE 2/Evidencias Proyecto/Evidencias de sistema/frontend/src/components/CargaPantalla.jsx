import { Component } from 'react';

export default class CargaPantalla extends Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) return <main className="pagina-cargando"><h1>No pudimos abrir esta pantalla</h1><p role="alert">Revisa tu conexión e inténtalo nuevamente.</p><button type="button" className="boton boton--principal" onClick={() => window.location.reload()}>Volver a cargar</button></main>;
    return this.props.children;
  }
}
