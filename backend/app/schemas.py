"""
Pydantic models for request and response schemas.
"""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, validator
import time


class ExecuteRequest(BaseModel):
    """Request model for SQL execution."""
    
    query: str = Field(..., min_length=1, max_length=10000, description="SQL query to execute")
    session_id: Optional[str] = Field(None, description="Optional session ID for query history")
    
    @validator('query')
    def validate_query(cls, v):
        """Validate SQL query."""
        if not v.strip():
            raise ValueError("Query cannot be empty")
        return v.strip()


class ExecuteResponse(BaseModel):
    """Response model for SQL execution."""
    
    success: bool = Field(..., description="Whether the query executed successfully")
    result: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = Field(None, description="Query results")
    columns: Optional[List[str]] = Field(None, description="Column names for SELECT queries")
    time_ms: float = Field(..., description="Execution time in milliseconds")
    message: Optional[str] = Field(None, description="Success or error message")
    error: Optional[str] = Field(None, description="Error message if query failed")
    affected_rows: Optional[int] = Field(None, description="Number of affected rows for DML operations")


class HistoryRequest(BaseModel):
    """Request model for query history."""
    
    session_id: str = Field(..., description="Session ID to retrieve history for")
    limit: Optional[int] = Field(10, ge=1, le=100, description="Maximum number of queries to return")


class QueryHistory(BaseModel):
    """Model for a single query in history."""
    
    query: str = Field(..., description="The SQL query")
    timestamp: float = Field(..., description="Query execution timestamp")
    success: bool = Field(..., description="Whether the query succeeded")
    time_ms: float = Field(..., description="Execution time in milliseconds")
    affected_rows: Optional[int] = Field(None, description="Number of affected rows")


class HistoryResponse(BaseModel):
    """Response model for query history."""
    
    session_id: str = Field(..., description="Session ID")
    queries: List[QueryHistory] = Field(..., description="List of executed queries")
    total: int = Field(..., description="Total number of queries in history")


class ErrorResponse(BaseModel):
    """Error response model."""
    
    success: bool = Field(False, description="Always false for errors")
    error: str = Field(..., description="Error message")
    error_type: Optional[str] = Field(None, description="Type of error")
    timestamp: float = Field(default_factory=time.time, description="Error timestamp")


class HealthResponse(BaseModel):
    """Health check response model."""
    
    status: str = Field(..., description="Health status")
    timestamp: float = Field(default_factory=time.time, description="Check timestamp")
    version: str = Field("1.0.0", description="API version")


class TableInfo(BaseModel):
    """Table information model."""
    
    name: str = Field(..., description="Table name")
    columns: List[Dict[str, Any]] = Field(..., description="Table columns")
    primary_key: Optional[str] = Field(None, description="Primary key column")
    foreign_keys: List[Dict[str, Any]] = Field(default_factory=list, description="Foreign key constraints")
    row_count: int = Field(..., description="Number of rows in table")


class TablesResponse(BaseModel):
    """Response model for tables list."""
    
    success: bool = Field(..., description="Whether the request succeeded")
    tables: List[TableInfo] = Field(..., description="List of tables")
    total: int = Field(..., description="Total number of tables")


class DatabaseInfo(BaseModel):
    """Database information model."""
    
    tables: List[TableInfo] = Field(..., description="List of tables")
    total_tables: int = Field(..., description="Total number of tables")
