export default function CampoFormulario({ id, etiqueta, error, children, ...propsEntrada }) {
  const idError = `${id}-error`;
  const propsControl = {
    id,
    name: id,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? idError : undefined,
    className: 'campo__control',
    ...propsEntrada,
  };

  return (
    <div className={`campo${error ? ' campo--error' : ''}`}>
      <label htmlFor={id} className="campo__etiqueta">{etiqueta}</label>
      {children ? <select {...propsControl}>{children}</select> : <input {...propsControl} />}
      {error && <p id={idError} className="campo__mensaje" role="alert">{error}</p>}
    </div>
  );
}
