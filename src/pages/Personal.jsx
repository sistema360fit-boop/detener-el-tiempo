import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api as base44 } from "@/api/apiAdapter";
import PersonalList from "@/components/personal/PersonalList";
import PersonalForm from "@/components/personal/PersonalForm";
import ConfirmDeleteModal from "@/components/personal/ConfirmDeleteModal";
import { toast } from "sonner";

export default function GestionPersonal() {
  const [showForm, setShowForm] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [personaToDelete, setPersonaToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Obtener lista de personal
  const { data: personal = [], isLoading } = useQuery({
    queryKey: ['personal'],
    queryFn: async () => {
      try {
        const data = await base44.entities.Empleado.list();
        return data || [];
      } catch (error) {
        console.error('Error fetching personal:', error);
        toast.error("Error al cargar el personal");
        return [];
      }
    }
  });

  // Crear personal
  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Empleado.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['personal']);
      setShowForm(false);
      setEditingPersona(null);
      toast.success("Personal creado exitosamente");
    },
    onError: (error) => {
      console.error('Error creating personal:', error);
      toast.error(error.message || "Error al crear personal");
    }
  });

  // Actualizar personal
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Empleado.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['personal']);
      setShowForm(false);
      setEditingPersona(null);
      toast.success("Personal actualizado exitosamente");
    },
    onError: (error) => {
      console.error('Error updating personal:', error);
      toast.error(error.message || "Error al actualizar personal");
    }
  });

  // Eliminar personal
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Empleado.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['personal']);
      setPersonaToDelete(null);
      setIsDeleting(false);
      toast.success("Personal eliminado exitosamente");
    },
    onError: (error) => {
      setIsDeleting(false);
      console.error('Error deleting personal:', error);
      toast.error(error.message || "Error al eliminar personal");
    }
  });

  const handleSubmit = (data) => {
    if (editingPersona) {
      updateMutation.mutate({ id: editingPersona.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (persona) => {
    setEditingPersona(persona);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    const persona = personal.find(p => p.id === id);
    setPersonaToDelete(persona);
  };

  const handleConfirmDelete = () => {
    if (isDeleting) return;
    setIsDeleting(true);
    deleteMutation.mutate(personaToDelete.id);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPersona(null);
  };

  const handleNuevo = () => {
    setEditingPersona(null);
    setShowForm(true);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Gestión de Personal
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra los usuarios y permisos del sistema
          </p>
        </div>

        {showForm && (
          <PersonalForm
            persona={editingPersona}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}

        <PersonalList
          personal={personal}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onNuevo={handleNuevo}
          isLoading={isLoading}
        />

        <ConfirmDeleteModal
          persona={personaToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPersonaToDelete(null)}
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
}
