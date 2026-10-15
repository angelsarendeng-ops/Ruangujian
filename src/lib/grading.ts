export function gradeAnswer(
  type: string,
  answer: string[],
  keys: string[],
  weight: number,
  partial = false,
): number {
  if (type === "Esai" || type === "Isian singkat") return 0;
  if (type === "Pilihan ganda kompleks") {
    const a = new Set(answer),
      k = new Set(keys);
    if ([...a].every((x) => k.has(x)) && a.size === k.size) return weight;
    if (!partial) return 0;
    const hits = [...a].filter((x) => k.has(x)).length;
    return Math.max(
      0,
      (weight * hits) / k.size - ((a.size - hits) * weight) / k.size,
    );
  }
  if (type === "Menjodohkan")
    return answer.join("|") === keys.join("|") ? weight : 0;
  return answer[0] === keys[0] ? weight : 0;
}
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
