import { describe, expect, it } from "vitest";
import { gradeAnswer, shuffle } from "./grading";
describe("penilaian otomatis", () => {
  it("menilai pilihan ganda benar dan salah", () => {
    expect(gradeAnswer("Pilihan ganda", ["1"], ["1"], 10)).toBe(10);
    expect(gradeAnswer("Pilihan ganda", ["0"], ["1"], 10)).toBe(0);
  });
  it("menilai soal benar/salah seperti pilihan tunggal", () => {
    expect(gradeAnswer("Benar/Salah", ["0"], ["0"], 10)).toBe(10);
    expect(gradeAnswer("Benar/Salah", ["1"], ["0"], 10)).toBe(0);
  });
  it("memberikan nilai proporsional untuk tabel benar/salah", () => {
    expect(
      gradeAnswer("Benar/Salah", ["0", "1", "0"], ["0", "0", "1"], 12),
    ).toBe(4);
    expect(gradeAnswer("Benar/Salah", [], ["0", "1"], 10)).toBe(0);
  });
  it("menerapkan skor parsial untuk pilihan kompleks saat diminta", () => {
    expect(
      gradeAnswer(
        "Pilihan ganda kompleks",
        ["a", "b"],
        ["a", "b"],
        10,
        true,
      ),
    ).toBe(10);
    expect(
      gradeAnswer("Pilihan ganda kompleks", ["a"], ["a", "b"], 10, true),
    ).toBe(5);
    expect(
      gradeAnswer("Pilihan ganda kompleks", ["a"], ["a", "b"], 10, false),
    ).toBe(0);
  });
  it("menunda nilai esai sampai koreksi manual", () => {
    expect(gradeAnswer("Esai", ["jawaban"], ["kunci"], 10)).toBe(0);
  });
});
describe("pengacakan", () => {
  it("mengembalikan setiap elemen tepat satu kali tanpa mengubah sumber", () => {
    const source = [1, 2, 3, 4, 5];
    const result = shuffle(source);
    expect([...result].sort()).toEqual(source);
    expect(source).toEqual([1, 2, 3, 4, 5]);
  });
  it("mendukung daftar kosong dan satu elemen", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(["soal"])).toEqual(["soal"]);
  });
});
