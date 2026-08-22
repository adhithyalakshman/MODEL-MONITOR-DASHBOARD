import { useEffect, useState, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Overview from "./pages/Overview";
import ModelDetail from "./pages/ModelDetail";
import Compare from "./pages/Compare";
import RegisterModel from "./pages/RegisterModel";
import api from "./api/client";

export default function App() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiDown, setApiDown] = useState(false);

  const loadModels = useCallback(async () => {
    try {
      const data = await api.listModels();
      setModels(data);
      setApiDown(false);
    } catch {
      setApiDown(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
    const interval = setInterval(loadModels, 15000);
    return () => clearInterval(interval);
  }, [loadModels]);

  return (
    <div className="flex min-h-screen bg-ink-0">
      <Sidebar models={models} />
      <main className="flex-1 px-8 py-8">
        {apiDown && (
          <div className="mb-6 border border-ink-950 bg-ink-950 text-ink-0 px-4 py-2.5 font-mono text-[12px]">
            ⚠ Cannot reach ingestion API at http://localhost:8000 — is the backend running?
          </div>
        )}
        <Routes>
          <Route path="/" element={<Overview models={models} loading={loading} />} />
          <Route path="/models/:modelId" element={<ModelDetail />} />
          <Route path="/compare" element={<Compare models={models} />} />
          <Route path="/register" element={<RegisterModel onRegistered={loadModels} />} />
        </Routes>
      </main>
    </div>
  );
}
