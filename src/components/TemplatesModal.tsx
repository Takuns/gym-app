import { useState, useEffect } from 'react';
import { X, FolderOpen, Plus, Trash2, Edit2, Check, ArrowLeft, Sparkles, Image as ImageIcon, GripVertical } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import AddExerciseModal from './AddExerciseModal';
import ExerciseLibraryModal from './ExerciseLibraryModal';

interface TemplatesModalProps {
  user: any;
  onClose: () => void;
  onTemplateUpdated: () => void;
}

export default function TemplatesModal({ user, onClose, onTemplateUpdated }: TemplatesModalProps) {
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlantilla, setSelectedPlantilla] = useState<any>(null);
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  
  // Create/Edit state
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null); // id de la plantilla
  const [editName, setEditName] = useState('');
  
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  const fetchPlantillas = async () => {
    setLoading(true);
    try {
      const records = await pb.collection('plantillas_rutinas').getFullList({
        filter: `usuario = "${user.id}"`,
        sort: 'orden,created',
      });
      setPlantillas(records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlantillas();
  }, []);

  useEffect(() => {
    if (selectedPlantilla) {
      const fetchEjercicios = async () => {
        try {
          const records = await pb.collection('ejercicios_plantilla').getFullList({
            filter: `plantilla = "${selectedPlantilla.id}"`,
            sort: 'orden,created'
          });
          setEjercicios(records);
        } catch (err) {
          console.error(err);
        }
      };
      fetchEjercicios();
    }
  }, [selectedPlantilla, showAddExercise, showLibrary]);

  const handleCreate = async () => {
    if (!editName.trim()) return;
    try {
      const maxOrder = plantillas.length > 0 ? Math.max(...plantillas.map(p => p.orden || 0)) : 0;
      await pb.collection('plantillas_rutinas').create({
        nombre: editName,
        usuario: user.id,
        orden: maxOrder + 1
      });
      setEditName('');
      setIsCreating(false);
      fetchPlantillas();
      onTemplateUpdated();
    } catch (err) {
      console.error(err);
      alert("Error al crear plantilla.");
    }
  };

  const handleUpdateName = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await pb.collection('plantillas_rutinas').update(id, {
        nombre: editName
      });
      setIsEditing(null);
      setEditName('');
      if (selectedPlantilla && selectedPlantilla.id === id) {
        setSelectedPlantilla({ ...selectedPlantilla, nombre: editName });
      }
      fetchPlantillas();
      onTemplateUpdated();
    } catch (err) {
      console.error(err);
      alert("Error al actualizar plantilla.");
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Seguro que quieres borrar esta plantilla y todos sus ejercicios?")) return;
    try {
      await pb.collection('plantillas_rutinas').delete(id);
      if (selectedPlantilla && selectedPlantilla.id === id) {
        setSelectedPlantilla(null);
      }
      fetchPlantillas();
      onTemplateUpdated();
    } catch (err) {
      console.error(err);
      alert("Error al borrar plantilla.");
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (!confirm("¿Seguro que quieres borrar este ejercicio de la plantilla?")) return;
    try {
      await pb.collection('ejercicios_plantilla').delete(id);
      setEjercicios(prev => prev.filter(e => e.id !== id));
      onTemplateUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const moveTemplate = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= plantillas.length || fromIndex === toIndex) return;

    const updated = [...plantillas];
    const [draggedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, draggedItem);

    setPlantillas(updated);

    try {
      await Promise.all(
        updated.map((p, idx) => pb.collection('plantillas_rutinas').update(p.id, { orden: idx }))
      );
      onTemplateUpdated();
    } catch (err) {
      console.error(err);
      fetchPlantillas();
    }
  };

  const moveExercise = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= ejercicios.length || fromIndex === toIndex) return;

    const updated = [...ejercicios];
    const [draggedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, draggedItem);

    setEjercicios(updated);

    try {
      await Promise.all(
        updated.map((ej, idx) => pb.collection('ejercicios_plantilla').update(ej.id, { orden: idx }))
      );
      onTemplateUpdated();
    } catch (err) {
      console.error(err);
      if (selectedPlantilla) {
        const records = await pb.collection('ejercicios_plantilla').getFullList({
          filter: `plantilla = "${selectedPlantilla.id}"`,
          sort: 'orden,created'
        });
        setEjercicios(records);
      }
    }
  };

  // Drag and drop states
  const [draggedTemplateIdx, setDraggedTemplateIdx] = useState<number | null>(null);
  const [draggedExerciseIdx, setDraggedExerciseIdx] = useState<number | null>(null);

  const handleTemplateDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTemplateIdx(index);
  };

  const handleTemplateDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedTemplateIdx !== null) {
      moveTemplate(draggedTemplateIdx, targetIndex);
      setDraggedTemplateIdx(null);
    }
  };

  const handleExerciseDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedExerciseIdx(index);
  };

  const handleExerciseDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedExerciseIdx !== null) {
      moveExercise(draggedExerciseIdx, targetIndex);
      setDraggedExerciseIdx(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1115] w-full h-full sm:h-auto sm:max-h-[85vh] sm:w-[600px] sm:rounded-3xl border-border/60 sm:border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-surface/50">
          <div className="flex items-center gap-3">
            {selectedPlantilla && (
              <button 
                onClick={() => setSelectedPlantilla(null)}
                className="p-1.5 rounded-xl hover:bg-surface-hover text-text-muted hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <FolderOpen className="text-primary" size={22} /> 
              {selectedPlantilla ? selectedPlantilla.nombre : "Mis Plantillas"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-hover text-text-muted hover:text-white transition-colors cursor-pointer">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 rounded-full border-4 border-surface border-t-primary animate-spin" />
            </div>
          ) : !selectedPlantilla ? (
            /* Vista de Lista de Plantillas */
            <div className="space-y-4">
              
              {isCreating ? (
                <div className="flex gap-2 p-3 bg-surface border border-border/50 rounded-2xl">
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Nombre de la nueva plantilla..."
                    className="flex-1 bg-transparent border-none text-sm text-text-main focus:outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  />
                  <button onClick={handleCreate} className="p-2 bg-primary rounded-xl text-white cursor-pointer hover:bg-primary-hover">
                    <Check size={16} />
                  </button>
                  <button onClick={() => { setIsCreating(false); setEditName(''); }} className="p-2 bg-surface-hover rounded-xl text-text-muted cursor-pointer hover:text-white">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsCreating(true)}
                  className="w-full py-4 border-2 border-dashed border-border/50 rounded-2xl flex items-center justify-center gap-2 text-text-muted hover:text-primary hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Plus size={20} /> Crear Nueva Plantilla
                </button>
              )}

              {plantillas.length === 0 && !isCreating && (
                <div className="text-center py-10 text-sm text-text-muted">
                  No tienes plantillas creadas.
                </div>
              )}

              <div className="grid gap-2">
                {plantillas.map((p, index) => (
                  <div 
                    key={p.id} 
                    draggable
                    onDragStart={(e) => handleTemplateDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleTemplateDrop(e, index)}
                    className="flex items-center gap-2 group cursor-grab active:cursor-grabbing"
                  >
                    {isEditing === p.id ? (
                      <div className="flex-1 flex gap-2 p-2 bg-surface border border-primary/50 rounded-2xl">
                        <input
                          autoFocus
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="flex-1 bg-transparent border-none text-sm text-text-main focus:outline-none px-2"
                          onKeyDown={e => e.key === 'Enter' && handleUpdateName(p.id)}
                        />
                        <button onClick={() => handleUpdateName(p.id)} className="p-2 bg-primary rounded-xl text-white cursor-pointer">
                          <Check size={16} />
                        </button>
                        <button onClick={() => { setIsEditing(null); setEditName(''); }} className="p-2 bg-surface-hover rounded-xl text-text-muted cursor-pointer">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-2">
                        <div className="text-text-muted hover:text-white shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical size={16} />
                        </div>
                        <div 
                          onClick={() => setSelectedPlantilla(p)}
                          className="flex-1 p-4 bg-surface hover:bg-surface-hover border border-border/50 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <span className="font-bold text-text-main">{p.nombre}</span>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setIsEditing(p.id); setEditName(p.nombre); }}
                              className="p-2 hover:bg-white/10 rounded-lg text-text-muted hover:text-white transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteTemplate(p.id, e)}
                              className="p-2 hover:bg-danger/20 rounded-lg text-text-muted hover:text-danger transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
          ) : (
            /* Vista de Ejercicios de la Plantilla */
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-text-muted uppercase tracking-wider">Ejercicios</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowLibrary(true)}
                    className="px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border/50 text-text-main hover:text-primary rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Base de Datos de Ejercicios"
                  >
                    <Sparkles size={14} /> Biblioteca
                  </button>
                  <button 
                    onClick={() => setShowAddExercise(true)}
                    className="px-3 py-1.5 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={14} /> Añadir
                  </button>
                </div>
              </div>

              {ejercicios.length === 0 ? (
                <div className="text-center py-10 text-sm text-text-muted border border-dashed border-border/50 rounded-2xl">
                  Esta plantilla está vacía.
                </div>
              ) : (
                <div className="space-y-2">
                  {ejercicios.map((ej, index) => (
                    <div 
                      key={ej.id} 
                      draggable
                      onDragStart={(e) => handleExerciseDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleExerciseDrop(e, index)}
                      className="p-3 bg-surface border border-border/50 rounded-xl flex items-center justify-between group cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-text-muted hover:text-white shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical size={16} />
                        </div>
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-black text-text-muted shrink-0">
                          {index + 1}
                        </div>
                        {/* Thumbnail image */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center shrink-0 border border-border/30">
                          {ej.imagen_url ? (
                            <img src={ej.imagen_url} alt={ej.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={18} className="text-text-muted/40" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-main">{ej.nombre}</p>
                          <p className="text-xs text-text-muted">{ej.series_objetivo} series x {ej.repeticiones_objetivo}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteExercise(ej.id)}
                        className="p-2 opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAddExercise && selectedPlantilla && (
        <AddExerciseModal
          plantillaId={selectedPlantilla.id}
          onClose={() => setShowAddExercise(false)}
          onExerciseAdded={onTemplateUpdated}
        />
      )}

      {showLibrary && selectedPlantilla && (
        <ExerciseLibraryModal 
          plantillaId={selectedPlantilla.id}
          onClose={() => setShowLibrary(false)}
          onExerciseAdded={fetchPlantillas}
        />
      )}
    </div>
  );
}
