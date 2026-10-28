import mysql.connector
from getpass import getpass

print("MySQL connection test started")
password = getpass("Enter MySQL password: ")

try:
    conn = mysql.connector.connect(
        host="127.0.0.1",
        port=3306,
        user="root",
        password=password,
        database="ai_bharat_mentor"
    )
    print("SUCCESS: MySQL connected!")
    cursor = conn.cursor()
    cursor.execute("SELECT DATABASE()")
    print("Database:", cursor.fetchone()[0])
    cursor.close()
    conn.close()
except mysql.connector.Error as e:
    print("MySQL error:", e)
