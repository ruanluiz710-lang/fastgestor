param([int]$Port = 8000)

$root = $PSScriptRoot
$mime = @{
    ".html"="text/html; charset=utf-8"; ".css"="text/css"; ".js"="application/javascript";
    ".json"="application/json"; ".png"="image/png"; ".jpg"="image/jpeg"; ".jpeg"="image/jpeg";
    ".svg"="image/svg+xml"; ".ico"="image/x-icon"; ".webp"="image/webp"
}

$listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Any, $Port)
try {
    $listener.Start()
} catch {
    Write-Host "Falha ao abrir a porta $Port : $($_.Exception.Message)"
    exit 1
}
Write-Host "Servindo $root em http://0.0.0.0:$Port/  (Ctrl+C para parar)"

while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
        $client.ReceiveTimeout = 5000
        $client.SendTimeout = 5000
        $stream = $client.GetStream()
        $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::ASCII)
        $requestLine = $reader.ReadLine()
        # drop cabeçalhos restantes
        while (($h = $reader.ReadLine()) -and $h -ne "") {}

        $path = "/index.html"
        if ($requestLine -match '^\S+\s+(\S+)\s') {
            $p = $matches[1].Split('?')[0]
            if ($p -ne "/") { $path = $p }
        }
        $path = [Uri]::UnescapeDataString($path)
        $file = Join-Path $root ($path.TrimStart("/"))
        $full = [IO.Path]::GetFullPath($file)

        if ($full.StartsWith([IO.Path]::GetFullPath($root)) -and (Test-Path $full -PathType Leaf)) {
            $ext = [IO.Path]::GetExtension($full)
            $ct = $mime[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
            $bytes = [IO.File]::ReadAllBytes($full)
            $header = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
            $hb = [Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($hb, 0, $hb.Length)
            $stream.Write($bytes, 0, $bytes.Length)
        } else {
            $body = [Text.Encoding]::UTF8.GetBytes("404 - nao encontrado: $path")
            $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
            $hb = [Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($hb, 0, $hb.Length)
            $stream.Write($body, 0, $body.Length)
        }
    } catch {
    } finally {
        $client.Close()
    }
}
