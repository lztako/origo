[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [ValidateSet("apply", "list", "unlink")]
  [string]$Mode = "apply",

  [string]$Token = $env:LINE_CHANNEL_ACCESS_TOKEN,

  [string]$RichMenuJsonPath = "docs/line/richmenu_v1.json",

  [string]$ImagePath = "docs/line/richmenu_v1.png",

  [switch]$UnlinkBeforeLink,

  [switch]$SkipLink
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-RequiredFilePath {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Label
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$Label not found: $Path"
  }

  return (Resolve-Path -LiteralPath $Path).Path
}

function Get-LineAuthHeaders {
  param([string]$ChannelAccessToken)
  return @{
    Authorization = "Bearer $ChannelAccessToken"
  }
}

function Invoke-LineApi {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [Parameter(Mandatory = $true)][hashtable]$Headers,
    [string]$ContentType,
    [string]$InFile
  )

  $invokeParams = @{
    Method  = $Method
    Uri     = $Uri
    Headers = $Headers
  }

  if ($ContentType) { $invokeParams["ContentType"] = $ContentType }
  if ($InFile) { $invokeParams["InFile"] = $InFile }

  try {
    return Invoke-RestMethod @invokeParams
  } catch {
    $errorBody = ""
    if ($_.Exception.Response -and $_.Exception.Response.Content) {
      try {
        $errorBody = $_.Exception.Response.Content.ReadAsStringAsync().Result
      } catch {
        $errorBody = ""
      }
    }
    if ($errorBody) {
      throw "LINE API call failed: $Method $Uri`n$errorBody"
    }
    throw "LINE API call failed: $Method $Uri`n$($_.Exception.Message)"
  }
}

function Get-RichMenuIdFromCreateResponse {
  param([object]$Response)

  if ($null -eq $Response) {
    throw "LINE create rich menu returned empty response."
  }

  if ($Response -is [string] -and $Response.StartsWith("richmenu-")) {
    return $Response
  }

  if ($Response.PSObject.Properties.Name -contains "richMenuId") {
    $value = [string]$Response.richMenuId
    if ($value -and $value.StartsWith("richmenu-")) {
      return $value
    }
  }

  throw "Unable to parse richMenuId from LINE response."
}

if (-not $Token) {
  throw "LINE channel access token is required. Pass -Token or set LINE_CHANNEL_ACCESS_TOKEN."
}

$headers = Get-LineAuthHeaders -ChannelAccessToken $Token

switch ($Mode) {
  "list" {
    if ($PSCmdlet.ShouldProcess("LINE Messaging API", "List rich menus")) {
      $result = Invoke-LineApi `
        -Method "GET" `
        -Uri "https://api.line.me/v2/bot/richmenu/list" `
        -Headers $headers
      $result | ConvertTo-Json -Depth 8
    }
    break
  }

  "unlink" {
    if ($PSCmdlet.ShouldProcess("LINE Messaging API", "Unlink rich menu from all users")) {
      Invoke-LineApi `
        -Method "DELETE" `
        -Uri "https://api.line.me/v2/bot/user/all/richmenu" `
        -Headers $headers | Out-Null
      Write-Host "Unlinked rich menu from all users."
    }
    break
  }

  "apply" {
    $jsonFullPath = Resolve-RequiredFilePath -Path $RichMenuJsonPath -Label "Rich menu JSON file"
    $imageFullPath = Resolve-RequiredFilePath -Path $ImagePath -Label "Rich menu PNG file"

    if ($UnlinkBeforeLink -and $PSCmdlet.ShouldProcess("LINE Messaging API", "Unlink current rich menu before new apply")) {
      Invoke-LineApi `
        -Method "DELETE" `
        -Uri "https://api.line.me/v2/bot/user/all/richmenu" `
        -Headers $headers | Out-Null
      Write-Host "Unlinked existing rich menu from all users."
    }

    $createHeaders = @{
      Authorization = $headers.Authorization
      "Content-Type" = "application/json"
    }

    $createResponse = $null
    if ($PSCmdlet.ShouldProcess("LINE Messaging API", "Create rich menu from JSON")) {
      $createResponse = Invoke-LineApi `
        -Method "POST" `
        -Uri "https://api.line.me/v2/bot/richmenu" `
        -Headers $createHeaders `
        -ContentType "application/json" `
        -InFile $jsonFullPath
    }

    $richMenuId = Get-RichMenuIdFromCreateResponse -Response $createResponse
    Write-Host "Created rich menu: $richMenuId"

    if ($PSCmdlet.ShouldProcess("LINE Messaging API", "Upload rich menu image")) {
      $uploadHeaders = @{
        Authorization = $headers.Authorization
        "Content-Type" = "image/png"
      }
      Invoke-LineApi `
        -Method "POST" `
        -Uri "https://api-data.line.me/v2/bot/richmenu/$richMenuId/content" `
        -Headers $uploadHeaders `
        -ContentType "image/png" `
        -InFile $imageFullPath | Out-Null
      Write-Host "Uploaded image: $imageFullPath"
    }

    if (-not $SkipLink -and $PSCmdlet.ShouldProcess("LINE Messaging API", "Link rich menu to all users")) {
      Invoke-LineApi `
        -Method "POST" `
        -Uri "https://api.line.me/v2/bot/user/all/richmenu/$richMenuId" `
        -Headers $headers | Out-Null
      Write-Host "Linked rich menu to all users."
    } elseif ($SkipLink) {
      Write-Host "Skipped linking rich menu to all users (-SkipLink)."
    }

    $summary = [ordered]@{
      mode = $Mode
      richMenuId = $richMenuId
      jsonPath = $jsonFullPath
      imagePath = $imageFullPath
      linkedToAllUsers = (-not $SkipLink)
    }
    $summary | ConvertTo-Json -Depth 4
    break
  }
}
