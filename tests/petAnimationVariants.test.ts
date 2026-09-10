import assert from "node:assert/strict";
import { PetAnimationVariants } from "../src/renderer/src/petAnimationVariants";

export const tests = [
  {
    name: "run-idle-run reuses the same animation variants without rerolling",
    run(): void {
      let rolls = 0;
      const variants = new PetAnimationVariants(() => { rolls++; return 0.6; });
      const idle = variants.get("lineDog:idle", 4);
      const running = variants.get("lineDog:breakRunning", 2);
      for (let i = 0; i < 100; i++) {
        assert.equal(variants.get("lineDog:idle", 4), idle);
        assert.equal(variants.get("lineDog:breakRunning", 2), running);
      }
      assert.equal(rolls, 2);
    }
  },
  {
    name: "cloned custom appearance snapshots keep the same animation identity",
    run(): void {
      let rolls = 0;
      const variants = new PetAnimationVariants(() => { rolls++; return 0.2; });
      const appearance = { name: "Custom", assets: { idle: { relativePath: "custom_pet_assets/a.gif", updatedAt: 1 } } };
      for (let i = 0; i < 100; i++) {
        const cloned = JSON.parse(JSON.stringify(appearance));
        variants.get(JSON.stringify(["custom", cloned, "idle"]), 3);
      }
      assert.equal(rolls, 1);
    }
  },
  {
    name: "explicit five-minute rotation changes only the selected state",
    run(): void {
      const variants = new PetAnimationVariants(() => 0.1);
      const idle = variants.get("idle", 4);
      const run = variants.get("run", 2);
      assert.notEqual(variants.rotate("idle", 4), idle);
      assert.equal(variants.get("run", 2), run);
      assert.equal(variants.rotate("custom", 1), 0);
    }
  }
];
