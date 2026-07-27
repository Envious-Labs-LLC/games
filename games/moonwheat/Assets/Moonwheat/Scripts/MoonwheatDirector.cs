using System.Collections.Generic;
using HappyHarvest;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace Moonwheat
{
    /// <summary>
    /// Moonwheat inverts Happy Harvest's daytime farming sim with one rule:
    /// crops only grow in darkness, and the player can only act inside their own lantern.
    /// Light is how you act, darkness is how you grow, and you cannot have both at once.
    ///
    /// This installs itself over whatever farm scene is loaded instead of editing that
    /// scene, so the original sample stays untouched and re-importable.
    /// </summary>
    public class MoonwheatDirector : MonoBehaviour
    {
        // --- tuning ------------------------------------------------------------------
        const float NightDuration = 150f;      // seconds from dusk to dawn
        const float LanternRadius = 3.0f;      // world units you can see and work within
        const float LanternFuel = 55f;         // seconds of light per night
        const float MatureSeconds = 16f;       // darkness needed to take a crop seed to ripe
        const int FieldWidth = 9;
        const int FieldHeight = 7;
        const int BaseQuota = 6;

        PlayerController m_Player;
        TerrainManager m_Terrain;
        DayCycleHandler m_DayCycle;
        Light2D m_Lantern;
        Crop m_Crop;

        readonly List<Vector3Int> m_Field = new();

        bool m_LanternOn = true;
        float m_Fuel = LanternFuel;
        float m_TimeLeft = NightDuration;
        int m_Harvested;
        int m_Night = 1;
        int m_Quota = BaseQuota;
        bool m_Over;
        bool m_Won;
        string m_Toast = "";
        float m_ToastTimer;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Hook()
        {
            SceneManager.sceneLoaded += (_, __) =>
            {
                if (FindFirstObjectByType<MoonwheatDirector>() != null) return;
                if (FindFirstObjectByType<TerrainManager>() == null) return;
                new GameObject("Moonwheat Director").AddComponent<MoonwheatDirector>();
            };
        }

        void Start()
        {
            m_Terrain = FindFirstObjectByType<TerrainManager>();
            m_Player = FindFirstObjectByType<PlayerController>();
            m_DayCycle = FindFirstObjectByType<DayCycleHandler>();

            if (m_Terrain == null || m_Player == null)
            {
                Debug.LogWarning("Moonwheat: no farm in this scene, standing down.");
                enabled = false;
                return;
            }

            var db = GameManager.Instance != null ? GameManager.Instance.CropDatabase : null;
            if (db != null && db.Entries != null)
            {
                foreach (var c in db.Entries)
                {
                    if (c != null) { m_Crop = c; break; }
                }
            }

            if (m_Crop == null)
            {
                Debug.LogWarning("Moonwheat: crop database is empty, standing down.");
                enabled = false;
                return;
            }

            BuildLantern();
            BuildField();

            // Growth is driven by darkness, never by water. The multiplier is derived from
            // the crop's own GrowthTime so the pacing holds whatever the asset is authored at.
            TerrainManager.GrowthRateModifier = RateAt;
            TerrainManager.OnHarvested += OnHarvested;
        }

        void OnDestroy()
        {
            TerrainManager.GrowthRateModifier = null;
            TerrainManager.OnHarvested -= OnHarvested;
        }

        void BuildLantern()
        {
            var go = new GameObject("Moonwheat Lantern");
            go.transform.SetParent(m_Player.transform, false);
            go.transform.localPosition = new Vector3(0f, 0.6f, 0f);

            m_Lantern = go.AddComponent<Light2D>();
            m_Lantern.lightType = Light2D.LightType.Point;
            m_Lantern.pointLightOuterRadius = LanternRadius;
            m_Lantern.pointLightInnerRadius = LanternRadius * 0.2f;
            m_Lantern.color = new Color(1f, 0.86f, 0.55f);
            m_Lantern.intensity = 1.5f;
            m_Lantern.falloffIntensity = 0.7f;
        }

        /// <summary>Till a patch centred on wherever the player starts, and seed it.</summary>
        void BuildField()
        {
            var centre = m_Terrain.Grid.WorldToCell(m_Player.transform.position);
            m_Field.Clear();

            for (var x = -FieldWidth / 2; x <= FieldWidth / 2; x++)
            {
                for (var y = -FieldHeight / 2; y <= FieldHeight / 2; y++)
                {
                    var cell = centre + new Vector3Int(x, y, 0);
                    if (m_Terrain.IsTilled(cell)) continue;

                    m_Terrain.TillAt(cell);
                    m_Field.Add(cell);
                }
            }
        }

        /// <summary>Zero inside the lantern (frozen and dying), full speed in the dark.</summary>
        float RateAt(Vector3Int cell)
        {
            if (m_Over) return 0f;

            if (m_LanternOn)
            {
                var world = m_Terrain.Grid.GetCellCenterWorld(cell);
                if (Vector2.Distance(world, m_Player.transform.position) <= LanternRadius) return 0f;
            }

            return m_Crop.GrowthTime / MatureSeconds;
        }

        void OnHarvested(Vector3Int cell, Crop crop)
        {
            m_Harvested++;
            Toast("+1 moonwheat");
        }

        void Update()
        {
            if (m_Over)
            {
                if (Keyboard.current != null && Keyboard.current.rKey.wasPressedThisFrame) NextNight();
                return;
            }

            var kb = Keyboard.current;

            if (kb != null && kb.qKey.wasPressedThisFrame && m_Fuel > 0f) m_LanternOn = !m_LanternOn;
            if (kb != null && kb.eKey.wasPressedThisFrame) Act();

            if (m_LanternOn)
            {
                m_Fuel -= Time.deltaTime;
                if (m_Fuel <= 0f)
                {
                    m_Fuel = 0f;
                    m_LanternOn = false;
                    Toast("The lantern gutters out.");
                }
            }

            m_TimeLeft -= Time.deltaTime;
            if (m_TimeLeft <= 0f) EndNight();

            if (m_ToastTimer > 0f) m_ToastTimer -= Time.deltaTime;
        }

        /// <summary>One button does both jobs, on the cell you are standing on.</summary>
        void Act()
        {
            if (!m_LanternOn)
            {
                Toast("Too dark to work. Press Q.");
                return;
            }

            var cell = m_Terrain.Grid.WorldToCell(m_Player.transform.position);
            var data = m_Terrain.GetCropDataAt(cell);

            if (data == null)
            {
                if (m_Terrain.IsPlantable(cell))
                {
                    m_Terrain.PlantAt(cell, m_Crop);
                    Toast("Planted. Now leave it in the dark.");
                }
                else
                {
                    Toast("Nothing to work here.");
                }

                return;
            }

            if (Mathf.Approximately(data.GrowthRatio, 1f)) m_Terrain.HarvestAt(cell);
            else Toast("Not ripe yet.");
        }

        void EndNight()
        {
            m_Over = true;
            m_Won = m_Harvested >= m_Quota;
            m_LanternOn = false;
        }

        void NextNight()
        {
            if (m_Won)
            {
                m_Night++;
                m_Quota += 3;
            }

            m_Harvested = 0;
            m_Fuel = LanternFuel;
            m_TimeLeft = NightDuration;
            m_LanternOn = true;
            m_Over = false;
            m_Won = false;

            foreach (var cell in m_Field)
            {
                var data = m_Terrain.GetCropDataAt(cell);
                if (data != null) m_Terrain.OverrideGrowthStage(cell, 0);
            }
        }

        void Toast(string message)
        {
            m_Toast = message;
            m_ToastTimer = 2f;
        }

        // --- night sky ----------------------------------------------------------------
        // The sample's day cycle keeps writing its own light values every frame, so the
        // override has to land after it, in LateUpdate.
        void LateUpdate()
        {
            if (m_DayCycle == null) return;

            if (m_DayCycle.DayLight != null) m_DayCycle.DayLight.intensity = 0f;
            if (m_DayCycle.SunRimLight != null) m_DayCycle.SunRimLight.intensity = 0f;
            if (m_DayCycle.NightLight != null) m_DayCycle.NightLight.intensity = 0.10f;
            if (m_DayCycle.MoonRimLight != null) m_DayCycle.MoonRimLight.intensity = 0.16f;

            if (m_DayCycle.AmbientLight != null)
            {
                m_DayCycle.AmbientLight.intensity = 0.05f;
                m_DayCycle.AmbientLight.color = new Color(0.45f, 0.55f, 0.85f);
            }

            if (m_Lantern != null) m_Lantern.enabled = m_LanternOn;
        }

        // --- HUD ----------------------------------------------------------------------
        void OnGUI()
        {
            var panel = new GUIStyle(GUI.skin.box) { fontSize = 15, alignment = TextAnchor.MiddleLeft, padding = new RectOffset(12, 12, 8, 8) };
            var big = new GUIStyle(GUI.skin.label) { fontSize = 34, alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold };
            big.normal.textColor = Color.white;

            GUI.color = new Color(0f, 0f, 0f, 0.65f);
            GUI.Box(new Rect(14, 14, 260, 104), GUIContent.none);
            GUI.color = Color.white;

            var mins = Mathf.FloorToInt(Mathf.Max(0f, m_TimeLeft) / 60f);
            var secs = Mathf.FloorToInt(Mathf.Max(0f, m_TimeLeft) % 60f);

            GUI.Label(new Rect(26, 20, 240, 24), $"Night {m_Night}    dawn in {mins}:{secs:00}", panel);
            GUI.Label(new Rect(26, 48, 240, 24), $"Harvested {m_Harvested} / {m_Quota}", panel);
            GUI.Label(new Rect(26, 76, 240, 24), $"Lantern {(m_LanternOn ? "LIT" : "dark")}   fuel {Mathf.CeilToInt(m_Fuel)}s", panel);

            GUI.color = new Color(0f, 0f, 0f, 0.55f);
            GUI.Box(new Rect(14, Screen.height - 46, 430, 30), GUIContent.none);
            GUI.color = Color.white;
            GUI.Label(new Rect(26, Screen.height - 42, 420, 22), "WASD move    Q lantern    E plant / harvest", panel);

            if (m_ToastTimer > 0f)
            {
                GUI.Label(new Rect(0, Screen.height * 0.62f, Screen.width, 30), m_Toast, big);
            }

            if (!m_Over) return;

            GUI.color = new Color(0f, 0f, 0f, 0.78f);
            GUI.Box(new Rect(0, Screen.height * 0.32f, Screen.width, 150), GUIContent.none);
            GUI.color = Color.white;

            GUI.Label(new Rect(0, Screen.height * 0.35f, Screen.width, 44),
                m_Won ? "Dawn. Quota met." : "Dawn. The field came up short.", big);
            GUI.Label(new Rect(0, Screen.height * 0.35f + 52, Screen.width, 44),
                $"{m_Harvested} of {m_Quota} harvested", big);
            GUI.Label(new Rect(0, Screen.height * 0.35f + 100, Screen.width, 30),
                m_Won ? "Press R for the next night" : "Press R to try this night again", big);
        }
    }
}
