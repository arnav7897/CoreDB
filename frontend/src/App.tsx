import React, { useState, useCallback, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import axios from 'axios';
import { Play, Plus, Trash2, PlayCircle, Database, Clock, CheckCircle, XCircle, Loader, HelpCircle, X, Copy, ChevronDown, ChevronRight, RefreshCw, Table, Key, Hash } from 'lucide-react';
import config from './config';
import './App.css';

// Types
interface QueryResult {
  success: boolean;
  result: any[] | null;
  columns: string[] | null;
  time_ms: number;
  message: string | null;
  error: string | null;
  affected_rows: number | null;
}

interface QueryHistory {
  query: string;
  timestamp: number;
  success: boolean;
  time_ms: number;
  affected_rows: number | null;
}

interface Cell {
  id: string;
  query: string;
  result: QueryResult | null;
  isExecuting: boolean;
  isCollapsed: boolean;
}

interface TableInfo {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    primary_key: boolean;
    foreign_key: string | null;
  }>;
  primary_key: string | null;
  foreign_keys: Array<{
    column: string;
    references_table: string;
    references_column: string;
  }>;
  row_count: number;
}

const App: React.FC = () => {
  // State
  const [cells, setCells] = useState<Cell[]>([
    {
      id: 'cell-1',
      query: config.DEFAULT_QUERY,
      result: null,
      isExecuting: false,
      isCollapsed: false
    }
  ]);
  const [history, setHistory] = useState<QueryHistory[]>([]);
  const [sessionId] = useState<string>(() => `session-${Date.now()}`);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [isRunningAll, setIsRunningAll] = useState<boolean>(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(false);
  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(true);

  // Load query history and tables on component mount
  useEffect(() => {
    loadHistory();
    loadTables();
  }, []);

  // Load query history
  const loadHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${config.API_BASE_URL}/api/v1/history`, {
        params: { session_id: sessionId }
      });
      const data = response.data as { queries?: QueryHistory[] };
      setHistory(data.queries || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, [sessionId]);

  // Load tables
  const loadTables = useCallback(async () => {
    setIsLoadingTables(true);
    try {
      const response = await axios.get(`${config.API_BASE_URL}/api/v1/tables`);
      const data = response.data as { success: boolean; tables: TableInfo[] };
      if (data.success) {
        setTables(data.tables);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setIsLoadingTables(false);
    }
  }, []);

  // Execute query for a specific cell
  const executeCell = useCallback(async (cellId: string) => {
    const cell = cells.find(c => c.id === cellId);
    if (!cell || !cell.query.trim()) return;

    // Update cell to show executing state
    setCells(prev => prev.map(c => 
      c.id === cellId 
        ? { ...c, isExecuting: true, result: null }
        : c
    ));

    try {
      const response = await axios.post(`${config.API_BASE_URL}/api/v1/execute`, {
        query: cell.query,
        session_id: sessionId
      });

      const result: QueryResult = response.data as QueryResult;

      // Update cell with result
      setCells(prev => prev.map(c => 
        c.id === cellId 
          ? { ...c, result, isExecuting: false }
          : c
      ));

      // Add to history
      const historyItem: QueryHistory = {
        query: cell.query,
        timestamp: Date.now() / 1000,
        success: result.success,
        time_ms: result.time_ms,
        affected_rows: result.affected_rows
      };
      setHistory(prev => [historyItem, ...prev.slice(0, config.MAX_HISTORY_ITEMS - 1)]);

      // Refresh tables if DDL operation
      if (result.success && (
        cell.query.trim().toUpperCase().startsWith('CREATE TABLE') ||
        cell.query.trim().toUpperCase().startsWith('DROP TABLE')
      )) {
        loadTables();
      }

    } catch (error: any) {
      const errorResult: QueryResult = {
        success: false,
        result: null,
        columns: null,
        time_ms: 0,
        message: null,
        error: error.response?.data?.error || error.message || 'Unknown error',
        affected_rows: null
      };

      setCells(prev => prev.map(c => 
        c.id === cellId 
          ? { ...c, result: errorResult, isExecuting: false }
          : c
      ));
    }
  }, [cells, sessionId]);

  // Execute all cells
  const executeAllCells = useCallback(async () => {
    setIsRunningAll(true);
    
    for (const cell of cells) {
      if (cell.query.trim()) {
        await executeCell(cell.id);
        // Small delay between cells for better UX
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    setIsRunningAll(false);
  }, [cells, executeCell]);

  // Add new cell
  const addCell = useCallback(() => {
    const newCell: Cell = {
      id: `cell-${Date.now()}`,
      query: '',
      result: null,
      isExecuting: false,
      isCollapsed: false
    };
    setCells(prev => [...prev, newCell]);
  }, []);

  // Delete cell
  const deleteCell = useCallback((cellId: string) => {
    if (cells.length <= 1) return; // Don't delete the last cell
    setCells(prev => prev.filter(c => c.id !== cellId));
  }, [cells.length]);

  // Update cell query
  const updateCellQuery = useCallback((cellId: string, query: string) => {
    setCells(prev => prev.map(c => 
      c.id === cellId ? { ...c, query } : c
    ));
  }, []);

  // Toggle cell collapse
  const toggleCellCollapse = useCallback((cellId: string) => {
    setCells(prev => prev.map(c => 
      c.id === cellId ? { ...c, isCollapsed: !c.isCollapsed } : c
    ));
  }, []);

  // Reset database
  const resetDatabase = useCallback(async () => {
    try {
      await axios.post(`${config.API_BASE_URL}/api/v1/reset`);
      setCells(prev => prev.map(c => ({ ...c, result: null })));
      setHistory([]);
      loadTables(); // Refresh tables after reset
    } catch (error) {
      console.error('Failed to reset database:', error);
    }
  }, [loadTables]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <Database className="header-icon" />
            <h1>SQL Notebook</h1>
          </div>
          <div className="header-right">
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowLeftPanel(!showLeftPanel)}
            >
              <Table size={16} />
              {showLeftPanel ? 'Hide' : 'Show'} Tables
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowHelp(true)}
            >
              <HelpCircle size={16} />
              Help
            </button>
            <button 
              className="btn btn-primary" 
              onClick={executeAllCells}
              disabled={isRunningAll}
            >
              {isRunningAll ? (
                <Loader size={16} className="spinning" />
              ) : (
                <PlayCircle size={16} />
              )}
              Run All Cells
            </button>
            <button 
              className="btn btn-danger" 
              onClick={resetDatabase}
            >
              Reset DB
            </button>
          </div>
        </div>
      </header>

      <div className="main-content">
        {showLeftPanel && (
          <div className="left-panel">
            <div className="panel-header">
              <h3>Database Tables</h3>
              <button 
                className="btn btn-small btn-secondary"
                onClick={loadTables}
                disabled={isLoadingTables}
              >
                {isLoadingTables ? (
                  <Loader size={14} className="spinning" />
                ) : (
                  <RefreshCw size={14} />
                )}
              </button>
            </div>
            <div className="panel-content">
              {tables.length === 0 ? (
                <div className="no-tables">
                  <p>No tables found</p>
                  <p className="hint">Create tables using CREATE TABLE statements</p>
                </div>
              ) : (
                <div className="tables-list">
                  {tables.map((table) => (
                    <TableItem key={table.name} table={table} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="notebook-container">
        {cells.map((cell, index) => (
          <div key={cell.id} className="cell">
            <div className="cell-header">
              <div className="cell-number">
                [{index + 1}]
              </div>
              <div className="cell-controls">
                <button 
                  className="btn btn-small btn-primary"
                  onClick={() => executeCell(cell.id)}
                  disabled={cell.isExecuting || !cell.query.trim()}
                >
                  {cell.isExecuting ? (
                    <Loader size={14} className="spinning" />
                  ) : (
                    <Play size={14} />
                  )}
                  Run
                </button>
                <button 
                  className="btn btn-small btn-secondary"
                  onClick={() => toggleCellCollapse(cell.id)}
                >
                  {cell.isCollapsed ? (
                    <ChevronRight size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>
                <button 
                  className="btn btn-small btn-danger"
                  onClick={() => deleteCell(cell.id)}
                  disabled={cells.length <= 1}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className={`cell-content ${cell.isCollapsed ? 'collapsed' : ''}`}>
              <div className="cell-input">
                <MonacoEditor
                  height={cell.isCollapsed ? "0px" : "150px"}
                  language={config.EDITOR_LANGUAGE}
                  theme={config.EDITOR_THEME}
                  value={cell.query}
                  onChange={(value) => updateCellQuery(cell.id, value || '')}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                    tabSize: 2,
                    insertSpaces: true,
                    renderLineHighlight: 'line',
                    selectOnLineNumbers: true,
                    roundedSelection: false,
                    readOnly: false,
                    cursorStyle: 'line',
                    glyphMargin: false,
                    folding: true,
                    lineDecorationsWidth: 0,
                    lineNumbersMinChars: 3,
                    renderWhitespace: 'selection',
                    scrollbar: {
                      vertical: 'auto',
                      horizontal: 'auto',
                      verticalScrollbarSize: 8,
                      horizontalScrollbarSize: 8
                    }
                  }}
                />
              </div>

              {cell.result && (
                <div className="cell-output">
                  <div className="output-header">
                    <div className={`output-status ${cell.result.success ? 'success' : 'error'}`}>
                      {cell.result.success ? (
                        <CheckCircle size={16} className="success-icon" />
                      ) : (
                        <XCircle size={16} className="error-icon" />
                      )}
                      <span>{cell.result.success ? 'Success' : 'Error'}</span>
                    </div>
                    <div className="output-meta">
                      <Clock size={14} />
                      <span>{cell.result.time_ms.toFixed(2)}ms</span>
                      {cell.result.affected_rows !== null && (
                        <span className="affected-rows">
                          ({cell.result.affected_rows} rows)
                        </span>
                      )}
                    </div>
                  </div>

                  {cell.result.success && cell.result.result && cell.result.result.length > 0 ? (
                    <div className="result-table-container">
                      <ResultTable data={cell.result.result} columns={cell.result.columns} />
                    </div>
                  ) : cell.result.success ? (
                    <div className="result-message">
                      <p>{cell.result.message}</p>
                    </div>
                  ) : (
                    <div className="result-error">
                      <p><strong>Error:</strong> {cell.result.error || cell.result.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="add-cell-container">
          <button className="add-cell-btn" onClick={addCell}>
            <Plus size={16} />
            Add Cell
          </button>
        </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="help-modal">
          <div className="help-content">
            <div className="help-header">
              <h2>SQL Commands Reference</h2>
              <button 
                className="btn btn-small" 
                onClick={() => setShowHelp(false)}
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="help-body">
              <div className="help-section">
                <h3>Data Types</h3>
                <ul>
                  <li><code>INT</code> - Integer numbers</li>
                  <li><code>TEXT</code> - Text strings</li>
                  <li><code>FLOAT</code> - Floating-point numbers</li>
                  <li><code>BOOLEAN</code> - True/false values</li>
                </ul>
              </div>

              <div className="help-section">
                <h3>CREATE TABLE</h3>
                <div className="help-example">
                  <pre><code>{`CREATE TABLE users (
    id INT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    age INT
);`}</code></pre>
                </div>
                <p>Creates a new table with specified columns and constraints.</p>
              </div>

              <div className="help-section">
                <h3>INSERT INTO</h3>
                <div className="help-example">
                  <pre><code>{`INSERT INTO users VALUES (1, 'Alice', 'alice@example.com', 25);
INSERT INTO users (id, name, age) VALUES (2, 'Bob', 30);`}</code></pre>
                </div>
                <p>Inserts new rows into a table.</p>
              </div>

              <div className="help-section">
                <h3>SELECT</h3>
                <div className="help-example">
                  <pre><code>{`SELECT * FROM users;
SELECT name, age FROM users WHERE age > 25;
SELECT COUNT(*) as total FROM users;
SELECT u.name, o.amount 
FROM users u 
JOIN orders o ON u.id = o.user_id;`}</code></pre>
                </div>
                <p>Retrieves data from tables. Supports WHERE, JOIN, GROUP BY, ORDER BY, and aggregate functions.</p>
              </div>

              <div className="help-section">
                <h3>UPDATE</h3>
                <div className="help-example">
                  <pre><code>{`UPDATE users SET age = 26 WHERE id = 1;
UPDATE users SET name = 'Alice Updated' WHERE age > 25;`}</code></pre>
                </div>
                <p>Modifies existing rows in a table.</p>
              </div>

              <div className="help-section">
                <h3>DELETE</h3>
                <div className="help-example">
                  <pre><code>{`DELETE FROM users WHERE age < 18;
DELETE FROM users WHERE id = 1;`}</code></pre>
                </div>
                <p>Removes rows from a table.</p>
              </div>

              <div className="help-section">
                <h3>DROP TABLE</h3>
                <div className="help-example">
                  <pre><code>{`DROP TABLE users;`}</code></pre>
                </div>
                <p>Removes a table completely from the database.</p>
              </div>

              <div className="help-section">
                <h3>Advanced Features</h3>
                <ul>
                  <li><strong>Foreign Keys:</strong> <code>customer_id INT REFERENCES customers(id)</code></li>
                  <li><strong>JOINs:</strong> INNER, LEFT, RIGHT, FULL OUTER JOIN</li>
                  <li><strong>Aggregates:</strong> COUNT, SUM, AVG, MAX, MIN</li>
                  <li><strong>Column Aliases:</strong> <code>SELECT name AS user_name FROM users</code></li>
                  <li><strong>Table Aliases:</strong> <code>SELECT u.name FROM users u</code></li>
                  <li><strong>WHERE Conditions:</strong> <code>=, !=, &lt;, &gt;, &lt;=, &gt;=, BETWEEN, AND, OR</code></li>
                </ul>
              </div>

              <div className="help-section">
                <h3>Notebook Features</h3>
                <ul>
                  <li><strong>Run Cell:</strong> Execute individual cell with Run button</li>
                  <li><strong>Run All:</strong> Execute all cells in sequence</li>
                  <li><strong>Add Cell:</strong> Create new cells for different queries</li>
                  <li><strong>Collapse:</strong> Hide/show cell content</li>
                  <li><strong>Delete:</strong> Remove unwanted cells</li>
                </ul>
              </div>

              <div className="help-section">
                <h3>Keyboard Shortcuts</h3>
                <ul>
                  <li><kbd>Ctrl+Enter</kbd> (or <kbd>Cmd+Enter</kbd> on Mac) - Execute query</li>
                  <li><kbd>Ctrl+/</kbd> - Toggle comment</li>
                  <li><kbd>Ctrl+Z</kbd> - Undo</li>
                  <li><kbd>Ctrl+Y</kbd> - Redo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Result Table Component
interface ResultTableProps {
  data: any[];
  columns: string[] | null;
}

const ResultTable: React.FC<ResultTableProps> = ({ data, columns }) => {
  if (!data || data.length === 0) {
    return <div className="no-data">No data to display</div>;
  }

  const tableColumns = columns || Object.keys(data[0] || {});

  return (
    <div className="table-container">
      <table className="result-table">
        <thead>
          <tr>
            {tableColumns.map((col, index) => (
              <th key={index}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {tableColumns.map((col, colIndex) => (
                <td key={colIndex}>{String(row[col] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Table Item Component
interface TableItemProps {
  table: TableInfo;
}

const TableItem: React.FC<TableItemProps> = ({ table }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className="table-item">
      <div className="table-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="table-name">
          <Table size={14} />
          <span>{table.name}</span>
          <span className="row-count">({table.row_count} rows)</span>
        </div>
        <div className="table-toggle">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="table-schema">
          <div className="schema-section">
            <h4>Columns</h4>
            <div className="columns-list">
              {table.columns.map((column, index) => (
                <div key={index} className="column-item">
                  <div className="column-info">
                    <span className="column-name">{column.name}</span>
                    <span className="column-type">{column.type}</span>
                    {column.primary_key && (
                      <Key size={12} className="primary-key-icon" />
                    )}
                    {!column.nullable && (
                      <span className="not-null">NOT NULL</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {table.foreign_keys && table.foreign_keys.length > 0 && (
            <div className="schema-section">
              <h4>Foreign Keys</h4>
              <div className="foreign-keys-list">
                {table.foreign_keys.map((fk, index) => (
                  <div key={index} className="foreign-key-item">
                    <span className="fk-column">{fk.column}</span>
                    <span className="fk-arrow">→</span>
                    <span className="fk-reference">{fk.references_table}.{fk.references_column}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;