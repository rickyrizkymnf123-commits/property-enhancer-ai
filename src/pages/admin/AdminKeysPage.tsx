import React from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { KobilLlmConfigView } from '../../components/admin/KobilLlmConfigView';

export const AdminKeysPage: React.FC = () => {
  return (
    <AdminLayout
      title="Pengaturan API (Kobil LLM)"
      subtitle="Konfigurasi AI central untuk semua edge function. API key dan model dipilih di sini."
    >
      <div className="space-y-6">
        <KobilLlmConfigView />
      </div>
    </AdminLayout>
  );
};

export default AdminKeysPage;
