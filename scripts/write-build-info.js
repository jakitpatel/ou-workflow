import { writeFileSync, readFileSync } from "fs";
import path from "path";

const filePath = path.resolve("src/build-info.json");

// Increment version (simple patch bump)
let version = "1.0.0";
try {
  const prev = JSON.parse(readFileSync(filePath, "utf8"));
  if (prev && prev.version) {
    const parts = prev.version.split(".").map(Number);
    parts[2] = (parts[2] || 0) + 1; // bump patch version
    version = parts.join(".");
  }
} catch {
  // No previous file — start fresh
}

const buildTime = new Date().toISOString();

const info = { version, buildTime };
writeFileSync(filePath, JSON.stringify(info, null, 2));
console.log("✅ Build info written:", info);
