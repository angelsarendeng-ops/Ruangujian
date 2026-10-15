import Dexie, { type EntityTable } from "dexie";
export type Role = "admin" | "guru" | "siswa";
export interface User {
  id?: number;
  username: string;
  role: Role;
  nama: string;
  kelasId?: number;
  nisn?: string;
  passwordHash: string;
  salt: string;
  aktif: boolean;
}
export interface Kelas {
  id?: number;
  nama: string;
  tingkat: string;
  jurusan: string;
  tahunAjaran: string;
}
export interface Mapel {
  id?: number;
  kode: string;
  nama: string;
}
export interface Question {
  id?: number;
  mapelId: number;
  guruId: number;
  tipe: string;
  kesulitan: string;
  tingkat: string;
  tag: string;
  pertanyaan: string;
  opsi: string[];
  kunci: string[];
  bobot: number;
  pembahasan: string;
  createdAt: string;
}
export interface Exam {
  id?: number;
  judul: string;
  mapelId: number;
  guruId: number;
  kelasIds: number[];
  tanggalMulai: string;
  tanggalSelesai: string;
  durasiMenit: number;
  token: string;
  acakSoal: boolean;
  acakOpsi: boolean;
  tampilkanHasil: boolean;
  kkm: number;
  maxPelanggaran: number;
  status: "draft" | "aktif" | "selesai";
  questionIds: number[];
}
export interface Session {
  id?: number;
  ujianId: number;
  siswaId: number;
  mulaiAt: string;
  selesaiAt?: string;
  batasAt: string;
  status: "mengerjakan" | "selesai" | "menunggu koreksi";
  urutanSoal: number[];
  jawaban: Record<number, string[]>;
  pelanggaran: number;
  skor?: number;
}
export interface Setting {
  key: string;
  value: unknown;
}
export interface Activity {
  id?: number;
  userId: number;
  aksi: string;
  detail: string;
  waktu: string;
}
class CBTDatabase extends Dexie {
  users!: EntityTable<User, "id">;
  kelas!: EntityTable<Kelas, "id">;
  mapel!: EntityTable<Mapel, "id">;
  soal!: EntityTable<Question, "id">;
  ujian!: EntityTable<Exam, "id">;
  sesi!: EntityTable<Session, "id">;
  pengaturan!: EntityTable<Setting, "key">;
  log!: EntityTable<Activity, "id">;
  constructor() {
    super("ruang-ujian-cbt");
    this.version(1).stores({
      users: "++id,&username,role,kelasId",
      kelas: "++id,nama,tingkat",
      mapel: "++id,&kode,nama",
      soal: "++id,mapelId,guruId,tipe,kesulitan,tingkat",
      ujian: "++id,mapelId,guruId,status,*kelasIds",
      sesi: "++id,ujianId,siswaId,status,[ujianId+siswaId]",
      pengaturan: "&key",
      log: "++id,userId,waktu",
    });
  }
}
export const db = new CBTDatabase();
export async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const result = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(result)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function seed() {
  if (await db.users.count()) {
    const demoExam = await db.ujian
      .where("judul")
      .equals("Asesmen Matematika — Persiapan UTBK")
      .first();
    if (demoExam?.id) {
      await db.ujian.update(demoExam.id, {
        judul: "Asesmen Bahasa Indonesia — Persiapan UTBK",
      });
    }
    const demoTeacher = await db.users.get({ username: "guru" });
    if (demoTeacher?.nama === "Ibu Sari, S.Pd.") {
      await db.users.update(demoTeacher.id!, {
        nama: "Ibu Enyel Kristi Sarendeng, S.Pd.,Gr",
      });
    }
    const school = await db.pengaturan.get("sekolah");
    if (school?.value === "SMA Negeri 1 Nusantara") {
      await db.pengaturan.put({
        key: "sekolah",
        value: "SMA Negeri 1 Halmahera Timur",
      });
    }
    return;
  }
  const salt = crypto.randomUUID();
  await db.transaction(
    "rw",
    [db.users, db.kelas, db.mapel, db.soal, db.ujian, db.pengaturan],
    async () => {
      const kelasId = Number(
        await db.kelas.add({
          nama: "XII IPA 1",
          tingkat: "XII",
          jurusan: "MIPA",
          tahunAjaran: "2025/2026",
        }),
      );
      const kelas2 = Number(
        await db.kelas.add({
          nama: "XI IPA 1",
          tingkat: "XI",
          jurusan: "MIPA",
          tahunAjaran: "2025/2026",
        }),
      );
      const matematika = Number(
        await db.mapel.add({ kode: "MTK", nama: "Matematika" }),
      );
      const indonesia = Number(
        await db.mapel.add({ kode: "BIN", nama: "Bahasa Indonesia" }),
      );
      await db.users.bulkAdd([
        {
          username: "admin",
          nama: "Administrator",
          role: "admin",
          aktif: true,
          salt,
          passwordHash: await hashPassword("admin123", salt),
        },
        {
          username: "guru",
          nama: "Ibu Enyel Kristi Sarendeng, S.Pd.,Gr",
          role: "guru",
          aktif: true,
          salt,
          passwordHash: await hashPassword("guru123", salt),
        },
        {
          username: "siswa",
          nama: "Andi Pratama",
          role: "siswa",
          kelasId,
          nisn: "0061234567",
          aktif: true,
          salt,
          passwordHash: await hashPassword("siswa123", salt),
        },
      ]);
      const guru = (await db.users.where("role").equals("guru").first())!;
      const soalIds = await db.soal.bulkAdd(
        [
          {
            mapelId: matematika,
            guruId: guru.id!,
            tipe: "Pilihan ganda",
            kesulitan: "Mudah",
            tingkat: "XII",
            tag: "aljabar",
            pertanyaan: "Hasil dari 2x + 5 = 13 adalah …",
            opsi: ["x = 2", "x = 4", "x = 6", "x = 9"],
            kunci: ["1"],
            bobot: 10,
            pembahasan: "2x = 8, maka x = 4.",
            createdAt: new Date().toISOString(),
          },
          {
            mapelId: matematika,
            guruId: guru.id!,
            tipe: "Pilihan ganda",
            kesulitan: "Sedang",
            tingkat: "XII",
            tag: "fungsi",
            pertanyaan: "Jika f(x) = x², nilai f(3) adalah …",
            opsi: ["6", "9", "12", "18"],
            kunci: ["1"],
            bobot: 10,
            pembahasan: "f(3) = 3² = 9.",
            createdAt: new Date().toISOString(),
          },
          {
            mapelId: indonesia,
            guruId: guru.id!,
            tipe: "Pilihan ganda",
            kesulitan: "Mudah",
            tingkat: "XI",
            tag: "teks",
            pertanyaan: "Gagasan utama dalam sebuah paragraf disebut …",
            opsi: ["Kalimat penjelas", "Ide pokok", "Simpulan", "Kata kunci"],
            kunci: ["1"],
            bobot: 10,
            pembahasan:
              "Ide pokok adalah gagasan utama yang menjadi dasar paragraf.",
            createdAt: new Date().toISOString(),
          },
        ],
        { allKeys: true },
      );
      await db.ujian.add({
        judul: "Asesmen Bahasa Indonesia — Persiapan UTBK",
        mapelId: matematika,
        guruId: guru.id!,
        kelasIds: [kelasId, kelas2],
        tanggalMulai: new Date(Date.now() - 3600000).toISOString(),
        tanggalSelesai: new Date(Date.now() + 7 * 86400000).toISOString(),
        durasiMenit: 60,
        token: "MTK2026",
        acakSoal: false,
        acakOpsi: false,
        tampilkanHasil: true,
        kkm: 75,
        maxPelanggaran: 3,
        status: "aktif",
        questionIds: soalIds.map(Number),
      });
      await db.pengaturan.bulkAdd([
        { key: "sekolah", value: "SMA Negeri 1 Halmahera Timur" },
        { key: "tahunAjaran", value: "2025/2026" },
        { key: "tema", value: "light" },
      ]);
    },
  );
  if (navigator.storage?.persist) await navigator.storage.persist();
}
