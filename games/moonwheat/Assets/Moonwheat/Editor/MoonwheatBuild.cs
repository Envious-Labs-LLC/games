using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Moonwheat.EditorTools
{
    /// <summary>
    /// Batch entry points so the game can be configured, opened, and built from the command
    /// line without anyone driving the Editor by hand.
    /// </summary>
    public static class MoonwheatBuild
    {
        // Loader boots into scene index 3, so Farm_Outdoor has to sit there.
        static readonly string[] Scenes =
        {
            "Assets/HappyHarvest/Scenes/Loader.unity",
            "Assets/HappyHarvest/Scenes/MainMenu.unity",
            "Assets/HappyHarvest/Scenes/House_Interior.unity",
            "Assets/HappyHarvest/Scenes/Farm_Outdoor.unity",
        };

        public static void ConfigureScenes()
        {
            EditorBuildSettings.scenes = Scenes
                .Select(s => new EditorBuildSettingsScene(s, true))
                .ToArray();

            AssetDatabase.SaveAssets();
            Debug.Log($"Moonwheat: build scenes set ({Scenes.Length}).");
        }

        /// <summary>Leaves the farm as the open scene so the Editor starts there next launch.</summary>
        public static void OpenFarm()
        {
            ConfigureScenes();
            EditorSceneManager.OpenScene("Assets/HappyHarvest/Scenes/Farm_Outdoor.unity");
            Debug.Log("Moonwheat: farm scene opened.");
        }

        public static void BuildMac()
        {
            ConfigureScenes();

            var options = new BuildPlayerOptions
            {
                scenes = Scenes,
                locationPathName = "Build/Moonwheat.app",
                target = BuildTarget.StandaloneOSX,
                options = BuildOptions.None,
            };

            var report = BuildPipeline.BuildPlayer(options);
            var summary = report.summary;

            Debug.Log($"Moonwheat build: {summary.result} " +
                      $"errors={summary.totalErrors} warnings={summary.totalWarnings} " +
                      $"size={summary.totalSize / (1024 * 1024)}MB");

            if (summary.result != BuildResult.Succeeded)
            {
                EditorApplication.Exit(1);
            }
        }
    }
}
