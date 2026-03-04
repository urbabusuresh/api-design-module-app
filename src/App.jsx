import React, { useState, useEffect } from 'react';
import ProjectSelection from './pages/ProjectSelection';
import ProjectDashboard from './pages/ProjectDashboard';
import Wso2ProjectDashboard from './pages/Wso2ProjectDashboard'; // New Component
import { api } from './api';
import toast, { Toaster } from 'react-hot-toast';

import Login from './pages/Login';
import UserManagement from './pages/UserManagement';

function App() {
  const [user, setUser] = useState(null); // Auth State
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('main'); // 'main' or 'admin-users'

  // Auto-init user from storage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('knotapi_user');
      const savedTime = localStorage.getItem('knotapi_auth_time');

      if (savedUser && savedTime) {
        const elapsed = Date.now() - parseInt(savedTime, 10);
        // Valid for 60 minutes
        if (elapsed < 60 * 60 * 1000) {
          setUser(JSON.parse(savedUser));
        } else {
          localStorage.removeItem('knotapi_user');
          localStorage.removeItem('knotapi_auth_time');
        }
      }
    } catch (e) {
      console.error("Auth restore failed", e);
    }

    // Handle initial hash for hidden route
    if (window.location.hash === '#/admin/users') {
      setView('admin-users');
    }

    const handleHashChange = () => {
      if (window.location.hash === '#/admin/users') {
        setView('admin-users');
      } else {
        setView('main');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    localStorage.setItem('knotapi_user', JSON.stringify(u));
    localStorage.setItem('knotapi_auth_time', Date.now().toString());
  };

  const handleLogout = () => {
    setUser(null);
    setActiveProject(null);
    localStorage.removeItem('knotapi_user');
    localStorage.removeItem('knotapi_auth_time');
  };

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  const loadProjects = async () => {
    try {
      const list = await api.getProjects();
      setProjects(list);
    } catch (e) {
      console.error("Failed to load projects", e);
      setProjects([]);
    }
  };

  const handleSelectProject = async (projectSummary, silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (projectSummary.type === 'WSO2_REMOTE') {
        // WSO2 Dynamic Fetch
        const apis = await api.getWso2ProjectApis(projectSummary.id);

        // Construct Mock Project Structure for UI Compatibility
        const wso2System = { id: 'sys_wso2', name: 'WSO2 Gateway', status: 'Active' };
        const wso2Service = { id: 'svc_wso2', name: 'Published APIs', system_id: 'sys_wso2', version: 'v1', status: 'Active' };

        // Attach APIs to Service
        // For Dashboard Compatibility:
        // 1. Service needs 'subApis' = [list of apis]
        // 2. System needs 'rootApis' = [list of services] (Legacy naming in my dashboard)

        wso2Service.subApis = apis.map(a => ({
          id: a.id,
          name: a.name || a.api_name || 'Unnamed API',   // new shape: name; old shape: api_name
          url: a.url || a.context || '',                  // new shape: context; old shape: url
          method: a.method || a.http_method || 'GET',
          description: a.description,
          status: a.status || a.lifeCycleStatus,
          version: a.version,
          // WSO2 specific
          wso2_id: a.wso2_id || a.id,
          endpoint_config: a.endpoint_config || a.endpointConfig,
          api_type: a.api_type || a.type,
          provider: a.provider,
          operationCount: a.operationCount,
          // Add extra fields needed for display
          module: 'WSO2',
          consumers: [],
          downstream: []
        }));

        wso2System.rootApis = [wso2Service]; // "rootApis" in Dashboard maps to Services list
        wso2System.services = [wso2Service];

        const fullProject = {
          ...projectSummary,
          systems: [wso2System],
          settings: { categories: [] }
        };
        setActiveProject(fullProject);

      } else {
        // Standard Local Project
        const fullProject = await api.getProject(projectSummary.id);
        setActiveProject(fullProject);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load project details: ' + e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCreateProject = async ({ name, description, moduleName, systems = [], modules = [], authProfiles = [] }) => {
    if (!name) return;
    try {
      const newProj = await api.createProject({
        name,
        description: description || "New Workspace",
        settings: { categories: [], channels: { northbound: [], southbound: [] } },
        moduleName, // Optional initial module (legacy)
        systems,    // Array of system names from wizard
        modules,    // Array of module names from wizard
        authProfiles // Array of auth profile stubs from wizard
      });
      setProjects([...projects, newProj]);
    } catch (e) {
      toast.error('Failed to create project');
    }
  };

  const handleImportWso2 = async (wso2Config) => {
    setLoading(true);
    try {
      const res = await api.createWso2Project(wso2Config);
      await loadProjects();
    } catch (e) {
      toast.error(`Connection Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      await api.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
      toast.success('Project deleted successfully');
    } catch (e) {
      toast.error('Failed to delete project: ' + e.message);
    }
  };

  if (!user) {
    return (
      <>
        <Toaster position="top-right" reverseOrder={false} />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  if (loading) {
    return <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-medium lowercase tracking-wide">Loading <span className="text-red-700 font-extrabold uppercase ml-2">KNOT</span><span className="text-red-500 font-bold uppercase"><span className="logo-ai-highlight inline-block">A</span>P<span className="logo-ai-highlight inline-block">I</span></span> Workspace...</div>;
  }

  if (view === 'admin-users') {
    return (
      <>
        <Toaster position="top-right" reverseOrder={false} />
        <UserManagement
          user={user}
          onBack={() => { setView('main'); window.location.hash = ''; }}
        />
      </>
    );
  }

  if (!activeProject) {
    return (
      <>
        <Toaster position="top-right" reverseOrder={false} />
        <ProjectSelection
          projects={projects}
          onSelect={handleSelectProject}
          onCreate={handleCreateProject}
          onImportWso2={handleImportWso2}
          onDelete={handleDeleteProject}
          user={user}
          onLogout={handleLogout}
        />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      {activeProject.type === 'WSO2_REMOTE' ? (
        <Wso2ProjectDashboard
          project={activeProject}
          onRefresh={() => handleSelectProject(activeProject, true)}
          onBack={() => { setActiveProject(null); loadProjects(); }}
        />
      ) : (
        <ProjectDashboard
          project={activeProject}
          allProjects={projects}
          onRefresh={() => handleSelectProject(activeProject, true)}
          onBack={() => { setActiveProject(null); loadProjects(); }}
        />
      )}
    </>
  );
}

export default App;
