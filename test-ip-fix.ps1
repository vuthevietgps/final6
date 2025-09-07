# Test script for IP restriction fix with multiple IPs in x-forwarded-for header

# Test case 1: localhost in second position (this should work now)
Write-Host "Test 1: Testing login with x-forwarded-for: '183.80.131.93,127.0.0.1'" -ForegroundColor Yellow

$headers = @{
    'Content-Type' = 'application/json'
    'x-forwarded-for' = '183.80.131.93,127.0.0.1'
}

$body = @{
    email = 'dieulinh@gmail.com'
    password = '123456'
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method POST -Headers $headers -Body $body
    Write-Host "SUCCESS: Login successful!" -ForegroundColor Green
    Write-Host "User: $($response.user.fullName)" -ForegroundColor Green
    Write-Host "Role: $($response.user.role)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n---`n" -ForegroundColor Gray

# Test case 2: localhost in first position (should still work)
Write-Host "Test 2: Testing login with x-forwarded-for: '127.0.0.1,183.80.131.93'" -ForegroundColor Yellow

$headers2 = @{
    'Content-Type' = 'application/json'
    'x-forwarded-for' = '127.0.0.1,183.80.131.93'
}

try {
    $response2 = Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method POST -Headers $headers2 -Body $body
    Write-Host "SUCCESS: Login successful!" -ForegroundColor Green
    Write-Host "User: $($response2.user.fullName)" -ForegroundColor Green
    Write-Host "Role: $($response2.user.role)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n---`n" -ForegroundColor Gray

# Test case 3: localhost in third position (should also work now)
Write-Host "Test 3: Testing login with x-forwarded-for: '183.80.131.93,192.168.1.1,127.0.0.1'" -ForegroundColor Yellow

$headers3 = @{
    'Content-Type' = 'application/json'
    'x-forwarded-for' = '183.80.131.93,192.168.1.1,127.0.0.1'
}

try {
    $response3 = Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method POST -Headers $headers3 -Body $body
    Write-Host "SUCCESS: Login successful!" -ForegroundColor Green
    Write-Host "User: $($response3.user.fullName)" -ForegroundColor Green
    Write-Host "Role: $($response3.user.role)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n---`n" -ForegroundColor Gray

# Test case 4: Unauthorized IP (should fail)
Write-Host "Test 4: Testing login with unauthorized IP x-forwarded-for: '192.168.1.100,10.0.0.1'" -ForegroundColor Yellow

$headers4 = @{
    'Content-Type' = 'application/json'
    'x-forwarded-for' = '192.168.1.100,10.0.0.1'
}

try {
    $response4 = Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method POST -Headers $headers4 -Body $body
    Write-Host "UNEXPECTED: This should have failed!" -ForegroundColor Red
} catch {
    Write-Host "EXPECTED: Correctly blocked unauthorized IP" -ForegroundColor Green
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Cyan
}
