"""
Chat API endpoint for SQL learning assistant.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List
import time

router = APIRouter()


class ChatRequest(BaseModel):
    """Request model for chat message."""
    message: str = Field(..., min_length=1, max_length=1000)
    session_id: str = Field(..., description="Session ID for conversation context")


class ChatResponse(BaseModel):
    """Response model for chat message."""
    response: str = Field(..., description="Bot's response")
    timestamp: float = Field(default_factory=time.time)


# SQL Learning Knowledge Base
SQL_KNOWLEDGE = {
    "primary key": """A PRIMARY KEY is a column (or combination of columns) that uniquely identifies each row in a table. 

Key points:
• Must contain unique values
• Cannot contain NULL values
• Each table can have only ONE primary key
• Often used with AUTO_INCREMENT to generate unique IDs

Example:
CREATE TABLE users (
    id INT PRIMARY KEY,
    name TEXT,
    email TEXT
);""",
    
    "foreign key": """A FOREIGN KEY is a column that creates a relationship between two tables by referencing the PRIMARY KEY of another table.

Key points:
• Ensures referential integrity
• Links tables together
• Prevents orphaned records
• Can have multiple foreign keys in a table

Example:
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    amount FLOAT
);""",
    
    "join": """JOIN operations combine rows from two or more tables based on a related column.

Types of JOINs:
• INNER JOIN: Returns matching rows from both tables
• LEFT JOIN: Returns all rows from left table, matching rows from right
• RIGHT JOIN: Returns all rows from right table, matching rows from left
• FULL OUTER JOIN: Returns all rows from both tables

Example:
SELECT u.name, o.amount
FROM users u
INNER JOIN orders o ON u.id = o.user_id;""",
    
    "select": """SELECT statement retrieves data from tables.

Basic syntax:
SELECT column1, column2 FROM table_name;

Advanced features:
• WHERE: Filter rows
• ORDER BY: Sort results
• GROUP BY: Group rows
• LIMIT: Limit number of results
• DISTINCT: Remove duplicates

Example:
SELECT name, age 
FROM users 
WHERE age > 18 
ORDER BY name 
LIMIT 10;""",
    
    "insert": """INSERT INTO adds new rows to a table.

Syntax:
INSERT INTO table_name (col1, col2) VALUES (val1, val2);

You can:
• Insert specific columns
• Insert multiple rows at once
• Insert all columns without specifying names

Example:
INSERT INTO users (id, name, email) 
VALUES (1, 'Alice', 'alice@example.com');""",
    
    "update": """UPDATE modifies existing rows in a table.

Syntax:
UPDATE table_name SET col1 = val1 WHERE condition;

Important:
• Always use WHERE clause to specify which rows to update
• Without WHERE, ALL rows will be updated!

Example:
UPDATE users 
SET email = 'newemail@example.com' 
WHERE id = 1;""",
    
    "delete": """DELETE removes rows from a table.

Syntax:
DELETE FROM table_name WHERE condition;

Important:
• Always use WHERE clause to specify which rows to delete
• Without WHERE, ALL rows will be deleted!

Example:
DELETE FROM users WHERE id = 1;""",
    
    "create table": """CREATE TABLE creates a new table with specified columns and constraints.

Syntax:
CREATE TABLE table_name (
    column1 type constraints,
    column2 type constraints
);

Common constraints:
• PRIMARY KEY
• NOT NULL
• REFERENCES (foreign key)

Example:
CREATE TABLE users (
    id INT PRIMARY KEY,
    name TEXT NOT NULL,
    age INT
);""",
    
    "where": """WHERE clause filters rows based on conditions.

Operators:
• = (equal)
• != (not equal)
• < > <= >= (comparisons)
• BETWEEN (range)
• AND, OR (logical operators)

Example:
SELECT * FROM users 
WHERE age >= 18 AND age <= 65;""",
    
    "group by": """GROUP BY groups rows that have the same values in specified columns, often used with aggregate functions.

Common with:
• COUNT()
• SUM()
• AVG()
• MAX()
• MIN()

Example:
SELECT department, COUNT(*) as total
FROM employees
GROUP BY department;""",
    
    "order by": """ORDER BY sorts the result set.

Syntax:
ORDER BY column1 [ASC|DESC], column2 [ASC|DESC];

• ASC: Ascending (default)
• DESC: Descending

Example:
SELECT name, age 
FROM users 
ORDER BY age DESC, name ASC;""",
}


def get_sql_response(message: str) -> str:
    """Generate response based on user message."""
    message_lower = message.lower().strip()
    
    # Check for greetings
    greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon']
    if any(greeting in message_lower for greeting in greetings):
        return "Hello! 👋 I'm your SQL learning assistant. I can help you with:\n\n• SQL commands (SELECT, INSERT, UPDATE, DELETE)\n• Database concepts (PRIMARY KEY, FOREIGN KEY)\n• JOINs and relationships\n• Query optimization\n• And much more!\n\nWhat would you like to learn about?"
    
    # Check knowledge base
    for topic, response in SQL_KNOWLEDGE.items():
        if topic in message_lower:
            return response
    
    # Check for specific keywords
    if 'what is' in message_lower or 'explain' in message_lower or 'how' in message_lower:
        if 'table' in message_lower:
            return SQL_KNOWLEDGE['create table']
        elif 'filter' in message_lower or 'condition' in message_lower:
            return SQL_KNOWLEDGE['where']
        elif 'sort' in message_lower:
            return SQL_KNOWLEDGE['order by']
        elif 'aggregate' in message_lower or 'count' in message_lower or 'sum' in message_lower:
            return SQL_KNOWLEDGE['group by']
    
    # Check for commands
    if 'create' in message_lower:
        return SQL_KNOWLEDGE['create table']
    elif 'select' in message_lower or 'query' in message_lower or 'retrieve' in message_lower:
        return SQL_KNOWLEDGE['select']
    elif 'insert' in message_lower or 'add' in message_lower:
        return SQL_KNOWLEDGE['insert']
    elif 'update' in message_lower or 'modify' in message_lower:
        return SQL_KNOWLEDGE['update']
    elif 'delete' in message_lower or 'remove' in message_lower:
        return SQL_KNOWLEDGE['delete']
    
    # Default response with suggestions
    return """I'm not sure about that specific question, but I can help you with:

📚 **SQL Basics:**
• CREATE TABLE - Creating new tables
• INSERT - Adding data
• SELECT - Retrieving data
• UPDATE - Modifying data
• DELETE - Removing data

🔗 **Advanced Topics:**
• PRIMARY KEY & FOREIGN KEY
• JOINs (INNER, LEFT, RIGHT)
• WHERE clauses
• GROUP BY & Aggregates
• ORDER BY sorting

Try asking something like:
• "What is a PRIMARY KEY?"
• "How do I use JOIN?"
• "Explain SELECT statement"

What would you like to know?"""


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Handle chat messages from users."""
    try:
        # Generate response
        response_text = get_sql_response(request.message)
        
        return ChatResponse(
            response=response_text,
            timestamp=time.time()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat message: {str(e)}"
        )

