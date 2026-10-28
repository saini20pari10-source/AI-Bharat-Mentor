from pathlib import Path
import os
import pymysql
from dotenv import load_dotenv

HERE = Path(__file__).parent
ENV = HERE / ".env"

print("Diagnostic started")
print(".env file exists:", ENV.exists())

load_dotenv(ENV, override=True)

host = os.getenv("MYSQL_HOST", "localhost")
port = int(os.getenv("MYSQL_PORT", "3306"))
user = os.getenv("MYSQL_USER", "root")
password = os.getenv("MYSQL_PASSWORD", "")
database = os.getenv("MYSQL_DB", "ai_bharat_mentor")

print("Host:", host)
print("Port:", port)
print("User:", user)
print("Database:", database)
print("Password configured:", bool(password))
print("Password length:", len(password))

try:
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        connect_timeout=5
    )
    print("SUCCESS: MySQL login works")
    conn.close()
except Exception as e:
    print("MySQL login failed:", e)
