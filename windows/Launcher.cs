using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("Taoagent")]
[assembly: AssemblyDescription("Taoagent Windows Launcher")]
[assembly: AssemblyCompany("Taoagent")]
[assembly: AssemblyProduct("Taoagent")]
[assembly: AssemblyVersion("4.6.0.0")]
[assembly: AssemblyFileVersion("4.6.0.0")]
internal static class Launcher {
    [STAThread]
    private static void Main() {
        string root = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        try {
            string node = Path.Combine(root, "runtime", "node.exe");
            string script = Path.Combine(root, "launcher.mjs");
            if (!File.Exists(node) || !File.Exists(script)) throw new FileNotFoundException("Extract the complete Windows ZIP before starting Taoagent.");
            ProcessStartInfo info = new ProcessStartInfo(node, "\"" + script + "\"");
            info.WorkingDirectory = root;
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            info.EnvironmentVariables.Remove("NODE_OPTIONS");
            info.EnvironmentVariables.Remove("NODE_PATH");
            using (Process process = Process.Start(info)) {
                process.WaitForExit();
                if (process.ExitCode != 0) throw new Exception("Taoagent could not start. Use Start Taoagent.cmd to see details, or check home\\logs. Your saved data is retained.");
            }
        } catch (Exception error) { MessageBox.Show(error.Message, "Taoagent", MessageBoxButtons.OK, MessageBoxIcon.Error); }
    }
}
