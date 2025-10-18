from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..schemas import TableInfo, TablesResponse
from ..engine.storage import StorageManager
import os

router = APIRouter()

@router.get("/tables", response_model=TablesResponse)
async def get_tables():
    """Get all tables and their schemas."""
    try:
        storage = StorageManager()
        
        # Get all tables from schema
        tables = []
        schema_file = os.path.join(storage.db_path, "schema.json")
        
        if os.path.exists(schema_file):
            import json
            with open(schema_file, 'r') as f:
                schema_data = json.load(f)
                
            for table_name, table_info in schema_data.items():
                table_info_obj = TableInfo(
                    name=table_name,
                    columns=table_info.get('columns', []),
                    primary_key=table_info.get('primary_key'),
                    foreign_keys=table_info.get('foreign_keys', []),
                    row_count=0  # We'll calculate this
                )
                
                # Get row count
                data_file = os.path.join(storage.db_path, f"{table_name}.json")
                if os.path.exists(data_file):
                    try:
                        with open(data_file, 'r') as f:
                            data = json.load(f)
                            table_info_obj.row_count = len(data) if isinstance(data, list) else 0
                    except:
                        table_info_obj.row_count = 0
                
                tables.append(table_info_obj)
        
        return TablesResponse(
            success=True,
            tables=tables,
            total=len(tables)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get tables: {str(e)}"
        )
