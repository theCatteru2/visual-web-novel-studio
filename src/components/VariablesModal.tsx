import { useState } from 'react';
import { useNovel } from '../context/NovelContext';
import { CustomVariable } from '../types';

interface VariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VariablesModal({ isOpen, onClose }: VariablesModalProps) {
  const { project, addOrUpdateVariable, deleteVariable } = useNovel();
  const variablesList = Object.values(project.variables || {});

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'boolean' | 'number' | 'string'>('boolean');
  const [defaultValue, setDefaultValue] = useState<boolean | number | string>(false);
  const [description, setDescription] = useState('');
  const [isVisibleInHUD, setIsVisibleInHUD] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanName) return;

    let parsedDefault = defaultValue;
    if (type === 'number') parsedDefault = Number(defaultValue) || 0;
    if (type === 'boolean') parsedDefault = defaultValue === true || defaultValue === 'true';

    const newVar: CustomVariable = {
      name: cleanName,
      type,
      defaultValue: parsedDefault,
      description: description.trim(),
      isVisibleInHUD
    };

    addOrUpdateVariable(newVar);
    setIsCreating(false);
    setName('');
    setDescription('');
    setDefaultValue(false);
    setType('boolean');
    setIsVisibleInHUD(false);
  };

  const toggleVisibility = (v: CustomVariable) => {
    addOrUpdateVariable({
      ...v,
      isVisibleInHUD: !v.isVisibleInHUD
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(5, 5, 10, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div style={{
        background: '#13131c',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        width: '100%',
        maxWidth: 580,
        color: '#fff',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: '0 25px 50px rgba(0,0,0,0.8)'
      }}>
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🧮</span>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Taller de Variables y Condiciones</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Lista de Variables */}
        {!isCreating ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Variables registradas ({variablesList.length}):</span>
              <button
                onClick={() => setIsCreating(true)}
                style={{ padding: '6px 14px', background: '#38bdf8', color: '#0f172a', fontWeight: 600, border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
              >
                + Crear Variable
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {variablesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#64748b', fontSize: 13 }}>
                  No has creado variables aún.
                </div>
              ) : (
                variablesList.map(v => (
                  <div key={v.name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: 14, color: '#38bdf8' }}>{v.name}</strong>
                        <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4, color: '#cbd5e1' }}>
                          {v.type === 'boolean' ? '🔘 Interruptor' : v.type === 'number' ? '🔢 Contador' : '📝 Texto'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        Valor inicial: <code style={{ color: '#a7f3d0' }}>{String(v.defaultValue)}</code> {v.description && `• ${v.description}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Botón rápido para alternar si es visible en partida */}
                      <button
                        onClick={() => toggleVisibility(v)}
                        title={v.isVisibleInHUD ? 'Visible en juego (clic para ocultar)' : 'Oculta en juego (clic para mostrar)'}
                        style={{
                          background: v.isVisibleInHUD ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${v.isVisibleInHUD ? '#38bdf8' : '#444'}`,
                          color: v.isVisibleInHUD ? '#38bdf8' : '#777',
                          borderRadius: 6,
                          padding: '3px 8px',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {v.isVisibleInHUD ? '👁️ Visible' : '🚫 Oculta'}
                      </button>

                      <button
                        onClick={() => deleteVariable(v.name)}
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Formulario de Creación */
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Nombre de la Variable</label>
              <input 
                type="text"
                placeholder="ej. tiene_llave, dinero, afinidad_secreta"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Tipo de Dato</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => { setType('boolean'); setDefaultValue(false); }}
                  style={{ flex: 1, padding: 8, background: type === 'boolean' ? '#38bdf8' : 'rgba(255,255,255,0.05)', color: type === 'boolean' ? '#0f172a' : '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                >
                  🔘 Interruptor (Sí/No)
                </button>
                <button
                  type="button"
                  onClick={() => { setType('number'); setDefaultValue(0); }}
                  style={{ flex: 1, padding: 8, background: type === 'number' ? '#38bdf8' : 'rgba(255,255,255,0.05)', color: type === 'number' ? '#0f172a' : '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                >
                  🔢 Contador (Número)
                </button>
                <button
                  type="button"
                  onClick={() => { setType('string'); setDefaultValue(''); }}
                  style={{ flex: 1, padding: 8, background: type === 'string' ? '#38bdf8' : 'rgba(255,255,255,0.05)', color: type === 'string' ? '#0f172a' : '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                >
                  📝 Texto
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Valor por Defecto</label>
              {type === 'boolean' ? (
                <select
                  value={String(defaultValue)}
                  onChange={e => setDefaultValue(e.target.value === 'true')}
                  style={{ width: '100%', padding: '8px 12px', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }}
                >
                  <option value="false">Falso / Desactivado (False)</option>
                  <option value="true">Verdadero / Activado (True)</option>
                </select>
              ) : (
                <input 
                  type={type === 'number' ? 'number' : 'text'}
                  value={String(defaultValue)}
                  onChange={e => setDefaultValue(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }}
                />
              )}
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Descripción (Opcional)</label>
              <input 
                type="text"
                placeholder="Para qué sirve esta variable..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
              />
            </div>

            {/* Casilla para mostrar en juego */}
            <label style={{ fontSize: 12, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: '2px 0' }}>
              <input
                type="checkbox"
                checked={isVisibleInHUD}
                onChange={e => setIsVisibleInHUD(e.target.checked)}
              />
              👁️ Mostrar visible en pantalla durante la partida (HUD)
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ padding: '8px 16px', background: '#10b981', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                Guardar Variable
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
