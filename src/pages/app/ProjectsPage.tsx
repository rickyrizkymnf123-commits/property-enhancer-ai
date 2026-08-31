import React, { useState } from 'react';
import AppSidebar from '../../components/shared/AppSidebar';
import Header from '../../components/shared/Header';
import { useProjects, Project } from '../../hooks/useProjects';
import {
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  FileText,
  Calendar,
  X,
  Sparkles,
  Building,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const ProjectsPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const { projects, isLoading, createProject, updateProject, deleteProject } = useProjects();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const openCreateModal = () => {
    setEditingProject(null);
    setName('');
    setDescription('');
    setAddress('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description || '');
    setAddress(project.address || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Nama proyek wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingProject) {
        const { error } = await updateProject(editingProject.id, {
          name: name.trim(),
          description: description.trim() || null,
          address: address.trim() || null,
        });
        if (error) throw error;
      } else {
        const { error } = await createProject({
          name: name.trim(),
          description: description.trim() || null,
          address: address.trim() || null,
        });
        if (error) throw error;
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan proyek');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, projectName: string) => {
    const confirmDelete = window.confirm(`Hapus proyek "${projectName}"?`);
    if (!confirmDelete) return;

    await deleteProject(id);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex" data-testid="projects-page">
      {/* Sidebar */}
      <AppSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Manajemen Proyek Properti"
          subtitle="Kelompokkan dan kelola foto berdasarkan listing dan properti Anda"
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          actions={
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all hover:scale-105"
              data-testid="create-project-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Proyek Baru</span>
            </button>
          }
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Projects Grid */}
          {isLoading ? (
            <div className="text-center py-20 text-slate-400">Memuat daftar proyek...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-slate-900/30 space-y-4">
              <FolderKanban className="w-12 h-12 text-slate-600 mx-auto" />
              <div>
                <h3 className="text-base font-semibold text-slate-200">Belum ada proyek dibuat</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Buat proyek pertama Anda untuk mengelompokkan foto properti berdasarkan alamat atau nama listing.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Proyek Baru</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="projects-grid">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="p-6 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-md hover:border-purple-500/40 transition-all duration-200 shadow-xl space-y-4 flex flex-col justify-between group"
                  data-testid={`project-card-${project.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)] shrink-0">
                        <Building className="w-5 h-5" />
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(project)}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Edit Proyek"
                          data-testid={`edit-project-btn-${project.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(project.id, project.name)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Hapus Proyek"
                          data-testid={`delete-project-btn-${project.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-bold font-heading text-white group-hover:text-purple-200 transition-colors">
                        {project.name}
                      </h4>
                      {project.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {project.description}
                        </p>
                      )}
                    </div>

                    {project.address && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">{project.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(project.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
          data-testid="project-modal"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-purple-500/30 p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-purple-400" />
                <span>{editingProject ? 'Edit Proyek Properti' : 'Buat Proyek Properti Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Nama Proyek / Listing <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cluster Grand Beverly No. 12"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  data-testid="project-name-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Alamat / Lokasi</label>
                <input
                  type="text"
                  placeholder="Contoh: BSD City, Tangerang Selatan"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  data-testid="project-address-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Deskripsi Singkat</label>
                <textarea
                  rows={3}
                  placeholder="Catatan mengenai tipe rumah, kamar, luas tanah..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  data-testid="project-description-input"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                  data-testid="save-project-btn"
                >
                  {isSubmitting ? 'Menyimpan...' : editingProject ? 'Perbarui Proyek' : 'Buat Proyek'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
