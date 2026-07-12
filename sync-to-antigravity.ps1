# Sync the working Sahm POS solution into the Antigravity project on G:\
# Run in PowerShell:
#   cd C:\Users\LENOVO\Projects\sahm-smart-pos
#   .\sync-to-antigravity.ps1

$ErrorActionPreference = 'Stop'
$src = 'C:\Users\LENOVO\Projects\sahm-smart-pos'
$dst = 'G:\Smart_Restaurant_Workspace'

if (-not (Test-Path $dst)) {
  throw "Destination not found: $dst"
}

Write-Host '==> Copying application source (in-place overwrite — Antigravity may lock rename)...'
New-Item -ItemType Directory -Force -Path "$dst\src" | Out-Null
robocopy "$src\src" "$dst\src" /E /IS /IT /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy src failed: $LASTEXITCODE" }

Write-Host '==> Copying docs / API collection / AI disclosure...'
New-Item -ItemType Directory -Force -Path "$dst\docs", "$dst\api" | Out-Null
Copy-Item "$src\docs\*" "$dst\docs\" -Force -ErrorAction SilentlyContinue
Copy-Item "$src\api\*" "$dst\api\" -Force -ErrorAction SilentlyContinue
Copy-Item "$src\AI_USAGE.md" "$dst\AI_USAGE.md" -Force
Copy-Item "$src\README.md" "$dst\README.md" -Force

Write-Host '==> Removing SSR entrypoints (fixes NG0401)...'
@(
  "$dst\src\main.server.ts",
  "$dst\src\server.ts",
  "$dst\src\app\app.config.server.ts",
  "$dst\src\styles.css"
) | ForEach-Object { if (Test-Path $_) { Remove-Item $_ -Force } }

Write-Host '==> Writing browser-only angular.json...'
@'
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "Smart_Restaurant_Workspace": {
      "projectType": "application",
      "schematics": {
        "@schematics/angular:component": {
          "style": "scss"
        }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/smart-restaurant-workspace",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": ["zone.js"],
            "tsConfig": "tsconfig.app.json",
            "inlineStyleLanguage": "scss",
            "assets": [{ "glob": "**/*", "input": "public" }],
            "styles": ["src/styles.scss"],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
                { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
              ],
              "outputHashing": "all"
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": { "buildTarget": "Smart_Restaurant_Workspace:build:production" },
            "development": { "buildTarget": "Smart_Restaurant_Workspace:build:development" }
          },
          "defaultConfiguration": "development"
        },
        "extract-i18n": {
          "builder": "@angular-devkit/build-angular:extract-i18n"
        },
        "test": {
          "builder": "@angular-devkit/build-angular:karma",
          "options": {
            "polyfills": ["zone.js", "zone.js/testing"],
            "tsConfig": "tsconfig.spec.json",
            "inlineStyleLanguage": "scss",
            "assets": [{ "glob": "**/*", "input": "public" }],
            "styles": ["src/styles.scss"],
            "scripts": []
          }
        }
      }
    }
  }
}
'@ | Set-Content -Path "$dst\angular.json" -Encoding UTF8

Write-Host '==> Writing tsconfig.app.json (browser only)...'
@'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/app",
    "types": []
  },
  "files": ["src/main.ts"],
  "include": ["src/**/*.d.ts"]
}
'@ | Set-Content -Path "$dst\tsconfig.app.json" -Encoding UTF8

Write-Host '==> Updating package.json scripts (drop SSR serve)...'
$pkgPath = "$dst\package.json"
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.scripts.PSObject.Properties.Name -contains 'serve:ssr:Smart_Restaurant_Workspace') {
  $pkg.scripts.PSObject.Properties.Remove('serve:ssr:Smart_Restaurant_Workspace')
}
$pkg | ConvertTo-Json -Depth 20 | Set-Content $pkgPath -Encoding UTF8

Write-Host ''
Write-Host 'DONE. Next:'
Write-Host "  cd $dst"
Write-Host '  npm start'
Write-Host ''
Write-Host 'Open this folder in Antigravity if needed:'
Write-Host "  $dst"
