import os
import sys
import time

import pymysql


def wait_for_db() -> None:
    host = os.environ.get("DB_HOST", "localhost")
    user = os.environ.get("DB_USER")
    password = os.environ.get("DB_PASSWORD")
    db = os.environ.get("DB_NAME")
    port = int(os.environ.get("DB_PORT", 3306))

    for attempt in range(30):
        try:
            conn = pymysql.connect(
                host=host,
                user=user,
                password=password,
                database=db,
                port=port,
                connect_timeout=5,
            )
            conn.close()
            return
        except Exception as exc:  # noqa: BLE001
            print(
                f"Waiting for DB {host}:{port}... ({attempt + 1}/30) {exc}",
                flush=True,
            )
            time.sleep(2)

    sys.exit("DB not ready")


if __name__ == "__main__":
    wait_for_db()
