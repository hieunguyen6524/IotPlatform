import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Activity,
  AlertCircle,
  LogOut,
  User,
  Wifi,
  WifiOff,
  X,
  Check,
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
import axios from "axios";

// Axios Configuration
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://example.com/api";

const axiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor - Thêm token vào mọi request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor - Xử lý refresh token khi 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const accessToken = localStorage.getItem("accessToken");

        if (!refreshToken || !accessToken) {
          throw new Error("No tokens available");
        }

        const response = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken,
          accessToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data;

        localStorage.setItem("accessToken", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Types
interface Device {
  deviceId: string;
  name: string;
  location: string;
  status: string;
  type: string;
  registeredAt?: string;
}

interface SensorData {
  deviceId: string;
  sensorType: string;
  value: number;
  timestamp: string;
}

interface Alert {
  deviceId: string;
  timestamp: string;
  sensorType: string;
  message: string;
  severity: string;
  value: number;
}

interface Analytics {
  deviceId: string;
  analysisDate: string;
  sensorType: string;
  avgValue: number;
  dataPoints: number;
  maxValue: number;
  minValue: number;
  predictedValue?: number;
  processedAt: string;
}

interface User {
  username: string;
  displayName: string;
  role: string;
}

// Login Component
function LoginPage({ onLogin }: { onLogin: () => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axiosInstance.post("/auth/login", {
        username,
        password,
      });

      if (response.status === 200 && response.data) {
        const { accessToken, refreshToken } = response.data;

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("isAuthenticated", "true");

        await onLogin();
      } else {
        setError("Unexpected response from server.");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const msg =
          err.response?.data?.message ||
          (status === 404
            ? "Invalid username or password"
            : "Login failed, please try again.");
        setError(msg);
      } else {
        setError("Unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Activity className="w-12 h-12 text-blue-400 mr-3" />
          <h1 className="text-3xl font-bold text-white">IoT Dashboard</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-slate-300 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter password"
              required
            />
          </div>
          {error && (
            <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-2 rounded">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-medium transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Main Dashboard
export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [selectedSensorType, setSelectedSensorType] = useState<string>("");
  const [sensorTypes, setSensorTypes] = useState<string[]>([]);
  const [latestData, setLatestData] = useState<SensorData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [alertFilterDevice, setAlertFilterDevice] = useState<string>("all");
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [sensorHistory, setSensorHistory] = useState<SensorData[]>([]);
  const [tab, setTab] = useState<"overview" | "devices" | "alerts">("overview");
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showEditDevice, setShowEditDevice] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [newDevice, setNewDevice] = useState({
    deviceId: "",
    name: "",
    location: "",
    type: "TemperatureSensor",
    status: "Active",
  });

  // Khởi tạo - Kiểm tra authentication
  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated");
    const token = localStorage.getItem("accessToken");

    if (auth === "true" && token) {
      setIsAuthenticated(true);
      fetchUserProfile();
    }
  }, []);

  // Fetch data sau khi đã có user profile
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchDevices();
      fetchAlerts();

      const interval = setInterval(() => {
        if (selectedDeviceId) fetchLatestData();
        fetchAlerts();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user, selectedDeviceId]);

  // Fetch latest data khi chọn device
  useEffect(() => {
    if (selectedDeviceId) {
      fetchLatestData();
    }
  }, [selectedDeviceId]);

  // Fetch analytics và history khi chọn sensor type
  useEffect(() => {
    if (selectedDeviceId && selectedSensorType) {
      fetchAnalytics();
      fetchSensorHistory();
    }
  }, [selectedDeviceId, selectedSensorType]);

  // Filter alerts
  useEffect(() => {
    if (alertFilterDevice === "all") {
      setFilteredAlerts(alerts);
    } else {
      setFilteredAlerts(alerts.filter((a) => a.deviceId === alertFilterDevice));
    }
  }, [alerts, alertFilterDevice]);

  const fetchUserProfile = async () => {
    try {
      const res = await axiosInstance.get("/auth/profile");
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      localStorage.clear();
      setIsAuthenticated(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await axiosInstance.get("/devices");
      setDevices(res.data);
      if (res.data.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(res.data[0].deviceId);
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    }
  };

  const fetchLatestData = async () => {
    if (!selectedDeviceId) return;
    try {
      const res = await axiosInstance.get(
        `/sensor-data/${selectedDeviceId}/latest`
      );
      const dataArray = Array.isArray(res.data) ? res.data : [res.data];
      setLatestData(dataArray);

      const types = [
        ...new Set(dataArray.map((d: SensorData) => d.sensorType)),
      ];
      setSensorTypes(types);
      if (types.length > 0 && !selectedSensorType) {
        setSelectedSensorType(types[0]);
      }
    } catch (err) {
      console.error("Failed to fetch latest data:", err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await axiosInstance.get("/alerts");
      setAlerts(res.data);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedDeviceId) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await axiosInstance.get(
        `/analytics/${selectedDeviceId}?date=${today}`
      );
      const data = Array.isArray(res.data) ? res.data : [res.data];
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setAnalytics([]);
    }
  };

  const fetchSensorHistory = async () => {
    if (!selectedDeviceId) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await axiosInstance.get(
        `/sensor-data/${selectedDeviceId}?date=${today}`
      );
      const data = Array.isArray(res.data) ? res.data : [res.data];
      setSensorHistory(
        data.filter((s: SensorData) => s.sensorType === selectedSensorType)
      );
    } catch (err) {
      console.error("Failed to fetch sensor history:", err);
      setSensorHistory([]);
    }
  };

  const handleLoginSuccess = async () => {
    setIsAuthenticated(true);
    await fetchUserProfile();
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.clear();
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const handleAddDevice = async () => {
    if (!newDevice.deviceId || !newDevice.name || !newDevice.location) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("deviceId", newDevice.deviceId);
      formData.append("name", newDevice.name);
      formData.append("location", newDevice.location);
      formData.append("type", newDevice.type);
      formData.append("status", newDevice.status);

      const response = await axiosInstance.post("/devices", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 204) {
        fetchDevices();
        setNewDevice({
          deviceId: "",
          name: "",
          location: "",
          type: "TemperatureSensor",
          status: "Active",
        });
        setShowAddDevice(false);
        alert("Device added successfully!");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 409) {
          alert("Device ID already exists!");
        } else if (status === 403) {
          alert("You do not have permission to add devices!");
        } else {
          alert("Failed to add device!");
        }
      }
    }
  };

  const handleUpdateDevice = async () => {
    if (!editingDevice) return;

    try {
      const formData = new FormData();
      if (editingDevice.name) formData.append("name", editingDevice.name);
      if (editingDevice.location)
        formData.append("location", editingDevice.location);
      if (editingDevice.status) formData.append("status", editingDevice.status);

      const response = await axiosInstance.patch(
        `/devices/${editingDevice.deviceId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response.status === 204) {
        fetchDevices();
        setShowEditDevice(false);
        setEditingDevice(null);
        alert("Device updated successfully!");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 404) {
          alert("Device not found!");
        } else if (status === 403) {
          alert("You do not have permission to update devices!");
        } else {
          alert("Failed to update device!");
        }
      }
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm("Are you sure you want to delete this device?")) return;

    try {
      const response = await axiosInstance.delete(`/devices/${deviceId}`);
      if (response.status === 204) {
        fetchDevices();
        alert("Device deleted successfully!");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 404) {
          alert("Device not found!");
        } else if (status === 403) {
          alert("You do not have permission to delete devices!");
        } else {
          alert("Failed to delete device!");
        }
      }
    }
  };

  const isEditor = user?.role === "Editor" || user?.role === "Admin";

  const chartData = sensorHistory.slice(-24).map((s) => ({
    time: new Date(s.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    value: s.value,
  }));

  const currentAnalytics = analytics.find(
    (a) => a.sensorType === selectedSensorType
  );
  const currentLatestData = latestData.find(
    (d) => d.sensorType === selectedSensorType
  );

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLoginSuccess} />;
  }

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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-300">
                <User className="w-5 h-5" />
                <span>{user?.displayName || user?.username}</span>
                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Device & Sensor Selection */}
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-2 font-medium">
                    Select Device
                  </label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      setSelectedSensorType("");
                      setSensorTypes([]);
                    }}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Device --</option>
                    {devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.name} - {device.location}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-2 font-medium">
                    Select Sensor Type
                  </label>
                  <select
                    value={selectedSensorType}
                    onChange={(e) => setSelectedSensorType(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                    disabled={!sensorTypes.length}
                  >
                    <option value="">-- Choose Sensor --</option>
                    {sensorTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {selectedDeviceId && selectedSensorType && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                    <p className="text-slate-400 text-sm font-medium">
                      Current Value
                    </p>
                    <p className="text-3xl font-bold text-white mt-2">
                      {currentLatestData?.value.toFixed(1) || "N/A"}
                    </p>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                    <p className="text-slate-400 text-sm font-medium">
                      Avg Value
                    </p>
                    <p className="text-3xl font-bold text-green-400 mt-2">
                      {currentAnalytics?.avgValue.toFixed(1) || "N/A"}
                    </p>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                    <p className="text-slate-400 text-sm font-medium">
                      Max Value
                    </p>
                    <p className="text-3xl font-bold text-red-400 mt-2">
                      {currentAnalytics?.maxValue.toFixed(1) || "N/A"}
                    </p>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                    <p className="text-slate-400 text-sm font-medium">
                      Min Value
                    </p>
                    <p className="text-3xl font-bold text-blue-400 mt-2">
                      {currentAnalytics?.minValue.toFixed(1) || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Charts */}
                {chartData.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                      <h3 className="text-xl font-bold text-white mb-4">
                        Sensor Trend - {selectedSensorType}
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#475569"
                          />
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
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#475569"
                          />
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
                )}

                {/* Today's Analytics Table */}
                {currentAnalytics && (
                  <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-xl font-bold text-white mb-4">
                      Today's Analytics - {selectedSensorType}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-700">
                          <tr>
                            <th className="px-4 py-3 text-slate-300">Metric</th>
                            <th className="px-4 py-3 text-slate-300">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          <tr>
                            <td className="px-4 py-3 text-slate-300">
                              Average
                            </td>
                            <td className="px-4 py-3 text-white font-medium">
                              {currentAnalytics.avgValue.toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-slate-300">
                              Maximum
                            </td>
                            <td className="px-4 py-3 text-white font-medium">
                              {currentAnalytics.maxValue.toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-slate-300">
                              Minimum
                            </td>
                            <td className="px-4 py-3 text-white font-medium">
                              {currentAnalytics.minValue.toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-slate-300">
                              Data Points
                            </td>
                            <td className="px-4 py-3 text-white font-medium">
                              {currentAnalytics.dataPoints}
                            </td>
                          </tr>
                          {currentAnalytics.predictedValue && (
                            <tr>
                              <td className="px-4 py-3 text-slate-300">
                                Predicted Value
                              </td>
                              <td className="px-4 py-3 text-white font-medium">
                                {currentAnalytics.predictedValue.toFixed(2)}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {(!selectedDeviceId || !selectedSensorType) && (
              <div className="text-center py-12 text-slate-400 bg-slate-800 rounded-lg border border-slate-700">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Please select a device and sensor type to view data</p>
              </div>
            )}
          </div>
        )}

        {/* Devices Tab */}
        {tab === "devices" && (
          <div className="space-y-6">
            {isEditor && (
              <button
                onClick={() => setShowAddDevice(!showAddDevice)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                <Plus className="w-5 h-5" />
                Add Device
              </button>
            )}

            {showAddDevice && (
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">
                  Register New Device
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Device ID"
                    value={newDevice.deviceId}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, deviceId: e.target.value })
                    }
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Device Name"
                    value={newDevice.name}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, name: e.target.value })
                    }
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={newDevice.location}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, location: e.target.value })
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
                    <option>TemperatureSensor</option>
                    <option>HumiditySensor</option>
                    <option>PressureSensor</option>
                  </select>
                  <select
                    value={newDevice.status}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, status: e.target.value })
                    }
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Offline</option>
                    <option>Faulty</option>
                    <option>Maintenance</option>
                    <option>Decommissioned</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAddDevice}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded transition flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Add Device
                  </button>
                  <button
                    onClick={() => setShowAddDevice(false)}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded transition flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device) => (
                <div
                  key={device.deviceId}
                  className="p-6 rounded-lg border bg-slate-800 border-slate-700 hover:border-blue-500 transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">
                        {device.name}
                      </h3>
                      <p className="text-slate-400 text-sm">{device.type}</p>
                    </div>
                    <div className="flex gap-2">
                      {device.status === "Active" ? (
                        <Wifi className="w-5 h-5 text-green-400" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mb-2">
                    📍 {device.location}
                  </p>
                  <p className="text-slate-400 text-sm mb-4">
                    Status:{" "}
                    <span
                      className={
                        device.status === "Active"
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {device.status}
                    </span>
                  </p>
                  {isEditor && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingDevice(device);
                          setShowEditDevice(true);
                        }}
                        className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 px-3 py-2 rounded text-sm transition flex items-center justify-center gap-1"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDevice(device.deviceId)}
                        className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 px-3 py-2 rounded text-sm transition flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Edit Device Modal */}
            {showEditDevice && editingDevice && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 max-w-md w-full">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Edit Device
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-300 mb-2">
                        Device ID
                      </label>
                      <input
                        type="text"
                        value={editingDevice.deviceId}
                        disabled
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-slate-500 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-2">Name</label>
                      <input
                        type="text"
                        value={editingDevice.name}
                        onChange={(e) =>
                          setEditingDevice({
                            ...editingDevice,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={editingDevice.location}
                        onChange={(e) =>
                          setEditingDevice({
                            ...editingDevice,
                            location: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-2">
                        Status
                      </label>
                      <select
                        value={editingDevice.status}
                        onChange={(e) =>
                          setEditingDevice({
                            ...editingDevice,
                            status: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                        <option>Offline</option>
                        <option>Faulty</option>
                        <option>Maintenance</option>
                        <option>Decommissioned</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleUpdateDevice}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Update
                    </button>
                    <button
                      onClick={() => {
                        setShowEditDevice(false);
                        setEditingDevice(null);
                      }}
                      className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded transition flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {tab === "alerts" && (
          <div className="space-y-6">
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <label className="block text-slate-300 mb-2 font-medium">
                Filter by Device
              </label>
              <select
                value={alertFilterDevice}
                onChange={(e) => setAlertFilterDevice(e.target.value)}
                className="w-full md:w-1/2 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Devices</option>
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.name} ({device.deviceId})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-800 rounded-lg border border-slate-700">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No alerts at the moment</p>
                </div>
              ) : (
                filteredAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border flex items-start gap-4 ${
                      alert.severity === "High" || alert.severity === "high"
                        ? "bg-red-900/20 border-red-700"
                        : alert.severity === "Medium" ||
                          alert.severity === "medium"
                        ? "bg-orange-900/20 border-orange-700"
                        : "bg-yellow-900/20 border-yellow-700"
                    }`}
                  >
                    <AlertCircle
                      className={`w-6 h-6 mt-1 flex-shrink-0 ${
                        alert.severity === "High" || alert.severity === "high"
                          ? "text-red-400"
                          : alert.severity === "Medium" ||
                            alert.severity === "medium"
                          ? "text-orange-400"
                          : "text-yellow-400"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium">{alert.message}</p>
                      <p className="text-slate-400 text-sm mt-1">
                        Device:{" "}
                        <span className="text-slate-300">{alert.deviceId}</span>{" "}
                        | Sensor:{" "}
                        <span className="text-slate-300">
                          {alert.sensorType}
                        </span>{" "}
                        | Value:{" "}
                        <span className="text-slate-300">
                          {alert.value.toFixed(2)}
                        </span>
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        alert.severity === "High" || alert.severity === "high"
                          ? "bg-red-600 text-white"
                          : alert.severity === "Medium" ||
                            alert.severity === "medium"
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
          </div>
        )}
      </div>
    </div>
  );
}
