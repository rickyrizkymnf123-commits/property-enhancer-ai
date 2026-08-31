-- ============================================================================
-- Migration 00005: Seed Data
-- Default System Settings, API Providers, Pricing, Testimonials, and FAQs
-- ============================================================================

-- 1. Default API Provider Settings
INSERT INTO public.api_provider_settings (provider_name, model_name, is_default, is_active, config)
VALUES
    ('lovable', 'google/gemini-2.5-flash-image', true, true, '{"gateway_url": "https://ai-gateway.lovable.dev/v1/images/generations", "timeout_ms": 30000}'::jsonb),
    ('openai', 'dall-e-3', false, true, '{"model": "dall-e-3", "size": "1024x1024", "quality": "hd"}'::jsonb),
    ('gemini', 'gemini-1.5-pro-vision', false, true, '{"api_version": "v1beta"}'::jsonb),
    ('replicate', 'stability-ai/sdxl', false, true, '{"version": "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b"}'::jsonb)
ON CONFLICT (provider_name) DO UPDATE
SET model_name = EXCLUDED.model_name,
    is_default = EXCLUDED.is_default,
    is_active = EXCLUDED.is_active,
    config = EXCLUDED.config;

-- 2. Default Pricing Plan
INSERT INTO public.pricing_settings (package_name, price_idr, original_price_idr, monthly_quota, is_active, features)
VALUES (
    'Paket Lifetime Access',
    499000.00,
    999000.00,
    100,
    true,
    '["100 Foto Enhancements / Bulan", "Reset Kuota Otomatis Setiap 30 Hari", "Akses Semua Preset Eksterior & Interior (HDR, Twilight, Sky, Declutter)", "Resolusi Full HD & Bebas Watermark", "Penyimpanan Galeri Cloud Terenkripsi", "Dukungan Prioritas via WhatsApp"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 3. Default System / Admin Settings
INSERT INTO public.admin_settings (setting_key, setting_value, description)
VALUES
    ('site_branding', '{"app_name": "Property Enhancer AI", "tagline": "Transformasi Foto Properti Seketika dengan AI", "support_whatsapp": "6281234567890", "logo_url": "/logo.svg"}'::jsonb, 'General website branding and support contacts'),
    ('system_features', '{"allow_personal_api_keys": true, "batch_processing_enabled": false, "maintenance_mode": false, "max_upload_size_mb": 15}'::jsonb, 'System-wide feature flags and limitations'),
    ('ai_pipeline_defaults', '{"default_preset": "HDR_BALANCED", "max_concurrency_per_user": 3, "timeout_seconds": 60}'::jsonb, 'AI enhancement pipeline configuration')
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;

-- 4. Seed Testimonials (is_active = true)
INSERT INTO public.testimonials (author_name, author_role, author_company, quote, rating, is_active, sort_order)
VALUES
    (
        'Budi Santoso',
        'Principal Agent',
        'Century 21 Prima',
        'Property Enhancer AI menghemat waktu editing listing kami hingga 90%. Foto rumah tampak mewah seketika dan closing rate kami meningkat tajam!',
        5,
        true,
        1
    ),
    (
        'Rina Wijaya',
        'Property Marketing Specialist',
        'Ray White Sukses',
        'Preset Twilight Magic dan Sky Replacement-nya sangat natural. Klien pembeli sering memuji kualitas foto listing kami di portal properti.',
        5,
        true,
        2
    ),
    (
        'Hendro Nugroho',
        'Fotografer Properti Independen',
        'VisualPro Studio',
        'Fitur HDR balancing menjaga detail interior tanpa membuat jendela overexposed. Kuota 100 foto/bulan sangat sepadan dengan harganya.',
        5,
        true,
        3
    ),
    (
        'Dewi Anggraini',
        'Owner & Developer',
        'Graha Asri Residence',
        'Sangat mudah digunakan bahkan untuk tim sales di lapangan. Tinggal upload lewat smartphone dan hasil langsung siap diposting.',
        5,
        true,
        4
    )
ON CONFLICT DO NOTHING;

-- 5. Seed FAQs (is_active = true)
INSERT INTO public.faqs (question, answer, category, is_active, sort_order)
VALUES
    (
        'Bagaimana sistem kuota 100 foto / bulan bekerja?',
        'Setiap akun mendapatkan alokasi 100 foto enhancement setiap bulannya. Kuota akan direset otomatis menjadi 100 setiap 30 hari sejak tanggal aktivasi akun Anda tanpa biaya tambahan.',
        'quota',
        true,
        1
    ),
    (
        'Format dan resolusi foto apa saja yang didukung?',
        'Kami mendukung format JPG, JPEG, PNG, dan WEBP dengan ukuran maksimal 15MB per foto. Hasil olahan AI akan disimpan dalam format berkualitas tinggi tanpa kompresi berlebih.',
        'technical',
        true,
        2
    ),
    (
        'Bagaimana saya mendapatkan akses login setelah melakukan pembayaran?',
        'Sistem kami terhubung dengan webhook otomatis. Begitu pembayaran terverifikasi, kredensial login (Email & Password Sementara) akan dikirimkan langsung ke nomor WhatsApp Anda secara instan.',
        'account',
        true,
        3
    ),
    (
        'Apakah saya bisa menggunakan API Key AI pribadi saya sendiri (BYOK)?',
        'Ya! Di menu Pengaturan Akun, Anda dapat memasukkan API Key OpenAI atau Google Gemini milik Anda sendiri jika ingin memproses foto melebihi kuota bulanan standar.',
        'technical',
        true,
        4
    ),
    (
        'Apakah ada watermark pada hasil foto yang telah di-enhance?',
        'Tidak ada sama sekali. Semua foto yang diproses berhak cipta penuh milik Anda dan bebas digunakan untuk keperluan komersial, brosur, maupun listing online.',
        'license',
        true,
        5
    ),
    (
        'Apa yang harus saya lakukan jika kuota bulanan saya habis sebelum tanggal reset?',
        'Anda dapat menunggu hingga tanggal reset berikutnya (tertera jelas di dashboard Anda) atau mengintegrasikan API Key pribadi Anda di menu Pengaturan untuk melanjutkan proses enhance.',
        'quota',
        true,
        6
    )
ON CONFLICT DO NOTHING;
