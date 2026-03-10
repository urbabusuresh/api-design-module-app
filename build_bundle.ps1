# RaptrDXP Unified Build Script (Windows)

Write-Host "--- Starting Unified Build for RaptrDXP ---" -ForegroundColor Cyan

# 1. Clear previous release folder
if (Test-Path "release_bundle") {
    Write-Host "Cleaning old release folder..."
    Remove-Item -Recurse -Force "release_bundle"
}

# 2. Build Frontend
Write-Host "Building Frontend (Vite)..." -ForegroundColor Yellow
npm run build:prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

# 3. Create Release Structure
Write-Host "Organizing build files..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "release_bundle"
New-Item -ItemType Directory -Path "release_bundle/server"

# 4. Copy Files
Write-Host "Copying backend and static assets..."
Copy-Item -Recurse "dist" "release_bundle/dist"
Copy-Item -Recurse "server" "release_bundle/" 
Copy-Item "package.json" "release_bundle/"

# 5. Create basic .env if not exists
if (-not (Test-Path "release_bundle/uat.env")) {
    $envContent = "PORT=3001`n" +
                  "VITE_PORT=5173`n" +
                  "VITE_API_URL=/api`n" + # In prod, relative path is safer
                  "DB_HOST=localhost`n" +
                  "DB_USER=root`n" +
                  "DB_PASSWORD=root`n" +
                  "DB_NAME=raptr_test_api_design"
    Set-Content -Path "release_bundle/uat.env" -Value $envContent
}

Write-Host "`n--- BUILD COMPLETE ---" -ForegroundColor Green
Write-Host "Your production-ready bundle is in 'release_bundle/'"
Write-Host "To run in production:"
Write-Host "  1. Copy release_bundle/ to your server"
Write-Host "  2. Run 'npm install --omit=dev' in the root"
Write-Host "  3. Run 'node server/index.js'"
