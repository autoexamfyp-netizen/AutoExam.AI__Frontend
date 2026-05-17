import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const file = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "pages",
  "teacher",
  "TeacherMaterialsPage.jsx",
)

let t = fs.readFileSync(file, "utf8")
t = t.replace(/console\.log\("[^"]*Filtering materials by category:[^"]*"/g, 'console.log("[loading] Filtering materials by category:"')
t = t.replace(/uncategorized â€” they/g, "uncategorized - they")
fs.writeFileSync(file, t)
console.log("done materials")
