import { useState, useEffect } from 'react';
import { X, Search, Plus, Save, Edit, Trash2, Image as ImageIcon, Check, Sparkles, RefreshCw } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { generateExerciseDetailsWithGemini } from '../lib/geminiService';

interface ExerciseLibraryModalProps {
  plantillaId?: string;
  onClose: () => void;
  onExerciseAdded?: () => void;
}

export default function ExerciseLibraryModal({ plantillaId, onClose, onExerciseAdded }: ExerciseLibraryModalProps) {
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingToTemplateId, setAddingToTemplateId] = useState<string | null>(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [musculo, setMusculo] = useState('');
  const [metValue, setMetValue] = useState<number | ''>('');
  const [esTiempo, setEsTiempo] = useState(false);
  const [imagenUrl, setImagenUrl] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAIFill = async () => {
    if (!nombre.trim()) {
      alert("Por favor, introduce el nombre del ejercicio primero.");
      return;
    }
    const geminiApiKey = localStorage.getItem('gemini_api_key') || '';
    if (!geminiApiKey) {
      alert("Por favor, configura tu API Key de Gemini en tu Perfil de Nutrición primero.");
      return;
    }

    setAiLoading(true);
    try {
      const details = await generateExerciseDetailsWithGemini(geminiApiKey, nombre);
      setEsTiempo(details.es_tiempo);
      setMetValue(details.met_value);
      setMusculo(details.musculo_principal || '');
      setDescripcion(details.descripcion || '');
      if (!categoria || categoria === 'Pesas') {
        setCategoria(details.es_tiempo ? 'Cardio' : 'Pesas');
      }
    } catch (err: any) {
      console.error(err);
      alert("Error al autocompletar con IA: " + (err.message || err));
    } finally {
      setAiLoading(false);
    }
  };

  const fetchEjercicios = async () => {
    setLoading(true);
    try {
      const records = await pb.collection('ejercicios_globales').getFullList({
        sort: 'nombre'
      });
      setEjercicios(records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEjercicios();
  }, []);

  const categorias = ['Todas', ...Array.from(new Set(ejercicios.map(e => e.categoria).filter(Boolean)))];

  const filtered = ejercicios.filter(e => {
    const matchesSearch = e.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'Todas' || e.categoria === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleEdit = (e: any) => {
    setEditingId(e.id);
    setNombre(e.nombre);
    setCategoria(e.categoria || '');
    setMusculo(e.musculo_principal || '');
    setMetValue(e.met_value || '');
    setEsTiempo(e.es_tiempo || false);
    setImagenUrl(e.imagen_url || '');
    setDescripcion(e.descripcion || '');
  };

  const handleCreateNew = () => {
    setEditingId('new');
    setNombre('');
    setCategoria('Pesas');
    setMusculo('');
    setMetValue('');
    setEsTiempo(false);
    setImagenUrl('');
    setDescripcion('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        nombre,
        categoria,
        musculo_principal: musculo,
        met_value: Number(metValue) || 0,
        es_tiempo: esTiempo,
        imagen_url: imagenUrl,
        descripcion: descripcion
      };

      if (editingId === 'new') {
        await pb.collection('ejercicios_globales').create(data);
      } else if (editingId) {
        await pb.collection('ejercicios_globales').update(editingId, data);
      }
      setEditingId(null);
      fetchEjercicios();
    } catch (err) {
      console.error(err);
      alert("Error al guardar el ejercicio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este ejercicio global?")) return;
    try {
      await pb.collection('ejercicios_globales').delete(id);
      fetchEjercicios();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToTemplate = async (ej: any) => {
    if (!plantillaId) return;
    setAddingToTemplateId(ej.id);
    try {
      await pb.collection('ejercicios_plantilla').create({
        plantilla: plantillaId,
        nombre: ej.nombre,
        series_objetivo: 3,
        repeticiones_objetivo: ej.es_tiempo ? "60s" : "10",
        es_tiempo: ej.es_tiempo || false,
        descripcion: ej.descripcion || (ej.musculo_principal ? `Enfoque: ${ej.musculo_principal}` : ''),
        tiempo_reposo: 90,
        imagen_url: ej.imagen_url || null,
        met_value: ej.met_value || 0
      });
      if (onExerciseAdded) {
        onExerciseAdded();
      }
      // Show check micro-animation/temporary feedback
      setTimeout(() => {
        setAddingToTemplateId(null);
      }, 1000);
    } catch (err) {
      console.error(err);
      alert("Error al añadir el ejercicio a la plantilla");
      setAddingToTemplateId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1115] w-full sm:w-[600px] h-[90vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl border-t sm:border border-border/60 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300">
        
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-surface/50">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Base de Datos de Ejercicios
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-hover text-text-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        {editingId ? (
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingId === 'new' ? 'Nuevo Ejercicio' : 'Editar Ejercicio'}
            </h3>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-text-muted font-bold block">Nombre *</label>
                <button
                  type="button"
                  onClick={handleAIFill}
                  disabled={aiLoading || !nombre.trim()}
                  className="text-[10px] text-primary hover:text-white bg-primary/15 hover:bg-primary/30 px-2 py-1 rounded-lg font-black flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Autocompletar con Inteligencia Artificial"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw size={10} className="animate-spin" /> Rellenando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={10} /> Completar con IA
                    </>
                  )}
                </button>
              </div>
              <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-surface border border-border/50 rounded-xl px-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-muted font-bold block mb-1">Categoría</label>
                <input type="text" placeholder="ej. Pesas, TRX" value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-surface border border-border/50 rounded-xl px-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-text-muted font-bold block mb-1">Músculo</label>
                <input type="text" value={musculo} onChange={e => setMusculo(e.target.value)} className="w-full bg-surface border border-border/50 rounded-xl px-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div>
              <label className="text-xs text-text-muted font-bold block mb-1">Descripción / Instrucciones Técnicas</label>
              <textarea rows={3} value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full bg-surface border border-border/50 rounded-xl px-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary resize-none" placeholder="Instrucciones detalladas de cómo realizar el ejercicio..." />
            </div>

            <div>
              <label className="text-xs text-text-muted font-bold block mb-1">Valor MET (Gasto Calórico)</label>
              <input type="number" step="0.1" value={metValue} onChange={e => setMetValue(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-surface border border-border/50 rounded-xl px-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary" placeholder="ej. 6.0" />
            </div>

            <label className="flex items-center gap-3 p-3 bg-surface border border-border/50 rounded-xl cursor-pointer">
              <input type="checkbox" checked={esTiempo} onChange={e => setEsTiempo(e.target.checked)} className="w-4 h-4 rounded text-primary" />
              <span className="text-sm font-bold text-text-main">Es un ejercicio por tiempo</span>
            </label>

            <div>
              <label className="text-xs text-text-muted font-bold block mb-1">URL de Imagen</label>
              <input type="url" value={imagenUrl} onChange={e => setImagenUrl(e.target.value)} className="w-full bg-surface border border-border/50 rounded-xl px-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary" placeholder="https://..." />
            </div>

            {/* Preview image */}
            {imagenUrl && (
              <div className="mt-2">
                <span className="text-xs text-text-muted font-bold block mb-1">Vista Previa de Imagen</span>
                <div className="w-32 h-32 rounded-xl overflow-hidden border border-border/50 bg-surface flex items-center justify-center">
                  <img 
                    src={imagenUrl} 
                    alt="Vista previa" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                      alert("No se pudo cargar la imagen desde la URL provista");
                    }} 
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setEditingId(null)} className="flex-1 py-3 bg-surface border border-border/60 rounded-xl font-bold text-sm text-text-muted hover:text-white transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="p-4 border-b border-border/50 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar ejercicio..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-surface border border-border/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                {categorias.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-surface text-text-muted hover:text-white border border-border/50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-4 border-surface border-t-primary animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-4">
                  <p className="text-text-muted text-sm">No se encontraron ejercicios con ese nombre.</p>
                  {searchTerm.trim().length > 0 && (
                    <button 
                      onClick={() => {
                        setEditingId('new');
                        setNombre(searchTerm);
                        setCategoria('Pesas');
                        setMusculo('');
                        setMetValue('');
                        setEsTiempo(false);
                        setImagenUrl('');
                        setDescripcion('');
                      }}
                      className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Crear "{searchTerm}" directamente
                    </button>
                  )}
                </div>
              ) : (
                filtered.map(ej => (
                  <div key={ej.id} className="bg-surface/50 border border-border/40 rounded-xl p-3 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface flex items-center justify-center shrink-0">
                        {ej.imagen_url ? (
                          <img src={ej.imagen_url} alt={ej.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={20} className="text-text-muted/50" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{ej.nombre}</h4>
                        <div className="text-[10px] text-text-muted flex gap-2">
                          {ej.categoria && <span>{ej.categoria}</span>}
                          {ej.met_value > 0 && <span>• {ej.met_value} MET</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {plantillaId && (
                        <button 
                          onClick={() => handleAddToTemplate(ej)} 
                          disabled={addingToTemplateId === ej.id}
                          className="mr-2 px-2.5 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary hover:text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                        >
                          {addingToTemplateId === ej.id ? (
                            <>
                              <Check size={12} className="text-green-500 animate-bounce" /> Añadido
                            </>
                          ) : (
                            <>
                              <Plus size={12} /> Añadir
                            </>
                          )}
                        </button>
                      )}
                      <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(ej)} className="p-1.5 text-text-muted hover:text-primary transition-colors"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(ej.id)} className="p-1.5 text-text-muted hover:text-danger transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-border/50 bg-surface/30">
              <button onClick={handleCreateNew} className="w-full py-3 bg-surface hover:bg-surface-hover border border-border/60 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-colors">
                <Plus size={18} /> Crear Nuevo Ejercicio
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
