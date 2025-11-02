"""
Indexed storage manager built on top of JSON storage.

Adds simple on-disk index files for fast lookups by primary key or
explicitly indexed columns. Indexes are JSON files that map a column
value to a list of primary key values. For simplicity and stability,
we only maintain indexes on tables that have a primary key defined.

Data remains stored in JSON (same as base StorageManager). Indexes are
stored under: {db_path}/indexes/{table_name}/{column_name}.json
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from .storage import StorageManager
from .types import Table, Column
from .exceptions import StorageError, TableNotFoundError, ColumnNotFoundError


class IndexedStorageManager(StorageManager):
    def __init__(self, db_path: str = "coredb_data"):
        super().__init__(db_path)
        self.index_root = Path(self.db_path) / "indexes"
        self.index_root.mkdir(parents=True, exist_ok=True)

    # ---------- Index file helpers ----------
    def _index_dir(self, table_name: str) -> Path:
        d = self.index_root / table_name
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _index_file(self, table_name: str, column_name: str) -> Path:
        return self._index_dir(table_name) / f"{column_name}.json"

    def _load_index(self, table_name: str, column_name: str) -> Dict[str, List[Any]]:
        p = self._index_file(table_name, column_name)
        if not p.exists():
            return {}
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            raise StorageError(f"Failed to load index {table_name}.{column_name}: {e}")

    def _save_index(self, table_name: str, column_name: str, index: Dict[str, List[Any]]) -> None:
        p = self._index_file(table_name, column_name)
        try:
            with open(p, "w", encoding="utf-8") as f:
                json.dump(index, f, indent=2, ensure_ascii=False)
        except OSError as e:
            raise StorageError(f"Failed to save index {table_name}.{column_name}: {e}")

    def _rebuild_index(self, table: Table, column_name: str) -> None:
        col = table.get_column(column_name)
        if not col:
            raise ColumnNotFoundError(column_name, table.name)

        # Require a primary key for stable row identity
        pk_col = next((c for c in table.columns if c.primary_key), None)
        if not pk_col:
            # No primary key -> skip indexing to keep it simple
            return

        index: Dict[str, List[Any]] = {}
        for row in table.data:
            key_val = row.get(column_name)
            pk_val = row.get(pk_col.name)
            if key_val is None or pk_val is None:
                continue
            key_str = str(key_val)
            index.setdefault(key_str, []).append(pk_val)

        self._save_index(table.name, column_name, index)

    def _ensure_pk_index(self, table: Table) -> None:
        pk_col = next((c for c in table.columns if c.primary_key), None)
        if not pk_col:
            return
        # Build/refresh PK index on table creation or when needed
        self._rebuild_index(table, pk_col.name)

    # ---------- Overrides with index maintenance ----------
    def create_table(self, table: Table) -> None:
        super().create_table(table)
        # Load to attach data
        t = self.get_table(table.name)
        if t:
            self._ensure_pk_index(t)

    def drop_table(self, table_name: str) -> bool:
        # Remove indexes
        idx_dir = self._index_dir(table_name)
        # It exists even if table doesn't; we'll clean after super
        res = super().drop_table(table_name)
        try:
            if idx_dir.exists():
                for p in idx_dir.glob("*.json"):
                    p.unlink()
                # Attempt to remove dir if empty
                idx_dir.rmdir()
        except OSError:
            pass
        return res

    def insert_data(self, table_name: str, rows: List[Dict[str, Any]]) -> int:
        # Insert first using base logic
        count = super().insert_data(table_name, rows)
        # Refresh PK index
        table = self.get_table(table_name)
        if table:
            pk_col = next((c for c in table.columns if c.primary_key), None)
            if pk_col:
                self._rebuild_index(table, pk_col.name)
        return count

    def update_data(self, table_name: str, set_clause: Dict[str, Any], where_clause: Optional[Any] = None) -> int:
        # Run base update
        updated = super().update_data(table_name, set_clause, where_clause)
        # Refresh PK index because PK values or row distribution may have changed
        table = self.get_table(table_name)
        if table:
            pk_col = next((c for c in table.columns if c.primary_key), None)
            if pk_col:
                self._rebuild_index(table, pk_col.name)
        return updated

    def delete_data(self, table_name: str, where_clause: Optional[Any] = None) -> int:
        deleted = super().delete_data(table_name, where_clause)
        table = self.get_table(table_name)
        if table:
            pk_col = next((c for c in table.columns if c.primary_key), None)
            if pk_col:
                self._rebuild_index(table, pk_col.name)
        return deleted

    # ---------- Indexed selection (simple equality on indexed column) ----------
    def select_data(self, table_name: str, columns: Optional[List[str]] = None, where_clause: Optional[Any] = None) -> List[Dict[str, Any]]:
        table = self.get_table(table_name)
        if not table:
            raise TableNotFoundError(table_name)

        # Attempt indexed filter for simple equality (column = value)
        pk_col = next((c for c in table.columns if c.primary_key), None)
        if where_clause and pk_col:
            try:
                from .parser import WhereClause, Condition
            except Exception:
                where_clause = None

            if where_clause is not None and getattr(where_clause, 'conditions', None):
                # Support only single condition equality for now
                if len(where_clause.conditions) == 1 and not where_clause.operators:
                    cond = where_clause.conditions[0]
                    if isinstance(cond, Condition) and cond.operator == '=':
                        # If the condition is on a valid column, try to use index
                        cond_col = cond.column
                        if table.get_column(cond_col):
                            # Rebuild (ensures index file exists) and load index
                            self._rebuild_index(table, cond_col)
                            index = self._load_index(table_name, cond_col)
                            key = str(cond.value)
                            pk_list = set(index.get(key, []))
                            if pk_list:
                                # Filter rows using PK set (fast membership)
                                rows = [r for r in table.data if r.get(pk_col.name) in pk_list]
                                if columns and '*' not in columns:
                                    for col_name in columns:
                                        if not table.get_column(col_name):
                                            raise ColumnNotFoundError(col_name, table_name)
                                    return [{c: r.get(c) for c in columns} for r in rows]
                                return rows

        # Fallback to base select
        return super().select_data(table_name, columns, where_clause)


