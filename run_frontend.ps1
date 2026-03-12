param(
    [string]$backendUrl = "http://localhost:8000"
)

Write-Host "Setting NEXT_PUBLIC_BACKEND_URL for this session to $backendUrl"
$env:NEXT_PUBLIC_BACKEND_URL = $backendUrl

Write-Host "Starting frontend dev server"
npm run dev