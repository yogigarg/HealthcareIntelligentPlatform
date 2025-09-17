import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5081';

class MCPClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Add response interceptor for debugging
    this.client.interceptors.response.use(
      response => {
        console.log('MCP Response:', response.data);
        return response;
      },
      error => {
        console.error('MCP Error:', error);
        return Promise.reject(error);
      }
    );
  }

  async callTool(toolName, args) {
    try {
      console.log(`Calling MCP tool: ${toolName}`, args);
      
      const response = await this.client.post('/mcp/call-tool', {
        name: toolName,
        arguments: args,
        session_id: this.getSessionId()
      });

      // Handle the response data
      let data = response.data;
      console.log('Raw MCP response data:', data);
      
      // Check if the response is a string that needs parsing
      if (typeof data === 'string') {
        try {
          // Try to parse it as JSON
          const parsedData = JSON.parse(data);
          console.log('Parsed string response:', parsedData);
          return parsedData;
        } catch (e) {
          console.error('Failed to parse string response:', e);
          // If it's not valid JSON, return an error structure
          return {
            status: 'error',
            error_message: 'Invalid response format from server',
            raw_response: data
          };
        }
      }
      
      // If the response has a nested structure, extract it
      if (data && typeof data === 'object') {
        // Check for various nested structures
        if (data.result) {
          return data.result;
        }
        if (data.data) {
          return data.data;
        }
        // If it has status and other properties, return as is
        if (data.status || data.trials || data.results) {
          return data;
        }
        // Check if it's wrapped in another layer
        if (data.response && typeof data.response === 'object') {
          return data.response;
        }
      }
      
      return data;
    } catch (error) {
      console.error('MCP tool call error:', error);
      
      // Extract meaningful error message
      let errorMessage = 'An error occurred';
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.error_message || 
                      error.response.data?.error || 
                      error.response.data?.message || 
                      `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'No response from server. Please check if the MCP server is running.';
      } else {
        // Error in request setup
        errorMessage = error.message;
      }
      
      return { 
        status: 'error', 
        error_message: errorMessage,
        details: error.response?.data
      };
    }
  }

  async getAvailableTools() {
    try {
      const response = await this.client.get('/mcp/tools');
      return response.data?.tools || [];
    } catch (error) {
      console.error('Error fetching tools:', error);
      return [];
    }
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('mcp_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('mcp_session_id', sessionId);
    }
    return sessionId;
  }

  clearSessionId() {
    sessionStorage.removeItem('mcp_session_id');
  }

  async testConnection() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('Connection test failed:', error);
      return { status: 'error', message: 'Failed to connect to MCP server' };
    }
  }
}

export default new MCPClient();
