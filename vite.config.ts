import fs from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

function loadExampleEnv(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const fileContents = fs.readFileSync(filePath, "utf8")
  const variables: Record<string, string> = {}

  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith("#")) {
      continue
    }

    const separatorIndex = line.indexOf("=")

    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()

    if (!key) {
      continue
    }

    variables[key] = value
  }

  return variables
}

// https://vite.dev/config/
export default defineConfig(() => {
  const exampleEnv = loadExampleEnv(path.resolve(__dirname, ".env.example"))

  return {
    define: {
      __APP_ENV_DEFAULTS__: JSON.stringify(exampleEnv),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
