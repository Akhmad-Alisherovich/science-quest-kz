param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedInput)
try {
  $entry = $archive.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
  if (-not $entry) { throw "word/document.xml not found in $resolvedInput" }

  $stream = $entry.Open()
  try {
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::UTF8)
    try { [xml]$xml = $reader.ReadToEnd() } finally { $reader.Dispose() }
  } finally { $stream.Dispose() }

  $ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
  $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
  $body = $xml.SelectSingleNode('//w:body', $ns)
  $blocks = [System.Collections.Generic.List[object]]::new()

  foreach ($node in $body.ChildNodes) {
    if ($node.LocalName -eq 'p') {
      $texts = $node.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.'#text' }
      $text = ($texts -join '').Trim()
      if ($text) {
        $styleNode = $node.SelectSingleNode('./w:pPr/w:pStyle', $ns)
        $style = if ($styleNode) { $styleNode.GetAttribute('val', $ns.LookupNamespace('w')) } else { '' }
        $blocks.Add([pscustomobject]@{ type='paragraph'; style=$style; text=$text })
      }
    } elseif ($node.LocalName -eq 'tbl') {
      $rows = [System.Collections.Generic.List[object]]::new()
      foreach ($row in $node.SelectNodes('./w:tr', $ns)) {
        $cells = [System.Collections.Generic.List[string]]::new()
        foreach ($cell in $row.SelectNodes('./w:tc', $ns)) {
          $parts = [System.Collections.Generic.List[string]]::new()
          foreach ($p in $cell.SelectNodes('.//w:p', $ns)) {
            $pText = (($p.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.'#text' }) -join '').Trim()
            if ($pText) { $parts.Add($pText) }
          }
          $cells.Add(($parts -join ' | '))
        }
        $rows.Add(@($cells))
      }
      $blocks.Add([pscustomobject]@{ type='table'; rows=@($rows) })
    }
  }

  $result = [pscustomobject]@{
    source = [System.IO.Path]::GetFileName($resolvedInput)
    blockCount = $blocks.Count
    blocks = @($blocks)
  }
  $result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $OutputPath -Encoding utf8
} finally {
  $archive.Dispose()
}
