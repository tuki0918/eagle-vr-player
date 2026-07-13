import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

function copyEaglePluginFiles() {
  return {
    name: "copy-eagle-plugin-files",
    apply: "build",
    writeBundle(outputOptions) {
      const outputDirectory = resolve(projectRoot, outputOptions.dir ?? "dist");
      const manifest = JSON.parse(readFileSync(resolve(projectRoot, "manifest.json"), "utf8"));

      manifest.main.url = "index.html";

      writeFileSync(
        resolve(outputDirectory, "manifest.json"),
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
      copyFileSync(resolve(projectRoot, "logo.png"), resolve(outputDirectory, "logo.png"));
    },
  };
}

export default defineConfig({
  base: "./",
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(), copyEaglePluginFiles()],
});
