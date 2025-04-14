import React, { useState, useEffect } from 'react';

function ToolsPanel({ tools = [], onClose, onDisconnectServer, onReconnectServer }) {
  const [expandedTools, setExpandedTools] = useState({});
  const [configuredServers, setConfiguredServers] = useState([]);
  const [serverStatuses, setServerStatuses] = useState({});
  const [actionInProgress, setActionInProgress] = useState(null);

  useEffect(() => {
    const loadConfiguredServers = async () => {
      try {
        const settings = await window.electron.getSettings();
        if (settings && settings.mcpServers) {
          const servers = Object.entries(settings.mcpServers).map(([id, config]) => ({
            id,
            command: config.command,
            args: config.args || []
          }));
          setConfiguredServers(servers);

          // Determine which servers are currently connected
          const statuses = {};
          servers.forEach(server => {
            // Check if there are tools from this server
            const hasToolsFromServer = tools.some(tool => tool.serverId === server.id);
            statuses[server.id] = hasToolsFromServer ? 'connected' : 'disconnected';
          });
          setServerStatuses(statuses);
        }
      } catch (error) {
        console.error('Error loading configured servers:', error);
      }
    };
    
    loadConfiguredServers();
  }, [tools]);

  // Add event listener for ESC key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Clean up the event listener when the component unmounts
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const toggleToolExpand = (toolName) => {
    setExpandedTools(prev => ({
      ...prev,
      [toolName]: !prev[toolName]
    }));
  };

  const handleDisconnect = async (serverId) => {
    if (!onDisconnectServer || serverStatuses[serverId] !== 'connected') return;
    
    setActionInProgress(serverId);
    try {
      const success = await onDisconnectServer(serverId);
      if (success) {
        setServerStatuses(prev => ({ ...prev, [serverId]: 'disconnected' }));
      }
    } catch (error) {
      console.error(`Error disconnecting from server ${serverId}:`, error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReconnect = async (serverId) => {
    if (!onReconnectServer || serverStatuses[serverId] !== 'disconnected') return;
    
    setActionInProgress(serverId);
    try {
      const success = await onReconnectServer(serverId);
      if (success) {
        setServerStatuses(prev => ({ ...prev, [serverId]: 'connected' }));
      } else {
        console.error(`Failed to reconnect to server ${serverId}`);
      }
    } catch (error) {
      console.error(`Error reconnecting to server ${serverId}:`, error);
    } finally {
      setActionInProgress(null);
    }
  };

  // Group tools by server
  const toolsByServer = (tools || []).reduce((acc, tool) => {
    const serverId = tool.serverId || 'unknown';
    if (!acc[serverId]) {
      acc[serverId] = [];
    }
    acc[serverId].push(tool);
    return acc;
  }, {});

  // Servers with no tools (disconnected)
  const disconnectedServers = configuredServers
    .filter(server => !toolsByServer[server.id])
    .map(server => server.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 w-full max-w-3xl max-h-[80vh] rounded-lg shadow-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Available Tools ({tools.length})</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {/* Show configured servers section */}
          {configuredServers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Configured MCP Servers</h3>
              <div className="border dark:border-gray-700 rounded-md overflow-hidden mb-4">
                {configuredServers.map(server => (
                  <div key={server.id} className="p-3 border-b dark:border-gray-700 last:border-b-0 bg-gray-50 dark:bg-gray-900 flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-300 flex items-center">
                        {server.id}
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                          serverStatuses[server.id] === 'connected' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {serverStatuses[server.id] === 'connected' ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <div><span className="font-mono">$ {server.command} {server.args.join(' ')}</span></div>
                      </div>
                    </div>
                    {serverStatuses[server.id] === 'connected' ? (
                      <button
                        onClick={() => handleDisconnect(server.id)}
                        disabled={actionInProgress === server.id}
                        className="text-blue-600 hover:text-blue-800 text-sm py-1 px-2 bg-blue-100 hover:bg-blue-200 rounded disabled:opacity-50"
                      >
                        {actionInProgress === server.id ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReconnect(server.id)}
                        disabled={actionInProgress === server.id}
                        className="text-green-600 hover:text-green-800 text-sm py-1 px-2 bg-green-100 hover:bg-green-200 rounded disabled:opacity-50"
                      >
                        {actionInProgress === server.id ? 'Connecting...' : 'Reconnect'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 italic">
                These servers are automatically started when the application launches.
                You can manage them in the settings.
              </p>
            </div>
          )}
        
          {/* Available tools section */}
          <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Available Tools by Server</h3>
          {Object.keys(toolsByServer).length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center">No tools available. All configured servers are disconnected.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(toolsByServer).map(([serverId, serverTools]) => (
                <div key={serverId} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="p-3 bg-gray-200 dark:bg-gray-600 flex justify-between items-center">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Server: {serverId} ({serverTools.length} tools)
                    </h3>
                    {serverId !== 'unknown' && (
                      <button
                        onClick={() => handleDisconnect(serverId)}
                        disabled={actionInProgress === serverId}
                        className="text-sm text-red-600 hover:text-red-800 py-1 px-2 bg-red-100 hover:bg-red-200 rounded disabled:opacity-50"
                      >
                        {actionInProgress === serverId ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    )}
                  </div>
                  
                  <div className="p-2 space-y-2">
                    {serverTools.map((tool, index) => (
                      <div 
                        key={`${tool.name}-${index}`} 
                        className="border dark:border-gray-700 rounded-lg overflow-hidden"
                      >
                        <div 
                          className="p-3 bg-gray-100 dark:bg-gray-700 flex justify-between items-center cursor-pointer"
                          onClick={() => toggleToolExpand(tool.name)}
                        >
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{tool.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {tool.description?.substring(0, 100)}
                              {tool.description?.length > 100 ? '...' : ''}
                            </p>
                          </div>
                          <span className="text-gray-500">
                            {expandedTools[tool.name] ? '▼' : '▶'}
                          </span>
                        </div>
                        
                        {expandedTools[tool.name] && (
                          <div className="p-3 border-t dark:border-gray-700">
                            <div className="mb-2">
                              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">Full Description:</h4>
                              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{tool.description}</p>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">Input Schema:</h4>
                              <pre className="bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto text-xs">
                                {JSON.stringify(tool.input_schema, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ToolsPanel; 