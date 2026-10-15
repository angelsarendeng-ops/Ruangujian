import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import toast from "react-hot-toast";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  X,
} from "lucide-react";
import {
  db,
  hashPassword,
  type User,
  type Exam,
  type Question,
  type Kelas,
  type Mapel,
  type Session,
} from "../db/database";
import { useSession } from "../store/session";
import { gradeAnswer, shuffle } from "../lib/grading";
type Section =
  | "Ringkasan"
  | "Pengguna"
  | "Kelas & Mapel"
  | "Bank Soal"
  | "Ujian"
  | "Rekap Nilai"
  | "Aktivitas"
  | "Pengaturan";
const nav: { label: Section; icon: typeof LayoutDashboard; roles: string[] }[] =
  [
    {
      label: "Ringkasan",
      icon: LayoutDashboard,
      roles: ["admin", "guru", "siswa"],
    },
    { label: "Pengguna", icon: Users, roles: ["admin"] },
    { label: "Kelas & Mapel", icon: GraduationCap, roles: ["admin"] },
    { label: "Bank Soal", icon: BookOpen, roles: ["guru"] },
    { label: "Ujian", icon: Clock3, roles: ["guru", "siswa"] },
    { label: "Rekap Nilai", icon: Activity, roles: ["guru"] },
    { label: "Aktivitas", icon: Activity, roles: ["admin"] },
    { label: "Pengaturan", icon: Settings, roles: ["admin"] },
  ];
const titleMap = {
  admin: "Administrator",
  guru: "Ruang Guru",
  siswa: "Ruang Siswa",
};
function App() {
  const { user, setUser } = useSession();
  const [section, setSection] = useState<Section>("Ringkasan");
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  if (!user) return <Login onLogin={setUser} />;
  const allowed = nav.filter((n) => n.roles.includes(user.role));
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <GraduationCap size={22} />
          </div>
          <div>
            <strong>
              ruang<span>ujian</span>
            </strong>
            <small>PORTAL CBT SEKOLAH</small>
          </div>
        </div>
        <div className="school-chip">
          <div className="school-mark">SN</div>
          <div>
            <strong>SMA Negeri 1 Halmahera Timur</strong>
            <small>Tahun ajaran 2025/2026</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <p className="nav-caption">MENU UTAMA</p>
        <nav>
          {allowed.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={"nav-item " + (section === label ? "active" : "")}
              onClick={() => setSection(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Ujian" && user.role === "siswa" && (
                <i className="nav-dot" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-orb">✦</div>
            <strong>Butuh bantuan?</strong>
            <p>Hubungi proktor atau administrator sekolah.</p>
            <button onClick={() => toast("Silakan hubungi proktor sekolah.")}>
              Pusat bantuan <ArrowRight size={14} />
            </button>
          </div>
          <div className="user-mini">
            <div className="avatar">
              {user.nama
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="user-mini-info">
              <strong>{user.nama}</strong>
              <small>{titleMap[user.role]}</small>
            </div>
            <button
              aria-label="Keluar"
              className="icon-button"
              onClick={() => setUser(null)}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="crumb">
            <span>Portal Sekolah</span>
            <span className="slash">/</span>
            <strong>{section}</strong>
          </div>
          <div className="top-actions">
            <span className="today">Kamis, 15 Oktober 2026</span>
            <button
              className="icon-button"
              aria-label="Ganti tema"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="avatar avatar-small" title={user.nama}>
              {user.nama.slice(0, 1)}
            </button>
          </div>
        </header>
        <section className="page-content">
          <div className="mobile-head">
            <div className="brand">
              <div className="brand-icon">
                <GraduationCap size={22} />
              </div>
              <strong>ruangujian</strong>
            </div>
          </div>
          {section === "Ringkasan" ? (
            <Dashboard user={user} go={setSection} />
          ) : section === "Pengguna" ? (
            <UsersPage />
          ) : section === "Kelas & Mapel" ? (
            <MasterPage />
          ) : section === "Bank Soal" ? (
            <QuestionsPage user={user} />
          ) : section === "Ujian" ? (
            <ExamsPage user={user} />
          ) : section === "Rekap Nilai" ? (
            <ResultsPage />
          ) : section === "Aktivitas" ? (
            <ActivityPage />
          ) : (
            <SettingsPage />
          )}
        </section>
      </main>
    </div>
  );
}
export default App;
function Login({ onLogin }: { onLogin: (u: User | null) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await db.users
        .where("username")
        .equals(username.trim())
        .first();
      if (
        !u ||
        !u.aktif ||
        (await hashPassword(password, u.salt)) !== u.passwordHash
      )
        throw Error("Nama pengguna atau kata sandi tidak sesuai.");
      onLogin(u);
      await db.log.add({
        userId: u.id!,
        aksi: "Masuk",
        detail: `Login sebagai ${u.role}`,
        waktu: new Date().toISOString(),
      });
      toast.success(`Selamat datang, ${u.nama.split(" ")[0]}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tidak dapat masuk.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-screen">
      <div className="login-art">
        <div className="art-top">
          <div className="brand brand-light">
            <div className="brand-icon">
              <GraduationCap size={23} />
            </div>
            <div>
              <strong>
                ruang<span>ujian</span>
              </strong>
              <small>PORTAL CBT SEKOLAH</small>
            </div>
          </div>
          <div className="art-badge">
            <span className="status-pulse" /> SISTEM UJIAN DIGITAL
          </div>
        </div>
        <div className="art-copy">
          <div className="eyebrow">BELAJAR. BERKEMBANG. BERPRESTASI.</div>
          <h1 className="school-title">SMA Negeri 1 Halmahera Timur</h1>
          <p>
            Platform ujian digital yang dirancang untuk mendukung perjalanan
            akademikmu.
          </p>
          <div className="art-stats">
            <div>
              <strong>100%</strong>
              <span>Offline-ready</span>
            </div>
            <div>
              <strong>Terukur</strong>
              <span>Hasil belajar</span>
            </div>
            <div>
              <strong>Aman</strong>
              <span>Data tersimpan lokal</span>
            </div>
          </div>
        </div>
        <div className="art-foot">
          <span>✳ &nbsp; SMA Negeri 1 Halmahera Timur</span>
          <span>Belajar dengan percaya diri</span>
        </div>
        <div className="art-shape shape-a" />
        <div className="art-shape shape-b" />
        <div className="art-ring" />
      </div>
      <div className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <div className="form-symbol">
            <ShieldCheck size={23} />
          </div>
          <p className="eyebrow dark-eyebrow">PORTAL AKADEMIK</p>
          <h2>Selamat datang</h2>
          <p className="muted">Masuk untuk melanjutkan ke ruang belajarmu.</p>
          <label>
            Nama pengguna
            <input
              autoFocus
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan nama pengguna"
            />
          </label>
          <label>
            Kata sandi
            <div className="password-wrap">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
              />
              <ShieldCheck size={17} />
            </div>
          </label>
          <button
            className="button button-primary login-submit"
            disabled={busy}
          >
            {busy ? "Memeriksa…" : "Masuk ke Portal"}
            <ArrowRight size={17} />
          </button>
          <div className="login-separator">
            <span /> Akses demo lokal <span />
          </div>
          <div className="demo-logins">
            <button
              type="button"
              onClick={() => {
                setUsername("admin");
                setPassword("admin123");
              }}
            >
              Admin <span>admin / admin123</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername("guru");
                setPassword("guru123");
              }}
            >
              Guru <span>guru / guru123</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername("siswa");
                setPassword("siswa123");
              }}
            >
              Siswa <span>siswa / siswa123</span>
            </button>
          </div>
          <p className="login-security">
            <ShieldCheck size={14} /> Koneksi terenkripsi · Data tersimpan aman
            di perangkat ini
          </p>
        </form>
        <div className="login-copyright">
          © 2026 SMA Negeri 1 Halmahera Timur <span>·</span> Dibuat untuk
          pendidikan Indonesia
        </div>
      </div>
    </main>
  );
}
function Dashboard({ user, go }: { user: User; go: (s: Section) => void }) {
  const users = useLiveQuery(() => db.users.toArray(), []) || [];
  const exams = useLiveQuery(() => db.ujian.toArray(), []) || [];
  const classes = useLiveQuery(() => db.kelas.toArray(), []) || [];
  const sessions = useLiveQuery(() => db.sesi.toArray(), []) || [];
  const qs = useLiveQuery(() => db.soal.toArray(), []) || [];
  const firstName = user.nama.split(" ")[0];
  const roleCopy =
    user.role === "admin"
      ? "Berikut ringkasan aktivitas akademik sekolah hari ini."
      : user.role === "guru"
        ? "Pantau kelas dan aktivitas asesmen Anda."
        : "Siap untuk tantangan belajar hari ini?";
  const active = exams.filter(
    (e) => new Date(e.tanggalSelesai) > new Date(),
  ).length;
  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow dark-eyebrow">
            KAMIS, 15 OKTOBER 2026 <span className="tiny-sun">☀</span>
          </div>
          <h1>
            Selamat pagi, {firstName} <span className="wave">✦</span>
          </h1>
          <p className="muted">{roleCopy}</p>
        </div>
        {user.role === "siswa" && (
          <div className="streak-card">
            <span>✧</span>
            <div>
              <strong>Semangat belajar!</strong>
              <small>Jaga konsistensi belajarmu hari ini.</small>
            </div>
          </div>
        )}
      </div>
      <div className="stat-grid">
        {(user.role === "siswa"
          ? [
              {
                icon: Clock3,
                label: "Ujian tersedia",
                value: active,
                tint: "violet",
                foot: "Siap untuk dikerjakan",
              },
              {
                icon: CheckCircle2,
                label: "Ujian selesai",
                value: sessions.filter(
                  (s) => s.siswaId === user.id && s.status === "selesai",
                ).length,
                tint: "green",
                foot: "Terus tingkatkan hasilmu",
              },
              {
                icon: BookOpen,
                label: "Mata pelajaran",
                value: 4,
                tint: "amber",
                foot: "Semester ganjil 2025/26",
              },
              {
                icon: Activity,
                label: "Rata-rata nilai",
                value: "—",
                tint: "blue",
                foot: "Belum ada hasil",
              },
            ]
          : user.role === "guru"
            ? [
                {
                  icon: Users,
                  label: "Total siswa",
                  value: users.filter((u) => u.role === "siswa").length,
                  tint: "violet",
                  foot: "Terdaftar di sekolah",
                },
                {
                  icon: FileSpreadsheet,
                  label: "Bank soal",
                  value: qs.length,
                  tint: "green",
                  foot: "Soal siap digunakan",
                },
                {
                  icon: Clock3,
                  label: "Ujian aktif",
                  value: active,
                  tint: "amber",
                  foot: "Sedang berlangsung",
                },
                {
                  icon: CheckCircle2,
                  label: "Sudah dinilai",
                  value: sessions.filter((s) => s.status === "selesai").length,
                  tint: "blue",
                  foot: "Dari seluruh sesi",
                },
              ]
            : [
                {
                  icon: Users,
                  label: "Total siswa",
                  value: users.filter((u) => u.role === "siswa").length,
                  tint: "violet",
                  foot: "Siswa terdaftar aktif",
                },
                {
                  icon: GraduationCap,
                  label: "Tenaga pengajar",
                  value: users.filter((u) => u.role === "guru").length,
                  tint: "green",
                  foot: "Guru aktif mengajar",
                },
                {
                  icon: LayoutDashboard,
                  label: "Rombongan belajar",
                  value: classes.length,
                  tint: "amber",
                  foot: "Tahun ajaran 2025/2026",
                },
                {
                  icon: Clock3,
                  label: "Ujian berlangsung",
                  value: active,
                  tint: "blue",
                  foot: "Seluruh mata pelajaran",
                },
              ]
        ).map(({ icon: Icon, label, value, tint, foot }) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              <div className={"stat-icon " + tint}>
                <Icon size={19} />
              </div>
              <span className="stat-more">•••</span>
            </div>
            <span className="stat-label">{label}</span>
            <strong className="stat-value">{value}</strong>
            <div className="stat-foot">
              <span className="trend">↗</span>
              {foot}
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="panel exam-panel">
          <div className="panel-heading">
            <div>
              <h3>
                {user.role === "siswa" ? "Ujian untukmu" : "Aktivitas ujian"}
              </h3>
              <p>
                {user.role === "siswa"
                  ? "Ujian yang dapat kamu ikuti saat ini"
                  : "Pantau ujian yang sedang berjalan"}
              </p>
            </div>
            <button className="text-button" onClick={() => go("Ujian")}>
              Lihat semua <ArrowRight size={14} />
            </button>
          </div>
          <ExamList exams={exams} user={user} compact />
        </div>
        <div className="panel schedule-panel">
          <div className="panel-heading">
            <div>
              <h3>Jadwal mendatang</h3>
              <p>Agenda akademik terdekat</p>
            </div>
            <button className="icon-button" onClick={() => go("Ujian")}>
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="schedule-item">
            <div className="date-block">
              <strong>20</strong>
              <span>OKT</span>
            </div>
            <div>
              <strong>Penilaian Tengah Semester</strong>
              <small>Matematika · XII IPA 1</small>
            </div>
            <span className="schedule-mark" />
          </div>
          <div className="schedule-item">
            <div className="date-block peach">
              <strong>23</strong>
              <span>OKT</span>
            </div>
            <div>
              <strong>Latihan Asesmen Literasi</strong>
              <small>Bahasa Indonesia · XI IPA 1</small>
            </div>
            <span className="schedule-mark muted-mark" />
          </div>
          <div className="schedule-note">
            <Clock3 size={15} /> Jadwal diperbarui oleh sekolah
          </div>
        </div>
      </div>
      <div className="bottom-grid">
        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h3>Performa akademik</h3>
              <p>Aktivitas asesmen minggu ini</p>
            </div>
            <button className="period-pill">
              7 hari terakhir <ChevronDown size={14} />
            </button>
          </div>
          <div className="chart-area">
            <div className="chart-y">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            <div className="chart-main">
              <div className="chart-grid-lines">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="bars">
                {[
                  ["SEN", 48, 34],
                  ["SEL", 67, 43],
                  ["RAB", 52, 60],
                  ["KAM", 82, 50],
                  ["JUM", 60, 72],
                  ["SAB", 38, 45],
                  ["MIN", 26, 35],
                ].map(([d, a, b]) => (
                  <div className="bar-day" key={d}>
                    <div className="bar-pair">
                      <i style={{ height: `${a}%` }} />
                      <i style={{ height: `${b}%` }} />
                    </div>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="chart-legend">
            <span>
              <i /> Siswa mengikuti ujian
            </span>
            <span>
              <i /> Ujian diselesaikan
            </span>
          </div>
        </div>
        <div className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <h3>Akses cepat</h3>
              <p>Yang sering Anda butuhkan</p>
            </div>
          </div>
          <div className="quick-list">
            {(
              (user.role === "admin"
                ? [
                    ["Pengguna baru", "Kelola akun sekolah", "Pengguna", Users],
                    [
                      "Atur sekolah",
                      "Profil & tahun ajaran",
                      "Pengaturan",
                      Settings,
                    ],
                    [
                      "Data kelas",
                      "Lihat rombongan belajar",
                      "Kelas & Mapel",
                      GraduationCap,
                    ],
                  ]
                : user.role === "guru"
                  ? [
                      ["Buat ujian", "Atur ujian baru", "Ujian", Plus],
                      [
                        "Bank soal",
                        "Kelola kumpulan soal",
                        "Bank Soal",
                        BookOpen,
                      ],
                      [
                        "Rekap hasil",
                        "Analisis nilai siswa",
                        "Rekap Nilai",
                        Activity,
                      ],
                    ]
                  : [
                      [
                        "Mulai ujian",
                        "Lihat ujian tersedia",
                        "Ujian",
                        ArrowRight,
                      ],
                      [
                        "Lihat hasil",
                        "Periksa nilai ujian",
                        "Ujian",
                        CheckCircle2,
                      ],
                      [
                        "Panduan ujian",
                        "Tips sebelum memulai",
                        "Ringkasan",
                        ShieldCheck,
                      ],
                    ]) as [string, string, Section, any][]
            ).map(([label, sub, target, Icon]) => (
              <button
                className="quick-item"
                key={label}
                onClick={() => go(target)}
              >
                <span className="quick-icon">
                  <Icon size={17} />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{sub}</small>
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
function ExamList({
  exams,
  user,
  compact = false,
}: {
  exams: Exam[];
  user: User;
  compact?: boolean;
}) {
  const [open, setOpen] = useState<Exam | null>(null);
  const subjects = useLiveQuery(() => db.mapel.toArray(), []) || [];
  const list = exams.filter(
    (e) =>
      user.role !== "siswa" ||
      !user.kelasId ||
      e.kelasIds.includes(user.kelasId),
  );
  return (
    <>
      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Clock3 />
          </div>
          <strong>Belum ada ujian</strong>
          <span>Ujian yang dijadwalkan akan tampil di sini.</span>
        </div>
      ) : (
        <div className="exam-list">
          {(compact ? list.slice(0, 3) : list).map((e) => (
            <div className="exam-row" key={e.id}>
              <div className="subject-icon">
                {e.judul.toUpperCase().includes("MATEMATIKA") ||
                subjects.find((s) => s.id === e.mapelId)?.kode === "MTK"
                  ? "∑"
                  : "B"}
              </div>
              <div className="exam-details">
                <strong>{e.judul}</strong>
                <small>
                  {subjects.find((s) => s.id === e.mapelId)?.nama ||
                    "Mata pelajaran"}{" "}
                  <span>·</span> {e.durasiMenit} menit
                </small>
              </div>
              <span className="status-pill live">
                <i />
                Berlangsung
              </span>
              <button
                className="button button-small button-soft"
                onClick={() => setOpen(e)}
              >
                {user.role === "siswa" ? "Mulai ujian" : "Lihat"}{" "}
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      {open && (
        <ExamRunner exam={open} close={() => setOpen(null)} user={user} />
      )}
    </>
  );
}
function ExamRunner({
  exam,
  close,
  user,
}: {
  exam: Exam;
  close: () => void;
  user: User;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [idx, setIdx] = useState(0);
  const [token, setToken] = useState("");
  const [seconds, setSeconds] = useState(exam.durasiMenit * 60);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const questions =
    useLiveQuery(
      () => db.soal.where("id").anyOf(exam.questionIds).toArray(),
      [exam.id],
    ) || [];
  const session = useLiveQuery(
    () =>
      db.sesi.where("[ujianId+siswaId]").equals([exam.id!, user.id!]).first(),
    [exam.id, user.id],
  );
  const ordered = useMemo(
    () =>
      exam.acakSoal
        ? shuffle(questions)
        : [...questions].sort(
            (a, b) =>
              exam.questionIds.indexOf(a.id!) - exam.questionIds.indexOf(b.id!),
          ),
    [questions, exam.acakSoal, exam.id],
  );
  useEffect(() => {
    if (session) {
      setAnswers(session.jawaban);
      setSeconds(
        Math.max(
          0,
          Math.floor((new Date(session.batasAt).getTime() - Date.now()) / 1000),
        ),
      );
      setConfirmed(session.status === "mengerjakan");
    }
  }, [session?.id]);
  useEffect(() => {
    if (!confirmed) return;
    const timer = setInterval(
      () =>
        setSeconds(
          Math.max(
            0,
            Math.floor(
              (new Date(
                session?.batasAt || Date.now() + exam.durasiMenit * 60000,
              ).getTime() -
                Date.now()) /
                1000,
            ),
          ),
        ),
      400,
    );
    return () => clearInterval(timer);
  }, [confirmed, session?.batasAt]);
  useEffect(() => {
    if (confirmed && seconds === 0) submitExam();
  }, [seconds]);
  const violations = useRef(0);
  useEffect(() => {
    violations.current = session?.pelanggaran || 0;
  }, [session?.id]);
  useEffect(() => {
    if (!confirmed) return;
    const report = async () => {
      if (!session?.id) return;
      violations.current += 1;
      const count = violations.current;
      await db.sesi.update(session.id, { pelanggaran: count });
      toast.error(`Pelanggaran tercatat (${count}/${exam.maxPelanggaran}).`);
      if (count >= exam.maxPelanggaran) void submitExam();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void report();
    };
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      void report();
    };
    const onClipboard = (e: Event) => {
      e.preventDefault();
      void report();
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        void report();
      }
    };
    const onBlur = () => void report();
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("copy", onClipboard);
    document.addEventListener("paste", onClipboard);
    document.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("copy", onClipboard);
      document.removeEventListener("paste", onClipboard);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [confirmed, session?.id, exam.maxPelanggaran]);
  async function begin() {
    if (token.toUpperCase() !== exam.token.toUpperCase()) {
      toast.error("Token ujian tidak sesuai.");
      return;
    }
    const existing = await db.sesi
      .where("[ujianId+siswaId]")
      .equals([exam.id!, user.id!])
      .first();
    if (existing) {
      setAnswers(existing.jawaban);
      setConfirmed(true);
      return;
    }
    const start = Date.now();
    const id = await db.sesi.add({
      ujianId: exam.id!,
      siswaId: user.id!,
      mulaiAt: new Date(start).toISOString(),
      batasAt: new Date(start + exam.durasiMenit * 60000).toISOString(),
      status: "mengerjakan",
      urutanSoal: ordered.map((q) => q.id!),
      jawaban: {},
      pelanggaran: 0,
    });
    await db.log.add({
      userId: user.id!,
      aksi: "Mulai ujian",
      detail: exam.judul,
      waktu: new Date().toISOString(),
    });
    void id;
    setConfirmed(true);
    if (document.documentElement.requestFullscreen)
      void document.documentElement.requestFullscreen().catch(() => {});
  }
  async function updateAnswer(id: number, value: string[]) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    const existing = await db.sesi
      .where("[ujianId+siswaId]")
      .equals([exam.id!, user.id!])
      .first();
    if (existing?.id) await db.sesi.update(existing.id, { jawaban: next });
  }
  async function submitExam() {
    if (!confirmed) return;
    const s = await db.sesi
      .where("[ujianId+siswaId]")
      .equals([exam.id!, user.id!])
      .first();
    if (!s?.id) return;
    const total = ordered.reduce((n, q) => n + q.bobot, 0);
    let earned = 0;
    for (const q of ordered)
      earned += gradeAnswer(
        q.tipe,
        s.jawaban[q.id!] || [],
        q.kunci,
        q.bobot,
        q.tipe === "Pilihan ganda kompleks",
      );
    const score = total ? Math.round((earned / total) * 100) : 0;
    const status = ordered.some((q) => q.tipe === "Esai")
      ? "menunggu koreksi"
      : "selesai";
    await db.sesi.update(s.id, {
      status,
      skor: score,
      selesaiAt: new Date().toISOString(),
    });
    await db.log.add({
      userId: user.id!,
      aksi: "Mengumpulkan ujian",
      detail: exam.judul,
      waktu: new Date().toISOString(),
    });
    toast.success("Jawaban berhasil dikumpulkan.");
    if (document.fullscreenElement) void document.exitFullscreen();
    close();
  }
  if (!confirmed)
    return (
      <div className="modal-backdrop">
        <div className="modal exam-confirm">
          <button className="modal-close" onClick={close}>
            <X />
          </button>
          <div className="modal-mark">
            <BookOpen />
          </div>
          <span className="eyebrow dark-eyebrow">SEBELUM MEMULAI</span>
          <h2>{exam.judul}</h2>
          <p className="muted">
            Pastikan kamu berada di tempat yang nyaman dan memiliki koneksi daya
            yang cukup.
          </p>
          <div className="exam-rules">
            <span>
              <Clock3 /> Durasi <strong>{exam.durasiMenit} menit</strong>
            </span>
            <span>
              <BookOpen /> Jumlah soal <strong>{questions.length} soal</strong>
            </span>
            <span>
              <ShieldCheck /> Maks. pelanggaran{" "}
              <strong>{exam.maxPelanggaran} kali</strong>
            </span>
          </div>
          <label>
            Token ujian
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Masukkan token dari pengawas"
            />
          </label>
          <div className="rules-note">
            Dengan memulai ujian, kamu menyetujui tata tertib ujian dan memahami
            bahwa waktu akan terus berjalan.
          </div>
          <button className="button button-primary full" onClick={begin}>
            Konfirmasi & mulai ujian <ArrowRight />
          </button>
          <button className="button button-ghost full" onClick={close}>
            Kembali ke dashboard
          </button>
        </div>
      </div>
    );
  const q = ordered[idx];
  return (
    <div className="modal-backdrop exam-overlay">
      <div className="test-shell">
        <header>
          <button onClick={close} className="icon-button">
            <ArrowLeft />
          </button>
          <div>
            <strong>{exam.judul}</strong>
            <small>
              {user.nama} · {questions.length} soal
            </small>
          </div>
          <div className="timer">
            <Clock3 size={16} />
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </div>
        </header>
        <div className="test-body">
          <aside className="question-nav">
            <h4>NOMOR SOAL</h4>
            <div className="question-numbers">
              {ordered.map((x, i) => (
                <button
                  className={
                    (idx === i ? "current " : "") +
                    (answers[x.id!]?.length ? "answered" : "")
                  }
                  key={x.id}
                  onClick={() => setIdx(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="test-legend">
              <span>
                <i /> Belum dijawab
              </span>
              <span>
                <i className="legend-done" /> Sudah dijawab
              </span>
            </div>
            <div className="progress-info">
              Progres pengerjaan
              <strong>
                {Object.values(answers).filter((a) => a.length).length} dari{" "}
                {questions.length}
              </strong>
              <div className="progress-track">
                <i
                  style={{
                    width: `${questions.length ? (Object.values(answers).filter((a) => a.length).length / questions.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </aside>
          <article className="question-content">
            <div className="question-meta">
              <span>
                SOAL {idx + 1} DARI {ordered.length}
              </span>
              <span className="weight-chip">Bobot {q?.bobot || 0} poin</span>
            </div>
            <h2>{q?.pertanyaan || "Memuat soal…"}</h2>
            <div className="answer-options">
              {q?.opsi.map((option, i) => (
                <button
                  key={i}
                  className={
                    "answer-option " +
                    (answers[q.id!]?.includes(String(i)) ? "selected" : "")
                  }
                  onClick={() => void updateAnswer(q.id!, [String(i)])}
                >
                  <i className="option-letter">{String.fromCharCode(65 + i)}</i>
                  <span>{option}</span>
                  {answers[q.id!]?.includes(String(i)) && <Check size={17} />}
                </button>
              ))}
            </div>
            <div className="question-footer">
              <span>
                Jawaban tersimpan otomatis <CheckCircle2 size={15} />
              </span>
              <div>
                <button
                  className="button button-ghost"
                  disabled={idx === 0}
                  onClick={() => setIdx(idx - 1)}
                >
                  <ArrowLeft size={16} /> Sebelumnya
                </button>
                {idx < ordered.length - 1 ? (
                  <button
                    className="button button-primary"
                    onClick={() => setIdx(idx + 1)}
                  >
                    Selanjutnya <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className="button button-primary"
                    onClick={() => void submitExam()}
                  >
                    Kumpulkan ujian <Check size={16} />
                  </button>
                )}
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow dark-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
function UsersPage() {
  const users = useLiveQuery(() => db.users.toArray(), []) || [];
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("siswa");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    username: "",
    password: "",
    role: "siswa" as User["role"],
    kelasId: 0,
    nisn: "",
  });
  const classes = useLiveQuery(() => db.kelas.toArray(), []) || [];
  const visible = users
    .filter(
      (u) =>
        u.nama.toLowerCase().includes(query.toLowerCase()) ||
        u.username.includes(query),
    )
    .filter((u) => role === "semua" || u.role === role);
  async function create() {
    if (!form.nama || !form.username || form.password.length < 6) {
      toast.error("Lengkapi formulir. Kata sandi minimal 6 karakter.");
      return;
    }
    if (await db.users.where("username").equals(form.username).first()) {
      toast.error("Nama pengguna sudah digunakan.");
      return;
    }
    const salt = crypto.randomUUID();
    await db.users.add({
      ...form,
      kelasId:
        form.role === "siswa" ? form.kelasId || classes[0]?.id : undefined,
      passwordHash: await hashPassword(form.password, salt),
      salt,
      aktif: true,
    });
    toast.success("Pengguna berhasil ditambahkan.");
    setShow(false);
    setForm({
      nama: "",
      username: "",
      password: "",
      role: "siswa",
      kelasId: 0,
      nisn: "",
    });
  }
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRASI SEKOLAH"
        title="Pengguna"
        description="Kelola akun siswa, guru, dan akses portal sekolah."
        action={
          <button
            className="button button-primary"
            onClick={() => setShow(true)}
          >
            <Plus size={17} /> Tambah pengguna
          </button>
        }
      />
      <div className="stat-grid mini-stats">
        {[
          ["Siswa", users.filter((u) => u.role === "siswa").length, "violet"],
          ["Guru", users.filter((u) => u.role === "guru").length, "green"],
          [
            "Administrator",
            users.filter((u) => u.role === "admin").length,
            "amber",
          ],
        ].map(([l, v, c]) => (
          <div className="mini-stat" key={String(l)}>
            <span className={"mini-stat-icon " + c}>
              <Users size={17} />
            </span>
            <span>{l}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama atau username…"
            />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="semua">Semua peran</option>
            <option value="siswa">Siswa</option>
            <option value="guru">Guru</option>
            <option value="admin">Admin</option>
          </select>
          <button
            className="button button-soft"
            onClick={() => void exportUsers()}
          >
            <Download size={16} /> Ekspor
          </button>
          <label className="button button-soft file-button">
            <ArrowDownToLine size={16} /> Impor
            <input
              hidden
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => void importUsers(e.target.files?.[0])}
            />
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>NAMA PENGGUNA</th>
                <th>NAMA LENGKAP</th>
                <th>PERAN</th>
                <th>KELAS / NISN</th>
                <th>STATUS</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>@{u.username}</strong>
                  </td>
                  <td>
                    <div className="table-user">
                      <span className="avatar table-avatar">{u.nama[0]}</span>
                      {u.nama}
                    </div>
                  </td>
                  <td>
                    <span className={"role-pill " + u.role}>
                      {u.role === "admin"
                        ? "Admin"
                        : u.role === "guru"
                          ? "Guru"
                          : "Siswa"}
                    </span>
                  </td>
                  <td>
                    {classes.find((c) => c.id === u.kelasId)?.nama ||
                      u.nisn ||
                      "—"}
                  </td>
                  <td>
                    <span
                      className={
                        "account-status " + (u.aktif ? "enabled" : "disabled")
                      }
                    >
                      <i />
                      {u.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="action-link"
                      onClick={() => void toggleUser(u)}
                    >
                      {u.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      className="action-link danger-link"
                      onClick={() => void resetPassword(u)}
                    >
                      Reset sandi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="empty-state">
              <strong>Pengguna tidak ditemukan</strong>
              <span>Coba kata kunci lain atau tambah pengguna.</span>
            </div>
          )}
        </div>
        <div className="table-foot">
          Menampilkan <strong>{visible.length}</strong> dari{" "}
          <strong>{users.length}</strong> pengguna <span>Halaman 1 dari 1</span>
        </div>
      </div>
      {show && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setShow(false)}>
              <X />
            </button>
            <span className="eyebrow dark-eyebrow">DATA AKUN SEKOLAH</span>
            <h2>Tambah pengguna</h2>
            <p className="muted">Buat akun baru untuk warga sekolah.</p>
            <div className="form-grid">
              <label>
                Nama lengkap
                <input
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Nama sesuai identitas"
                />
              </label>
              <label>
                Nama pengguna
                <input
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  placeholder="contoh: nama.siswa"
                />
              </label>
              <label>
                Kata sandi sementara
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Minimal 6 karakter"
                />
              </label>
              <label>
                Peran
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as User["role"] })
                  }
                >
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              {form.role === "siswa" && (
                <>
                  <label>
                    Kelas
                    <select
                      value={form.kelasId}
                      onChange={(e) =>
                        setForm({ ...form, kelasId: +e.target.value })
                      }
                    >
                      {classes.map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.nama}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    NISN
                    <input
                      value={form.nisn}
                      onChange={(e) =>
                        setForm({ ...form, nisn: e.target.value })
                      }
                    />
                  </label>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button
                className="button button-ghost"
                onClick={() => setShow(false)}
              >
                Batal
              </button>
              <button
                className="button button-primary"
                onClick={() => void create()}
              >
                Simpan pengguna <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
async function toggleUser(u: User) {
  await db.users.update(u.id!, { aktif: !u.aktif });
  toast.success(`Akun ${u.aktif ? "dinonaktifkan" : "diaktifkan"}.`);
}
async function resetPassword(u: User) {
  const pw = prompt(`Kata sandi baru untuk ${u.nama} (minimal 6 karakter):`);
  if (!pw) return;
  if (pw.length < 6) {
    toast.error("Kata sandi minimal 6 karakter.");
    return;
  }
  const salt = crypto.randomUUID();
  await db.users.update(u.id!, {
    salt,
    passwordHash: await hashPassword(pw, salt),
  });
  toast.success("Kata sandi berhasil direset.");
}
async function exportUsers() {
  const XLSX = await import("xlsx");
  const rows = (await db.users.toArray()).map(
    ({ username, nama, role, nisn, aktif }) => ({
      username,
      nama,
      role,
      nisn,
      aktif: aktif ? "Ya" : "Tidak",
    }),
  );
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pengguna");
  XLSX.writeFile(wb, "data-pengguna.xlsx");
}
async function importUsers(file?: File) {
  if (!file) return;
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer());
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(
    wb.Sheets[wb.SheetNames[0]],
  );
  let ok = 0,
    bad = 0;
  for (const [i, row] of rows.entries()) {
    try {
      if (!row.username || !row.nama) throw Error();
      if (await db.users.where("username").equals(String(row.username)).first())
        throw Error();
      const salt = crypto.randomUUID();
      await db.users.add({
        username: String(row.username),
        nama: String(row.nama),
        role: row.role === "guru" ? "guru" : "siswa",
        nisn: row.nisn ? String(row.nisn) : undefined,
        aktif: true,
        salt,
        passwordHash: await hashPassword(
          String(row.password || "siswa123"),
          salt,
        ),
      });
      ok++;
    } catch {
      bad++;
      console.warn(`Baris ${i + 2} tidak valid atau username duplikat.`);
    }
  }
  toast.success(
    `${ok} akun diimpor${bad ? `; ${bad} baris dilewati (detail di console)` : ""}.`,
  );
}
function MasterPage() {
  const classes = useLiveQuery(() => db.kelas.toArray(), []) || [];
  const subjects = useLiveQuery(() => db.mapel.toArray(), []) || [];
  const [form, setForm] = useState({ nama: "", tingkat: "X", jurusan: "MIPA" });
  const [subject, setSubject] = useState({ nama: "", kode: "" });
  async function addClass() {
    if (!form.nama) return toast.error("Nama kelas wajib diisi.");
    await db.kelas.add({ ...form, tahunAjaran: "2025/2026" });
    setForm({ ...form, nama: "" });
    toast.success("Kelas ditambahkan.");
  }
  async function addSubject() {
    if (!subject.nama || !subject.kode)
      return toast.error("Kode dan nama mapel wajib diisi.");
    try {
      await db.mapel.add(subject);
      setSubject({ nama: "", kode: "" });
      toast.success("Mata pelajaran ditambahkan.");
    } catch {
      toast.error("Kode mapel sudah digunakan.");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="DATA REFERENSI"
        title="Kelas & mata pelajaran"
        description="Atur rombongan belajar dan mata pelajaran sekolah."
      />
      <div className="split-grid">
        <div className="panel data-panel">
          <div className="panel-heading">
            <div>
              <h3>Rombongan belajar</h3>
              <p>{classes.length} kelas terdaftar</p>
            </div>
            <span className="panel-icon violet">
              <GraduationCap />
            </span>
          </div>
          <div className="inline-form">
            <input
              placeholder="Nama kelas, mis. XII IPA 2"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
            />
            <select
              value={form.tingkat}
              onChange={(e) => setForm({ ...form, tingkat: e.target.value })}
            >
              {["X", "XI", "XII"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <button
              className="button button-primary"
              onClick={() => void addClass()}
            >
              <Plus size={16} />
            </button>
          </div>
          {classes.map((c) => (
            <div className="data-row" key={c.id}>
              <span className="data-row-icon">{c.tingkat}</span>
              <div>
                <strong>{c.nama}</strong>
                <small>
                  {c.jurusan} · {c.tahunAjaran}
                </small>
              </div>
              <button
                className="action-link danger-link"
                onClick={() =>
                  void db.kelas
                    .delete(c.id!)
                    .then(() => toast.success("Kelas dihapus."))
                }
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
        <div className="panel data-panel">
          <div className="panel-heading">
            <div>
              <h3>Mata pelajaran</h3>
              <p>{subjects.length} mata pelajaran terdaftar</p>
            </div>
            <span className="panel-icon green">
              <BookOpen />
            </span>
          </div>
          <div className="inline-form">
            <input
              placeholder="Kode"
              className="code-input"
              value={subject.kode}
              onChange={(e) =>
                setSubject({ ...subject, kode: e.target.value.toUpperCase() })
              }
            />
            <input
              placeholder="Nama mata pelajaran"
              value={subject.nama}
              onChange={(e) => setSubject({ ...subject, nama: e.target.value })}
            />
            <button
              className="button button-primary"
              onClick={() => void addSubject()}
            >
              <Plus size={16} />
            </button>
          </div>
          {subjects.map((s) => (
            <div className="data-row" key={s.id}>
              <span className="data-row-icon subject-code">
                {s.kode.slice(0, 3)}
              </span>
              <div>
                <strong>{s.nama}</strong>
                <small>Kode: {s.kode}</small>
              </div>
              <button
                className="action-link danger-link"
                onClick={() =>
                  void db.mapel
                    .delete(s.id!)
                    .then(() => toast.success("Mata pelajaran dihapus."))
                }
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
function QuestionsPage({ user }: { user: User }) {
  const questions =
    useLiveQuery(
      () => db.soal.where("guruId").equals(user.id!).toArray(),
      [user.id],
    ) || [];
  const subjects = useLiveQuery(() => db.mapel.toArray(), []) || [];
  const [query, setQuery] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    mapelId: subjects[0]?.id || 0,
    pertanyaan: "",
    opsi: ["", "", "", ""],
    kunci: "0",
    kesulitan: "Mudah",
    bobot: 10,
  });
  useEffect(() => {
    if (subjects.length && !form.mapelId)
      setForm((f) => ({ ...f, mapelId: subjects[0].id! }));
  }, [subjects]);
  const visible = questions.filter((q) =>
    q.pertanyaan.toLowerCase().includes(query.toLowerCase()),
  );
  async function save() {
    if (!form.pertanyaan || !form.opsi.every(Boolean) || !subjects.length)
      return toast.error(
        "Lengkapi pertanyaan, pilihan jawaban, dan mata pelajaran.",
      );
    await db.soal.add({
      mapelId: +form.mapelId,
      guruId: user.id!,
      tipe: "Pilihan ganda",
      kesulitan: form.kesulitan,
      tingkat: "XII",
      tag: "umum",
      pertanyaan: form.pertanyaan,
      opsi: form.opsi,
      kunci: [form.kunci],
      bobot: +form.bobot,
      pembahasan: "",
      createdAt: new Date().toISOString(),
    });
    setShow(false);
    setForm((f) => ({ ...f, pertanyaan: "", opsi: ["", "", "", ""] }));
    toast.success("Soal berhasil disimpan.");
  }
  async function importQs(file?: File) {
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer());
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(
        wb.Sheets[wb.SheetNames[0]],
      );
      let n = 0;
      for (const r of rows) {
        const m =
          subjects.find(
            (x) =>
              x.kode.toLowerCase() === String(r.kodeMapel || "").toLowerCase(),
          ) || subjects[0];
        if (!r.pertanyaan || !m) continue;
        await db.soal.add({
          mapelId: m.id!,
          guruId: user.id!,
          tipe: String(r.tipe || "Pilihan ganda"),
          kesulitan: String(r.kesulitan || "Mudah"),
          tingkat: "XII",
          tag: String(r.tag || ""),
          pertanyaan: String(r.pertanyaan),
          opsi: [r.opsiA, r.opsiB, r.opsiC, r.opsiD].map(String),
          kunci: [String(r.kunci || "A").charCodeAt(0) - 65 + ""],
          bobot: Number(r.bobot || 10),
          pembahasan: String(r.pembahasan || ""),
          createdAt: new Date().toISOString(),
        });
        n++;
      }
      toast.success(`${n} soal berhasil diimpor.`);
    } catch {
      toast.error("File tidak dapat dibaca.");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="PERANGKAT PEMBELAJARAN"
        title="Bank soal"
        description="Susun dan kelola soal untuk ujian dan latihan siswa."
        action={
          <div className="heading-actions">
            <label className="button button-soft file-button">
              <ArrowDownToLine size={16} /> Impor Excel
              <input
                hidden
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => void importQs(e.target.files?.[0])}
              />
            </label>
            <button
              className="button button-primary"
              onClick={() => setShow(true)}
            >
              <Plus size={17} /> Buat soal
            </button>
          </div>
        }
      />
      <div className="stat-grid mini-stats">
        <div className="mini-stat">
          <span className="mini-stat-icon violet">
            <BookOpen />
          </span>
          <span>Total soal</span>
          <strong>{questions.length}</strong>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-icon green">
            <CheckCircle2 />
          </span>
          <span>Pilihan ganda</span>
          <strong>{questions.length}</strong>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-icon amber">
            <Activity />
          </span>
          <span>Mata pelajaran</span>
          <strong>{new Set(questions.map((q) => q.mapelId)).size}</strong>
        </div>
      </div>
      <div className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={16} />
            <input
              placeholder="Cari soal atau topik…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select>
            <option>Semua tingkat</option>
            <option>XII</option>
          </select>
          <select>
            <option>Semua kesulitan</option>
            <option>Mudah</option>
            <option>Sedang</option>
            <option>Sulit</option>
          </select>
          <button
            className="button button-soft"
            onClick={() => void exportQuestionTemplate()}
          >
            <Download size={16} /> Template
          </button>
        </div>
        <div className="question-cards">
          {visible.map((q, i) => (
            <article className="question-card" key={q.id}>
              <span className="q-number">{String(i + 1).padStart(2, "0")}</span>
              <div className="q-card-main">
                <div className="q-tags">
                  <span>{subjects.find((s) => s.id === q.mapelId)?.nama}</span>
                  <span>{q.kesulitan}</span>
                  <span>{q.tipe}</span>
                </div>
                <h3>{q.pertanyaan}</h3>
                <div className="q-option-preview">
                  {q.opsi.slice(0, 4).map((o, j) => (
                    <span
                      className={
                        q.kunci.includes(String(j)) ? "correct-preview" : ""
                      }
                      key={j}
                    >
                      {String.fromCharCode(65 + j)}. {o}
                    </span>
                  ))}
                </div>
              </div>
              <div className="q-card-end">
                <strong>
                  {q.bobot} <small>poin</small>
                </strong>
                <button
                  className="icon-button"
                  title="Duplikasi soal"
                  onClick={async () => {
                    const { id, ...copy } = q;
                    await db.soal.add({
                      ...copy,
                      pertanyaan: copy.pertanyaan + " (salinan)",
                      createdAt: new Date().toISOString(),
                    });
                    toast.success("Soal berhasil diduplikasi.");
                  }}
                >
                  <Plus size={16} />
                </button>
                <button
                  className="icon-button danger-icon"
                  title="Hapus soal"
                  onClick={() =>
                    void db.soal
                      .delete(q.id!)
                      .then(() => toast.success("Soal dihapus."))
                  }
                >
                  <X size={16} />
                </button>
              </div>
            </article>
          ))}
          {visible.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <BookOpen />
              </div>
              <strong>Bank soal masih kosong</strong>
              <span>Tambahkan soal pertama atau impor dari Excel.</span>
            </div>
          )}
        </div>
        <div className="table-foot">
          Menampilkan <strong>{visible.length}</strong> soal{" "}
          <span>{subjects.length} mata pelajaran</span>
        </div>
      </div>
      {show && (
        <div className="modal-backdrop">
          <div className="modal question-modal">
            <button className="modal-close" onClick={() => setShow(false)}>
              <X />
            </button>
            <span className="eyebrow dark-eyebrow">EDITOR SOAL</span>
            <h2>Buat soal baru</h2>
            <p className="muted">
              Tambahkan pertanyaan pilihan ganda ke bank soal.
            </p>
            <div className="form-grid">
              <label>
                Mata pelajaran
                <select
                  value={form.mapelId}
                  onChange={(e) =>
                    setForm({ ...form, mapelId: +e.target.value })
                  }
                >
                  {subjects.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.nama}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tingkat kesulitan
                <select
                  value={form.kesulitan}
                  onChange={(e) =>
                    setForm({ ...form, kesulitan: e.target.value })
                  }
                >
                  <option>Mudah</option>
                  <option>Sedang</option>
                  <option>Sulit</option>
                </select>
              </label>
              <label className="span-two">
                Pertanyaan
                <textarea
                  rows={3}
                  value={form.pertanyaan}
                  onChange={(e) =>
                    setForm({ ...form, pertanyaan: e.target.value })
                  }
                  placeholder="Tuliskan pertanyaan…"
                />
              </label>
              {form.opsi.map((o, i) => (
                <label key={i}>
                  Pilihan {String.fromCharCode(65 + i)}
                  <input
                    value={o}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        opsi: form.opsi.map((x, j) =>
                          j === i ? e.target.value : x,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <label>
                Kunci jawaban
                <select
                  value={form.kunci}
                  onChange={(e) => setForm({ ...form, kunci: e.target.value })}
                >
                  {form.opsi.map((_, i) => (
                    <option value={i} key={i}>
                      {String.fromCharCode(65 + i)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Bobot (poin)
                <input
                  type="number"
                  min="1"
                  value={form.bobot}
                  onChange={(e) => setForm({ ...form, bobot: +e.target.value })}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="button button-ghost"
                onClick={() => setShow(false)}
              >
                Batal
              </button>
              <button
                className="button button-primary"
                onClick={() => void save()}
              >
                Simpan soal <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
async function exportQuestionTemplate() {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet([
    {
      kodeMapel: "MTK",
      tipe: "Pilihan ganda",
      kesulitan: "Mudah",
      tag: "aljabar",
      pertanyaan: "Contoh pertanyaan",
      opsiA: "Pilihan A",
      opsiB: "Pilihan B",
      opsiC: "Pilihan C",
      opsiD: "Pilihan D",
      kunci: "A",
      bobot: 10,
      pembahasan: "Penjelasan",
    },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Soal");
  XLSX.writeFile(wb, "template-soal.xlsx");
}
function ExamsPage({ user }: { user: User }) {
  const exams = useLiveQuery(() => db.ujian.toArray(), []) || [];
  const subjects = useLiveQuery(() => db.mapel.toArray(), []) || [];
  const classes = useLiveQuery(() => db.kelas.toArray(), []) || [];
  const sessions = useLiveQuery(() => db.sesi.toArray(), []) || [];
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    judul: "",
    mapelId: 0,
    durasiMenit: 60,
    token: "",
    kkm: 75,
    questionIds: [] as number[],
    kelasIds: [] as number[],
  });
  const qs =
    useLiveQuery(
      () =>
        user.role === "guru"
          ? db.soal.where("guruId").equals(user.id!).toArray()
          : db.soal.toArray(),
      [user.id],
    ) || [];
  useEffect(() => {
    if (subjects.length && !form.mapelId)
      setForm((f) => ({ ...f, mapelId: subjects[0].id! }));
  }, [subjects]);
  async function createExam() {
    if (!form.judul || !form.questionIds.length || !form.token)
      return toast.error("Isi judul, token, dan pilih minimal satu soal.");
    const now = Date.now();
    await db.ujian.add({
      judul: form.judul,
      mapelId: +form.mapelId,
      guruId: user.id!,
      kelasIds: form.kelasIds.length
        ? form.kelasIds
        : classes.map((c) => c.id!),
      tanggalMulai: new Date(now).toISOString(),
      tanggalSelesai: new Date(now + 30 * 86400000).toISOString(),
      durasiMenit: +form.durasiMenit,
      token: form.token.toUpperCase(),
      acakSoal: false,
      acakOpsi: false,
      tampilkanHasil: true,
      kkm: +form.kkm,
      maxPelanggaran: 3,
      status: "aktif",
      questionIds: form.questionIds,
    });
    setShow(false);
    toast.success("Ujian berhasil dibuat dan aktif.");
  }
  return (
    <>
      <PageHeading
        eyebrow={user.role === "siswa" ? "ASESMEN SAYA" : "ASESMEN & EVALUASI"}
        title={user.role === "siswa" ? "Daftar ujian" : "Ujian"}
        description={
          user.role === "siswa"
            ? "Ujian yang tersedia sesuai jadwal kelasmu."
            : "Buat ujian dan pantau progres peserta."
        }
        action={
          user.role === "guru" ? (
            <button
              className="button button-primary"
              onClick={() => setShow(true)}
            >
              <Plus size={17} /> Buat ujian
            </button>
          ) : undefined
        }
      />
      <div className="exam-stats">
        <div>
          <span>Semua ujian</span>
          <strong>{exams.length}</strong>
        </div>
        <div>
          <span>Sedang berlangsung</span>
          <strong>
            {
              exams.filter((e) => new Date(e.tanggalSelesai) > new Date())
                .length
            }
          </strong>
        </div>
        <div>
          <span>Sesi peserta</span>
          <strong>{sessions.length}</strong>
        </div>
      </div>
      <div className="panel list-panel">
        <div className="panel-heading">
          <div>
            <h3>Ujian tersedia</h3>
            <p>Jadwal dan aktivitas asesmen</p>
          </div>
          <div className="search-field compact-search">
            <Search size={15} />
            <input placeholder="Cari ujian…" />
          </div>
        </div>
        <ExamList exams={exams} user={user} />
      </div>
      {show && (
        <div className="modal-backdrop">
          <div className="modal exam-modal">
            <button className="modal-close" onClick={() => setShow(false)}>
              <X />
            </button>
            <span className="eyebrow dark-eyebrow">PENGATURAN ASESMEN</span>
            <h2>Buat ujian</h2>
            <p className="muted">Konfigurasikan asesmen untuk kelas Anda.</p>
            <div className="form-grid">
              <label className="span-two">
                Judul ujian
                <input
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  placeholder="Contoh: Penilaian Harian Bab 3"
                />
              </label>
              <label>
                Mata pelajaran
                <select
                  value={form.mapelId}
                  onChange={(e) =>
                    setForm({ ...form, mapelId: +e.target.value })
                  }
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Durasi (menit)
                <input
                  type="number"
                  value={form.durasiMenit}
                  onChange={(e) =>
                    setForm({ ...form, durasiMenit: +e.target.value })
                  }
                />
              </label>
              <label>
                Token ujian
                <input
                  value={form.token}
                  onChange={(e) =>
                    setForm({ ...form, token: e.target.value.toUpperCase() })
                  }
                  placeholder="Mis. BIO2026"
                />
              </label>
              <label>
                KKM
                <input
                  type="number"
                  value={form.kkm}
                  onChange={(e) => setForm({ ...form, kkm: +e.target.value })}
                />
              </label>
              <fieldset className="span-two">
                <legend>Kelas peserta</legend>
                <div className="check-options">
                  {classes.map((c) => (
                    <label key={c.id}>
                      <input
                        type="checkbox"
                        checked={form.kelasIds.includes(c.id!)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            kelasIds: e.target.checked
                              ? [...form.kelasIds, c.id!]
                              : form.kelasIds.filter((id) => id !== c.id),
                          })
                        }
                      />
                      {c.nama}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="span-two">
                <legend>Pilih soal ({form.questionIds.length} dipilih)</legend>
                <div className="question-select-list">
                  {qs.map((q) => (
                    <label key={q.id}>
                      <input
                        type="checkbox"
                        checked={form.questionIds.includes(q.id!)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            questionIds: e.target.checked
                              ? [...form.questionIds, q.id!]
                              : form.questionIds.filter((id) => id !== q.id),
                          })
                        }
                      />
                      <span>{q.pertanyaan}</span>
                      <small>{q.bobot} poin</small>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="modal-actions">
              <button
                className="button button-ghost"
                onClick={() => setShow(false)}
              >
                Batal
              </button>
              <button
                className="button button-primary"
                onClick={() => void createExam()}
              >
                Buat dan aktifkan <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function ResultsPage() {
  const exams = useLiveQuery(() => db.ujian.toArray(), []) || [];
  const sessions = useLiveQuery(() => db.sesi.toArray(), []) || [];
  const students =
    useLiveQuery(() => db.users.where("role").equals("siswa").toArray(), []) ||
    [];
  const classes = useLiveQuery(() => db.kelas.toArray(), []) || [];
  const subjects = useLiveQuery(() => db.mapel.toArray(), []) || [];
  const [selected, setSelected] = useState<number | undefined>();
  const chosen = selected || exams[0]?.id;
  const result = sessions.filter((s) => s.ujianId === chosen);
  const ex = exams.find((e) => e.id === chosen);
  return (
    <>
      <PageHeading
        eyebrow="ANALISIS PEMBELAJARAN"
        title="Rekap nilai"
        description="Pantau hasil belajar dan progres siswa di setiap ujian."
        action={
          <button
            className="button button-soft"
            onClick={() => void exportResults(result, students)}
          >
            <Download size={16} /> Ekspor Excel
          </button>
        }
      />
      <div className="stat-grid mini-stats">
        <div className="mini-stat">
          <span className="mini-stat-icon violet">
            <Users />
          </span>
          <span>Peserta</span>
          <strong>{result.length}</strong>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-icon green">
            <CheckCircle2 />
          </span>
          <span>Lulus KKM</span>
          <strong>
            {result.filter((s) => (s.skor || 0) >= (ex?.kkm || 75)).length}
          </strong>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-icon amber">
            <Activity />
          </span>
          <span>Rata-rata nilai</span>
          <strong>
            {result.length
              ? Math.round(
                  result.reduce((a, s) => a + (s.skor || 0), 0) / result.length,
                )
              : "—"}
          </strong>
        </div>
      </div>
      <div className="panel table-panel">
        <div className="table-toolbar">
          <select
            value={chosen || ""}
            onChange={(e) => setSelected(+e.target.value)}
          >
            <option value="" disabled>
              Pilih ujian
            </option>
            {exams.map((e) => (
              <option value={e.id} key={e.id}>
                {e.judul}
              </option>
            ))}
          </select>
          {ex && (
            <span className="result-meta">
              {subjects.find((s) => s.id === ex.mapelId)?.nama} · KKM {ex.kkm}
            </span>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>PERINGKAT</th>
                <th>NAMA SISWA</th>
                <th>KELAS</th>
                <th>DIKERJAKAN</th>
                <th>NILAI</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {result
                .sort((a, b) => (b.skor || 0) - (a.skor || 0))
                .map((s, i) => {
                  const u = students.find((x) => x.id === s.siswaId);
                  return (
                    <tr key={s.id}>
                      <td>
                        <span className={"rank-number rank-" + (i + 1)}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </td>
                      <td>
                        <div className="table-user">
                          <span className="avatar table-avatar">
                            {u?.nama[0] || "?"}
                          </span>
                          {u?.nama || "Siswa"}
                        </div>
                      </td>
                      <td>
                        {classes.find((c) => c.id === u?.kelasId)?.nama || "—"}
                      </td>
                      <td>
                        {s.selesaiAt
                          ? new Date(s.selesaiAt).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td>
                        <strong>{s.skor ?? "—"}</strong>
                      </td>
                      <td>
                        <span
                          className={
                            "status-pill " +
                            ((s.skor || 0) >= (ex?.kkm || 75)
                              ? "passed"
                              : "failed")
                          }
                        >
                          {(s.skor || 0) >= (ex?.kkm || 75)
                            ? "Lulus"
                            : "Belum lulus"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {!result.length && (
            <div className="empty-state">
              <strong>Belum ada hasil</strong>
              <span>Hasil akan tersedia setelah siswa mengumpulkan ujian.</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
async function exportResults(sessions: Session[], students: User[]) {
  const XLSX = await import("xlsx");
  const rows = sessions.map((s) => ({
    Nama: students.find((u) => u.id === s.siswaId)?.nama || "",
    Nilai: s.skor ?? "",
    Status: s.status,
    Waktu: s.selesaiAt || "",
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rows),
    "Rekap Nilai",
  );
  XLSX.writeFile(wb, "rekap-nilai.xlsx");
}
function ActivityPage() {
  const logs =
    useLiveQuery(
      () => db.log.orderBy("waktu").reverse().limit(100).toArray(),
      [],
    ) || [];
  const users = useLiveQuery(() => db.users.toArray(), []) || [];
  return (
    <>
      <PageHeading
        eyebrow="KEAMANAN & AUDIT"
        title="Log aktivitas"
        description="Riwayat akses dan aktivitas pengguna di portal sekolah."
      />
      <div className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>WAKTU</th>
                <th>PENGGUNA</th>
                <th>AKTIVITAS</th>
                <th>DETAIL</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.waktu).toLocaleString("id-ID")}</td>
                  <td>
                    {users.find((u) => u.id === l.userId)?.nama || "Pengguna"}
                  </td>
                  <td>
                    <span className="role-pill admin">{l.aksi}</span>
                  </td>
                  <td>{l.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.length && (
            <div className="empty-state">
              <strong>Belum ada aktivitas tercatat</strong>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
function SettingsPage() {
  const [school, setSchool] = useState("SMA Negeri 1 Halmahera Timur");
  const [year, setYear] = useState("2025/2026");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void Promise.all([
      db.pengaturan.get("sekolah"),
      db.pengaturan.get("tahunAjaran"),
    ]).then(([s, y]) => {
      if (s) setSchool(String(s.value));
      if (y) setYear(String(y.value));
      setReady(true);
    });
  }, []);
  async function save() {
    await db.transaction("rw", db.pengaturan, async () => {
      await db.pengaturan.put({ key: "sekolah", value: school });
      await db.pengaturan.put({ key: "tahunAjaran", value: year });
    });
    toast.success("Pengaturan berhasil disimpan.");
  }
  async function backup() {
    const data = {
      version: 1,
      createdAt: new Date().toISOString(),
      users: await db.users.toArray(),
      kelas: await db.kelas.toArray(),
      mapel: await db.mapel.toArray(),
      soal: await db.soal.toArray(),
      ujian: await db.ujian.toArray(),
      sesi: await db.sesi.toArray(),
      pengaturan: await db.pengaturan.toArray(),
      log: await db.log.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `backup-cbt-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Backup berhasil diunduh.");
  }
  async function restore(file?: File) {
    if (!file) return;
    if (!confirm("Restore akan mengganti seluruh data saat ini. Lanjutkan?"))
      return;
    try {
      const data = JSON.parse(await file.text());
      await db.transaction(
        "rw",
        [
          db.users,
          db.kelas,
          db.mapel,
          db.soal,
          db.ujian,
          db.sesi,
          db.pengaturan,
          db.log,
        ],
        async () => {
          for (const table of [
            db.users,
            db.kelas,
            db.mapel,
            db.soal,
            db.ujian,
            db.sesi,
            db.pengaturan,
            db.log,
          ])
            await table.clear();
          for (const key of [
            "users",
            "kelas",
            "mapel",
            "soal",
            "ujian",
            "sesi",
            "pengaturan",
            "log",
          ])
            if (Array.isArray(data[key]))
              await (db as any)[key].bulkAdd(data[key]);
        },
      );
      toast.success("Data berhasil dipulihkan.");
      location.reload();
    } catch {
      toast.error("File backup tidak valid.");
    }
  }
  if (!ready) return <div className="loading-state">Memuat pengaturan…</div>;
  return (
    <>
      <PageHeading
        eyebrow="KONFIGURASI PORTAL"
        title="Pengaturan"
        description="Kelola identitas sekolah, data, dan preferensi portal CBT."
      />
      <div className="settings-grid">
        <div className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <h3>Profil sekolah</h3>
              <p>Informasi ini tampil di halaman portal.</p>
            </div>
            <span className="panel-icon violet">
              <GraduationCap />
            </span>
          </div>
          <label>
            Nama sekolah
            <input value={school} onChange={(e) => setSchool(e.target.value)} />
          </label>
          <label>
            Tahun ajaran
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {["2025/2026", "2026/2027", "2027/2028"].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <button className="button button-primary" onClick={() => void save()}>
            Simpan perubahan <Check size={16} />
          </button>
        </div>
        <div className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <h3>Backup & pemulihan</h3>
              <p>Simpan salinan data untuk dipindahkan atau dipulihkan.</p>
            </div>
            <span className="panel-icon green">
              <ShieldCheck />
            </span>
          </div>
          <div className="backup-info">
            <strong>Backup seluruh data</strong>
            <p>
              Mencakup pengguna, kelas, mapel, bank soal, ujian, hasil, dan
              pengaturan.
            </p>
            <button
              className="button button-soft"
              onClick={() => void backup()}
            >
              <Download size={16} /> Unduh backup JSON
            </button>
          </div>
          <div className="backup-info restore-info">
            <strong>Pulihkan dari backup</strong>
            <p>
              Data saat ini akan digantikan dengan isi file backup yang dipilih.
            </p>
            <label className="button button-soft file-button">
              <ArrowDownToLine size={16} /> Pilih file backup
              <input
                hidden
                type="file"
                accept="application/json"
                onChange={(e) => void restore(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>
        <div className="panel settings-panel span-settings">
          <div className="panel-heading">
            <div>
              <h3>Penyimpanan perangkat</h3>
              <p>Data tersimpan secara lokal di browser ini.</p>
            </div>
            <span className="panel-icon amber">
              <ShieldCheck />
            </span>
          </div>
          <div className="storage-status">
            <CheckCircle2 size={19} />
            <div>
              <strong>Penyimpanan offline aktif</strong>
              <small>
                Perangkat ini meminta browser agar data aplikasi tetap
                tersimpan.
              </small>
            </div>
            <span>IndexedDB</span>
          </div>
        </div>
      </div>
    </>
  );
}
