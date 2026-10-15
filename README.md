# Ruang Ujian — CBT SMA

Aplikasi Computer Based Test lokal untuk sekolah menengah atas. Data tersimpan di IndexedDB browser menggunakan Dexie, sehingga aplikasi bisa digunakan di perangkat yang sama tanpa backend.

## Menjalankan

Memerlukan Node.js 20 atau lebih baru.

```sh
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite. Untuk membuat paket produksi jalankan `npm run build`, lalu `npm run preview`. Unit test grading dan pengacakan: `npm test`.

## Akun demo

| Peran | Nama pengguna | Kata sandi |
| ----- | ------------- | ---------- |
| Admin | `admin`       | `admin123` |
| Guru  | `guru`        | `guru123`  |
| Siswa | `siswa`       | `siswa123` |

Kata sandi demo hanya untuk percobaan. Aplikasi menyimpan hash SHA-256 dengan salt per akun, bukan kata sandi teks biasa.

## Alur singkat

1. Admin mengelola akun dan kelas, lalu mengatur identitas sekolah. Impor pengguna mendukung kolom `username`, `nama`, `role`, `nisn`, `password` pada Excel/CSV.
2. Guru menambahkan soal pilihan ganda, pilihan ganda kompleks, atau benar/salah lewat menu **Input Soal**, mengelolanya di **Bank Soal**, lalu memilih soal saat membuat ujian dan membagikan token kepada peserta. Soal benar/salah dibuat sebagai tabel pernyataan dengan kunci Benar/Salah untuk tiap baris. Impor soal menggunakan kolom `kodeMapel`, `tipe`, `kesulitan`, `tag`, `pertanyaan`, `opsiA` sampai `opsiE`, `kunci`, `bobot`, dan `pembahasan`. Untuk pilihan ganda kompleks, isi beberapa kunci dengan huruf A–E yang dipisahkan koma; untuk benar/salah, gunakan `Benar` atau `Salah`.
3. Siswa memilih ujian, memasukkan token, menjawab soal, dan mengumpulkannya. Jawaban disimpan otomatis per perangkat dan sesi dapat dilanjutkan setelah refresh.
4. Guru melihat rekap nilai dan mengunduhnya ke Excel. Admin dapat mengunduh backup JSON lengkap dan memulihkannya dari menu Pengaturan.

## Catatan penggunaan

- PWA menyimpan shell aplikasi untuk penggunaan offline setelah kunjungan pertama. Data tidak tersinkron antar perangkat; gunakan backup/restore untuk pemindahan.
- Ujian demo memakai token `MTK2026`. Reset password dan impor Excel tersedia di area admin.
- Grafik ringkasan adalah visualisasi aktivitas contoh, sedangkan angka kartu dan daftar ujian mengikuti data IndexedDB.
- Soal pilihan ganda kompleks mendukung pilihan jawaban lebih dari satu dan penilaian parsial. Fitur seperti esai, koreksi manual, paket ujian lintas perangkat, dan monitoring proktor belum diimplementasikan.
