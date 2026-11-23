-- Seed the first public studio announcement once the media/news CMS exists.
-- ON CONFLICT keeps this safe to apply more than once and preserves later admin edits.
insert into public.studio_news (
  title,
  slug,
  excerpt,
  content,
  category,
  cover_image_url,
  status,
  published_at
)
values (
  'Memperkenalkan Tama Andrea Studio: Ruang Kreatif untuk Kebutuhan Desain Grafis',
  'memperkenalkan-tama-andrea-studio',
  'Tama Andrea Studio hadir sebagai studio desain grafis independen yang membantu personal, komunitas, dan usaha menyampaikan gagasan melalui komunikasi visual yang jelas, relevan, dan tertata.',
  E'Tama Andrea Studio memperkenalkan diri sebagai studio desain grafis independen yang berfokus pada kebutuhan komunikasi visual untuk personal, komunitas, dan usaha. Studio ini hadir dengan tujuan sederhana: membantu setiap gagasan disampaikan melalui desain yang jelas, relevan, dan tertata.\n\nBagi kami, desain bukan sekadar elemen dekoratif. Setiap karya perlu memiliki tujuan, menyampaikan pesan, dan menyesuaikan karakter kebutuhan. Karena itu, proses kreatif dimulai dengan memahami kebutuhan, referensi, serta informasi utama sebelum masuk ke tahap perancangan.\n\nMelalui website resmi Tama Andrea Studio, pengunjung dapat mengenal layanan yang tersedia, meninjau contoh karya, dan mengirimkan permintaan desain secara lebih praktis. Informasi layanan dan portofolio disajikan agar calon klien memiliki gambaran awal sebelum berdiskusi lebih lanjut.\n\nKe depan, Tama Andrea Studio akan terus mengembangkan kualitas karya, menyempurnakan proses layanan, dan mendokumentasikan perjalanan studio melalui halaman berita serta prestasi.\n\nTerima kasih telah berkunjung dan menjadi bagian dari langkah awal Tama Andrea Studio. Selamat datang di ruang kreatif kami.',
  'Kabar Studio',
  '/assets/images/news/tama-andrea-studio-opening.webp',
  'published',
  now()
)
on conflict (slug) do nothing;
