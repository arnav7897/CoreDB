"""
API endpoints for SQL execution.
"""

import time
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from ..schemas import ExecuteRequest, ExecuteResponse, HistoryRequest, HistoryResponse, ErrorResponse
from ..engine.executor import QueryExecutor
from ..engine.storage import StorageManager
from ..engine.indexed_storage import IndexedStorageManager
from ..config import settings

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Global storage manager instance (switchable)
if settings.STORAGE_MODE.lower() == "indexed":
    storage_manager = IndexedStorageManager(settings.DB_PATH)
else:
    storage_manager = StorageManager(settings.DB_PATH)
query_executor = QueryExecutor(storage_manager)

# In-memory session storage for query history
session_history: Dict[str, List[Dict[str, Any]]] = {}


def get_executor() -> QueryExecutor:
    """Dependency to get query executor."""
    return query_executor


def get_storage() -> StorageManager:
    """Dependency to get storage manager."""
    return storage_manager


@router.post("/execute", response_model=ExecuteResponse)
async def execute_sql(
    request: ExecuteRequest,
    executor: QueryExecutor = Depends(get_executor)
) -> ExecuteResponse:
    """
    Execute a SQL query and return results.
    
    Args:
        request: SQL execution request
        executor: Query executor dependency
        
    Returns:
        ExecuteResponse with query results or error information
    """
    start_time = time.time()
    
    try:
        logger.info(f"Executing SQL query: {request.query[:100]}...")
        
        # Execute the query
        result = executor.execute_raw_sql(request.query)
        
        # Calculate execution time
        execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Store query in history if session_id provided
        if request.session_id:
            query_record = {
                "query": request.query,
                "timestamp": time.time(),
                "success": result.success,
                "time_ms": execution_time,
                "affected_rows": result.affected_rows
            }
            
            if request.session_id not in session_history:
                session_history[request.session_id] = []
            
            session_history[request.session_id].append(query_record)
            
            # Keep only the last N queries
            if len(session_history[request.session_id]) > settings.MAX_QUERY_HISTORY:
                session_history[request.session_id] = session_history[request.session_id][-settings.MAX_QUERY_HISTORY:]
        
        # Prepare response
        if result.success:
            response = ExecuteResponse(
                success=True,
                result=result.data,
                columns=result.columns if hasattr(result, 'columns') else None,
                time_ms=execution_time,
                message=result.message,
                affected_rows=result.affected_rows
            )
            
            logger.info(f"Query executed successfully in {execution_time:.2f}ms")
            return response
        else:
            response = ExecuteResponse(
                success=False,
                result=None,
                columns=None,
                time_ms=execution_time,
                message=result.message,
                error=result.message,
                affected_rows=0
            )
            
            logger.warning(f"Query failed: {result.message}")
            return response
            
    except Exception as e:
        execution_time = (time.time() - start_time) * 1000
        error_msg = str(e)
        
        logger.error(f"Query execution error: {error_msg}", exc_info=True)
        
        # Store failed query in history if session_id provided
        if request.session_id:
            query_record = {
                "query": request.query,
                "timestamp": time.time(),
                "success": False,
                "time_ms": execution_time,
                "affected_rows": 0
            }
            
            if request.session_id not in session_history:
                session_history[request.session_id] = []
            
            session_history[request.session_id].append(query_record)
        
        return ExecuteResponse(
            success=False,
            result=None,
            columns=None,
            time_ms=execution_time,
            message=f"Query execution failed: {error_msg}",
            error=error_msg,
            affected_rows=0
        )


@router.get("/history", response_model=HistoryResponse)
async def get_query_history(
    session_id: str,
    limit: int = 10
) -> HistoryResponse:
    """
    Get query history for a session.
    
    Args:
        session_id: Session ID to retrieve history for
        limit: Maximum number of queries to return
        
    Returns:
        HistoryResponse with query history
    """
    try:
        if session_id not in session_history:
            return HistoryResponse(
                session_id=session_id,
                queries=[],
                total=0
            )
        
        # Get the last N queries
        queries = session_history[session_id][-limit:]
        
        return HistoryResponse(
            session_id=session_id,
            queries=queries,
            total=len(session_history[session_id])
        )
        
    except Exception as e:
        logger.error(f"Error retrieving query history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve query history")


@router.post("/reset")
async def reset_database(
    storage: StorageManager = Depends(get_storage)
) -> Dict[str, Any]:
    """
    Reset the database (for testing purposes).
    
    Args:
        storage: Storage manager dependency
        
    Returns:
        Success message
    """
    try:
        # Clear all tables
        table_names = storage.get_table_names()
        for table_name in table_names:
            storage.drop_table(table_name)
        
        # Clear session history
        session_history.clear()
        
        logger.info("Database reset successfully")
        
        return {
            "success": True,
            "message": "Database reset successfully",
            "tables_dropped": len(table_names)
        }
        
    except Exception as e:
        logger.error(f"Error resetting database: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to reset database")


@router.get("/tables")
async def get_tables(
    storage: StorageManager = Depends(get_storage)
) -> Dict[str, Any]:
    """
    Get information about all tables in the database.
    
    Args:
        storage: Storage manager dependency
        
    Returns:
        Table information
    """
    try:
        table_names = storage.get_table_names()
        tables_info = []
        
        for table_name in table_names:
            table = storage.get_table(table_name)
            if table:
                tables_info.append({
                    "name": table_name,
                    "columns": [
                        {
                            "name": col.name,
                            "type": col.data_type.value,
                            "nullable": col.nullable,
                            "primary_key": col.primary_key,
                            "foreign_key": col.foreign_key.__dict__ if col.foreign_key else None
                        }
                        for col in table.columns
                    ],
                    "row_count": len(table.data)
                })
        
        return {
            "success": True,
            "tables": tables_info,
            "total_tables": len(tables_info)
        }
        
    except Exception as e:
        logger.error(f"Error retrieving table information: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve table information")
