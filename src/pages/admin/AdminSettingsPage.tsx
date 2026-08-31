import React from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { SettingsCms } from '../../components/admin/SettingsCms';
import { Sliders } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  return (
    <AdminLayout
      title="Pengaturan CMS & Konten Publik"
      subtitle="Kelola paket harga Lifetime deal, testimoni pelanggan, tanya jawab (FAQ), dan kontak bantuan."
    >
      <div className="space-y-6">
        <SettingsCms />
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;
