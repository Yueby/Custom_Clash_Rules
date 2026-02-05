import { defineConfig } from "vite";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [
    {
      name: "custom-fs-api",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Intercept requests starting with /api/files
          if (!req.url?.startsWith("/api/files")) {
            next();
            return;
          }

          const cfgDir = path.resolve(process.cwd(), "../cfg");
          console.log("[API] Request:", req.url, "CFG Dir:", cfgDir);

          if (!fs.existsSync(cfgDir)) {
            console.error("[API] Config directory not found");
            res.statusCode = 500;
            res.end("cfg directory not found");
            return;
          }

          // Parse URL: /api/files/filename -> urlParts=["", "api", "files", "filename"]
          // or /api/files -> urlParts=["", "api", "files"]
          const urlParts = req.url.split("/");
          const fileName = urlParts[3]; // 3rd index is filename or undefined

          if (req.method === "GET") {
            if (!fileName || fileName === "") {
              // List files
              try {
                const files = fs
                  .readdirSync(cfgDir)
                  .filter((f) => f.endsWith(".ini"));
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(files));
              } catch (e) {
                console.error("[API] Error listing files:", e);
                res.statusCode = 500;
                res.end(String(e));
              }
            } else {
              // Read file
              try {
                // Decode URI component in case filename has spaces, though unlikely for ini
                const decodedName = decodeURIComponent(fileName);
                const filePath = path.join(cfgDir, decodedName);
                if (fs.existsSync(filePath)) {
                  const content = fs.readFileSync(filePath, "utf-8");
                  res.setHeader("Content-Type", "text/plain; charset=utf-8");
                  res.end(content);
                } else {
                  console.error("[API] File not found:", filePath);
                  res.statusCode = 404;
                  res.end("File not found");
                }
              } catch (e) {
                console.error("[API] Error reading file:", e);
                res.statusCode = 500;
                res.end(String(e));
              }
            }
          } else if (req.method === "POST" && fileName) {
            // Write file
            let body = "";
            req.on("data", (chunk) => {
              body += chunk.toString();
            });
            req.on("end", () => {
              try {
                const decodedName = decodeURIComponent(fileName);
                const filePath = path.join(cfgDir, decodedName);
                fs.writeFileSync(filePath, body, "utf-8");
                res.statusCode = 200;
                res.end("OK");
              } catch (e) {
                console.error("[API] Error writing file:", e);
                res.statusCode = 500;
                res.end(String(e));
              }
            });
          } else {
            next();
          }
        });
      },
    },
  ],
  server: {
    proxy: {},
  },
});
