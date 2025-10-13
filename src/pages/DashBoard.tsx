import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Activity,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface Device {
  device_id: string;
  name: string;
  type: string;
  location: string;
  status?: string;
}

interface SensorData {
  sensor_type: string;
  value: number;
  timestamp: string;
}

interface Alert {
  id: string;
  device_id: string;
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: string;
}

interface Analytics {
  device_id: string;
  metrics: {
    avg_temp?: number;
    max_temp?: number;
    min_temp?: number;
    [key: string]: number | undefined;
  };
}

const API_BASE = "http://localhost:3000/api";

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [latestData, setLatestData] = useState<{ [key: string]: SensorData[] }>(
    {}
  );
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [analytics, setAnalytics] = useState<{ [key: string]: Analytics }>({});
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [sensorHistory, setSensorHistory] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"overview" | "devices" | "alerts">("overview");
  const [newDevice, setNewDevice] = useState({
    name: "",
    type: "temperature",
    location: "",
  });
  const [showAddDevice, setShowAddDevice] = useState(false);

  // Fetch devices
  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API_BASE}/devices`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
        if (data.length > 0 && !selectedDevice) {
          setSelectedDevice(data[0].device_id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
      // Mock data for demo
      const mockDevices: Device[] = [
        {
          device_id: "sensor-01",
          name: "Temperature Sensor A",
          type: "temperature",
          location: "Factory A",
          status: "active",
        },
        {
          device_id: "sensor-02",
          name: "Humidity Sensor B",
          type: "humidity",
          location: "Factory B",
          status: "active",
        },
        {
          device_id: "sensor-03",
          name: "Pressure Sensor C",
          type: "pressure",
          location: "Warehouse",
          status: "inactive",
        },
      ];
      setDevices(mockDevices);
      setSelectedDevice("sensor-01");
    }
  };

  // Fetch latest sensor data
  const fetchLatestData = async () => {
    if (!selectedDevice) return;
    try {
      const res = await fetch(
        `${API_BASE}/sensor-data/${selectedDevice}/latest`
      );
      if (res.ok) {
        const data = await res.json();
        setLatestData((prev) => ({ ...prev, [selectedDevice]: data }));
      }
    } catch (err) {
      console.error("Failed to fetch latest data:", err);
      // Mock data
      const mockData: SensorData[] = [
        {
          sensor_type: "temperature",
          value: 27.3,
          timestamp: new Date().toISOString(),
        },
        {
          sensor_type: "humidity",
          value: 65.1,
          timestamp: new Date().toISOString(),
        },
      ];
      setLatestData((prev) => ({ ...prev, [selectedDevice]: mockData }));
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      // Mock data
      const mockAlerts: Alert[] = [
        {
          id: "1",
          device_id: "sensor-01",
          message: "Temperature exceeds threshold",
          severity: "high",
          timestamp: new Date().toISOString(),
        },
        {
          id: "2",
          device_id: "sensor-02",
          message: "Humidity warning",
          severity: "medium",
          timestamp: new Date().toISOString(),
        },
      ];
      setAlerts(mockAlerts);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    if (!selectedDevice) return;
    try {
      const res = await fetch(`${API_BASE}/analytics/${selectedDevice}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics((prev) => ({ ...prev, [selectedDevice]: data }));
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      // Mock data
      const mockAnalytics: Analytics = {
        device_id: selectedDevice,
        metrics: { avg_temp: 27.1, max_temp: 32.5, min_temp: 24.8 },
      };
      setAnalytics((prev) => ({ ...prev, [selectedDevice]: mockAnalytics }));
    }
  };

  // Generate mock chart data
  const generateMockChartData = () => {
    return Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      value: Math.random() * 10 + 25,
    }));
  };

  useEffect(() => {
    fetchDevices();
    fetchAlerts();
    const interval = setInterval(() => {
      fetchLatestData();
      fetchAnalytics();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchLatestData();
    fetchAnalytics();
  }, [selectedDevice]);

  const handleAddDevice = async () => {
    if (!newDevice.name || !newDevice.location) return;
    try {
      const deviceId = `sensor-${Date.now()}`;
      const res = await fetch(`${API_BASE}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          ...newDevice,
          status: "active",
        }),
      });
      if (res.ok) {
        fetchDevices();
        setNewDevice({ name: "", type: "temperature", location: "" });
        setShowAddDevice(false);
      }
    } catch (err) {
      console.error("Failed to add device:", err);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      await fetch(`${API_BASE}/devices/${deviceId}`, { method: "DELETE" });
      fetchDevices();
    } catch (err) {
      console.error("Failed to delete device:", err);
    }
  };

  const chartData = generateMockChartData();
  const currentAnalytics = selectedDevice ? analytics[selectedDevice] : null;
  const currentLatestData = selectedDevice ? latestData[selectedDevice] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Activity className="w-8 h-8 text-blue-400" />
                IoT Dashboard
              </h1>
              <p className="text-slate-400 mt-1">
                Quản lý thiết bị và cảm biến
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTab("overview")}
                className={`px-4 py-2 rounded transition ${
                  tab === "overview"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setTab("devices")}
                className={`px-4 py-2 rounded transition ${
                  tab === "devices"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                Devices
              </button>
              <button
                onClick={() => setTab("alerts")}
                className={`px-4 py-2 rounded transition ${
                  tab === "alerts"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                Alerts
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <p className="text-slate-400 text-sm font-medium">
                  Total Devices
                </p>
                <p className="text-3xl font-bold text-white mt-2">
                  {devices.length}
                </p>
              </div>
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <p className="text-slate-400 text-sm font-medium">
                  Active Devices
                </p>
                <p className="text-3xl font-bold text-green-400 mt-2">
                  {devices.filter((d) => d.status === "active").length}
                </p>
              </div>
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <p className="text-slate-400 text-sm font-medium">
                  Total Alerts
                </p>
                <p className="text-3xl font-bold text-red-400 mt-2">
                  {alerts.length}
                </p>
              </div>
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <p className="text-slate-400 text-sm font-medium">
                  High Priority
                </p>
                <p className="text-3xl font-bold text-orange-400 mt-2">
                  {alerts.filter((a) => a.severity === "high").length}
                </p>
              </div>
            </div>

            {/* Current Device Data */}
            {selectedDevice && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sensor Values */}
                <div className="lg:col-span-1 bg-slate-800 p-6 rounded-lg border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Latest Values
                  </h3>
                  <div className="space-y-3">
                    {currentLatestData &&
                      currentLatestData.map((sensor, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-3 bg-slate-700/50 rounded"
                        >
                          <span className="text-slate-300">
                            {sensor.sensor_type}
                          </span>
                          <span className="text-lg font-bold text-blue-400">
                            {sensor.value.toFixed(1)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Analytics */}
                <div className="lg:col-span-1 bg-slate-800 p-6 rounded-lg border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Today's Analytics
                  </h3>
                  {currentAnalytics && (
                    <div className="space-y-3">
                      {Object.entries(currentAnalytics.metrics).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between items-center p-3 bg-slate-700/50 rounded"
                          >
                            <span className="text-slate-300 capitalize">
                              {key}
                            </span>
                            <span className="text-lg font-bold text-green-400">
                              {value?.toFixed(1) || "N/A"}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Device Info */}
                <div className="lg:col-span-1 bg-slate-800 p-6 rounded-lg border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Device Info
                  </h3>
                  {devices.find((d) => d.device_id === selectedDevice) && (
                    <div className="space-y-3">
                      {(() => {
                        const device = devices.find(
                          (d) => d.device_id === selectedDevice
                        );
                        return (
                          <>
                            <div className="flex items-center gap-2">
                              {device?.status === "active" ? (
                                <Wifi className="w-4 h-4 text-green-400" />
                              ) : (
                                <WifiOff className="w-4 h-4 text-red-400" />
                              )}
                              <span className="text-slate-300">
                                {device?.name}
                              </span>
                            </div>
                            <div className="p-3 bg-slate-700/50 rounded">
                              <p className="text-sm text-slate-400">
                                Type:{" "}
                                <span className="text-white">
                                  {device?.type}
                                </span>
                              </p>
                            </div>
                            <div className="p-3 bg-slate-700/50 rounded">
                              <p className="text-sm text-slate-400">
                                Location:{" "}
                                <span className="text-white">
                                  {device?.location}
                                </span>
                              </p>
                            </div>
                            <div className="p-3 bg-slate-700/50 rounded">
                              <p className="text-sm text-slate-400">
                                Status:{" "}
                                <span
                                  className={
                                    device?.status === "active"
                                      ? "text-green-400"
                                      : "text-red-400"
                                  }
                                >
                                  {device?.status}
                                </span>
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">
                  Temperature Trend
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="time" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">
                  Sensor Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="time" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                    />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {tab === "devices" && (
          <div className="space-y-6">
            <button
              onClick={() => setShowAddDevice(!showAddDevice)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Plus className="w-5 h-5" />
              Add Device
            </button>

            {showAddDevice && (
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">
                  Register New Device
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Device Name"
                    value={newDevice.name}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, name: e.target.value })
                    }
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={newDevice.type}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, type: e.target.value })
                    }
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                  >
                    <option>temperature</option>
                    <option>humidity</option>
                    <option>pressure</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Location"
                    value={newDevice.location}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, location: e.target.value })
                    }
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleAddDevice}
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded transition"
                >
                  Add Device
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device) => (
                <div
                  key={device.device_id}
                  onClick={() => setSelectedDevice(device.device_id)}
                  className={`p-6 rounded-lg border cursor-pointer transition transform hover:scale-105 ${
                    selectedDevice === device.device_id
                      ? "bg-blue-900/50 border-blue-500"
                      : "bg-slate-800 border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">
                        {device.name}
                      </h3>
                      <p className="text-slate-400 text-sm">{device.type}</p>
                    </div>
                    <div className="flex gap-2">
                      {device.status === "active" ? (
                        <Wifi className="w-5 h-5 text-green-400" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    📍 {device.location}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDevice(device.device_id);
                      }}
                      className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 px-3 py-2 rounded text-sm transition flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {tab === "alerts" && (
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No alerts at the moment</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border flex items-start gap-4 ${
                    alert.severity === "high"
                      ? "bg-red-900/20 border-red-700"
                      : alert.severity === "medium"
                      ? "bg-orange-900/20 border-orange-700"
                      : "bg-yellow-900/20 border-yellow-700"
                  }`}
                >
                  <AlertCircle
                    className={`w-6 h-6 mt-1 flex-shrink-0 ${
                      alert.severity === "high"
                        ? "text-red-400"
                        : alert.severity === "medium"
                        ? "text-orange-400"
                        : "text-yellow-400"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">{alert.message}</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Device:{" "}
                      <span className="text-slate-300">{alert.device_id}</span>
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      alert.severity === "high"
                        ? "bg-red-600 text-white"
                        : alert.severity === "medium"
                        ? "bg-orange-600 text-white"
                        : "bg-yellow-600 text-white"
                    }`}
                  >
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
