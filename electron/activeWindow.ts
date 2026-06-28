import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

const execAsync = promisify(exec);

const psScript = `
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
  }
"@
$hwnd = [Win32]::GetForegroundWindow()
$title = New-Object System.Text.StringBuilder 256
[Win32]::GetWindowText($hwnd, $title, 256) > $null
$title.ToString()
`;

export async function getActiveWindowTitle(): Promise<string> {
  try {
    const tempPath = join(app.getPath('temp'), 'active_win.ps1');
    fs.writeFileSync(tempPath, psScript);
    const { stdout } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPath}"`);
    try { fs.unlinkSync(tempPath); } catch (e) {}
    return stdout.trim();
  } catch (error) {
    console.error('Failed to get active window title:', error);
    return '';
  }
}
