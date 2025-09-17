import OpenAI from 'openai';
import mcpClient from './mcpClient';

class MultiAgentFactory {
 constructor() {
   this.openai = new OpenAI({
     apiKey: process.env.REACT_APP_OPENAI_API_KEY,
     dangerouslyAllowBrowser: true
   });
   
   this.agents = [
     {
       id: 'fda_agent',
       name: 'FDA Drug Information Agent',
       role: 'FDA drug specialist',
       systemPrompt: 'You are an FDA drug information specialist. Use the fda_drug_lookup tool to search for drug information, adverse events, and labels. Always provide accurate, detailed information from FDA databases.',
       tools: ['fda_drug_lookup']
     },
     {
       id: 'clinical_research_agent',
       name: 'Clinical Trials Research Agent',
       role: 'Clinical trials researcher',
       systemPrompt: 'You are a clinical trials research specialist. Use the clinical_trials_search tool to find relevant clinical trials. Provide comprehensive information about ongoing and completed trials.',
       tools: ['clinical_trials_search']
     },
     {
       id: 'interaction_checker_agent',
       name: 'Drug Interaction Specialist',
       role: 'Drug interaction expert',
       systemPrompt: 'You are a drug interaction specialist. Use the fda_drug_lookup and pubmed_search tools to check for drug interactions and contraindications. Always prioritize patient safety.',
       tools: ['fda_drug_lookup', 'pubmed_search']
     },
     {
       id: 'medical_literature_agent',
       name: 'Medical Literature Researcher',
       role: 'Medical literature expert',
       systemPrompt: 'You are a medical literature research specialist. Use the pubmed_search tool to find relevant medical research papers and studies. Provide evidence-based information from peer-reviewed sources.',
       tools: ['pubmed_search']
     },
     {
       id: 'health_education_agent',
       name: 'Health Education Specialist',
       role: 'Health education expert',
       systemPrompt: 'You are a health education specialist. Use the health_topics tool to provide evidence-based health information in easy-to-understand language. Support multiple languages when requested.',
       tools: ['health_topics']
     },
     {
       id: 'medical_coding_agent',
       name: 'Medical Coding Specialist',
       role: 'Medical coding expert',
       systemPrompt: 'You are a medical coding specialist. Use the lookup_icd_code and medical_terminology_search tools to help with medical coding, terminology, and classification. Provide accurate ICD-10 codes and medical definitions.',
       tools: ['lookup_icd_code', 'medical_terminology_search']
     },
     {
       id: 'general_assistant',
       name: 'General Healthcare Assistant',
       role: 'General healthcare AI',
       systemPrompt: 'You are a helpful healthcare AI assistant. You can use any of the available MCP tools to help answer healthcare questions. Always provide accurate, evidence-based information.',
       tools: ['fda_drug_lookup', 'pubmed_search', 'health_topics', 'clinical_trials_search', 'lookup_icd_code', 'medical_terminology_search', 'ai_clinical_search', 'interaction_checker']
     }
   ];
 }

 async initialize() {
   // Any initialization logic
   console.log('Multi-agent system initialized');
 }

 getAllAgents() {
   return this.agents;
 }

 async routeQuery(agentId, query) {
   const agent = this.agents.find(a => a.id === agentId);
   if (!agent) {
     return { error: 'Agent not found' };
   }

   try {
     // Create messages with agent's system prompt
     const messages = [
       {
         role: 'system',
         content: agent.systemPrompt + '\n\nYou have access to these MCP tools: ' + agent.tools.join(', ') + '. Use them when needed to answer the user\'s query accurately.'
       },
       {
         role: 'user',
         content: query
       }
     ];

     // Get initial response from OpenAI
     const response = await this.openai.chat.completions.create({
       model: process.env.REACT_APP_OPENAI_MODEL || 'gpt-4-turbo-preview',
       messages: messages,
       temperature: 0.7,
       max_tokens: 1000,
       functions: this.getToolFunctions(agent.tools),
       function_call: 'auto'
     });

     const message = response.choices[0].message;
     
     // Check if the model wants to use a tool
     if (message.function_call) {
       const toolName = message.function_call.name;
       const toolArgs = JSON.parse(message.function_call.arguments);
       
       // Call the MCP tool
       const toolResult = await mcpClient.callTool(toolName, toolArgs);
       
       // Get final response with tool results
       const finalResponse = await this.openai.chat.completions.create({
         model: process.env.REACT_APP_OPENAI_MODEL || 'gpt-4-turbo-preview',
         messages: [
           ...messages,
           message,
           {
             role: 'function',
             name: toolName,
             content: JSON.stringify(toolResult)
           }
         ],
         temperature: 0.7,
         max_tokens: 1500
       });
       
       return {
         response: finalResponse.choices[0].message.content,
         agent: agent.name,
         mcpToolsUsed: [toolName],
         toolResults: toolResult
       };
     }
     
     // No tool needed, return direct response
     return {
       response: message.content,
       agent: agent.name,
       mcpToolsUsed: []
     };
     
   } catch (error) {
     console.error('Agent query error:', error);
     return {
       error: error.message,
       agent: agent.name
     };
   }
 }

 getToolFunctions(toolNames) {
   const allTools = {
     fda_drug_lookup: {
       name: 'fda_drug_lookup',
       description: 'Look up drug information from the FDA database',
       parameters: {
         type: 'object',
         properties: {
           drug_name: {
             type: 'string',
             description: 'Name of the drug to search for'
           },
           search_type: {
             type: 'string',
             enum: ['general', 'label', 'adverse_events'],
             description: 'Type of information to retrieve'
           }
         },
         required: ['drug_name']
       }
     },
     pubmed_search: {
       name: 'pubmed_search',
       description: 'Search for medical literature in PubMed database',
       parameters: {
         type: 'object',
         properties: {
           query: {
             type: 'string',
             description: 'Search query for medical literature'
           },
           max_results: {
             type: 'integer',
             description: 'Maximum number of results to return',
             default: 5
           },
           date_range: {
             type: 'string',
             description: 'Limit to articles published within years (e.g. "5" for last 5 years)'
           }
         },
         required: ['query']
       }
     },
     clinical_trials_search: {
       name: 'clinical_trials_search',
       description: 'Search for clinical trials by condition',
       parameters: {
         type: 'object',
         properties: {
           condition: {
             type: 'string',
             description: 'Medical condition or disease to search for'
           },
           status: {
             type: 'string',
             enum: ['recruiting', 'completed', 'active', 'not_recruiting', 'all'],
             description: 'Trial status',
             default: 'recruiting'
           },
           max_results: {
             type: 'integer',
             description: 'Maximum number of results to return',
             default: 10
           }
         },
         required: ['condition']
       }
     },
     health_topics: {
       name: 'health_topics',
       description: 'Get evidence-based health information on various topics',
       parameters: {
         type: 'object',
         properties: {
           topic: {
             type: 'string',
             description: 'Health topic to search for information'
           },
           language: {
             type: 'string',
             enum: ['en', 'es'],
             description: 'Language for content',
             default: 'en'
           }
         },
         required: ['topic']
       }
     },
     lookup_icd_code: {
       name: 'lookup_icd_code',
       description: 'Look up ICD-10 codes by code or description',
       parameters: {
         type: 'object',
         properties: {
           code: {
             type: 'string',
             description: 'ICD-10 code to look up'
           },
           description: {
             type: 'string',
             description: 'Medical condition description to search for'
           },
           max_results: {
             type: 'integer',
             description: 'Maximum number of results to return',
             default: 10
           }
         }
       }
     },
     medical_terminology_search: {
       name: 'medical_terminology_search',
       description: 'Search for medical terminology definitions',
       parameters: {
         type: 'object',
         properties: {
           term: {
             type: 'string',
             description: 'Medical term to search for'
           }
         },
         required: ['term']
       }
     },
     ai_clinical_search: {
       name: 'ai_clinical_search',
       description: 'AI-powered clinical search for complex medical queries',
       parameters: {
         type: 'object',
         properties: {
           query: {
             type: 'string',
             description: 'Clinical query or question'
           }
         },
         required: ['query']
       }
     },
     interaction_checker: {
       name: 'interaction_checker',
       description: 'Check for drug interactions between medications',
       parameters: {
         type: 'object',
         properties: {
           drug1: {
             type: 'string',
             description: 'First drug name'
           },
           drug2: {
             type: 'string',
             description: 'Second drug name'
           }
         },
         required: ['drug1', 'drug2']
       }
     }
   };

   return toolNames.map(name => allTools[name]).filter(Boolean);
 }
}

export default new MultiAgentFactory();
