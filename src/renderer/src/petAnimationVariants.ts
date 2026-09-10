export class PetAnimationVariants {
  private readonly choices = new Map<string, number>();

  constructor(private readonly random: () => number = Math.random) {}

  get(key: string, count: number): number {
    if (count <= 1) return 0;
    const cached = this.choices.get(key);
    if (cached !== undefined && cached < count) return cached;
    const choice = Math.floor(this.random() * count);
    // Bound memory when users repeatedly import different custom appearances.
    if (this.choices.size >= 128) this.choices.delete(this.choices.keys().next().value!);
    this.choices.set(key, choice);
    return choice;
  }

  rotate(key: string, count: number): number {
    const previous = this.get(key, count);
    if (count <= 1) return 0;
    const choice = (previous + 1 + Math.floor(this.random() * (count - 1))) % count;
    this.choices.set(key, choice);
    return choice;
  }
}
