import os
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def s3_upload(local_path: str, key: str = "",
              endpoint: str = "", bucket: str = "",
              access_key: str = "", secret_key: str = "",
              region: str = "") -> bool:
    try:
        import boto3
        client = boto3.client(
            "s3",
            endpoint_url=endpoint or None,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region or "us-east-1",
        )
        if not key:
            key = os.path.basename(local_path)
        client.upload_file(local_path, bucket, key)
        return True
    except Exception as e:
        logger.error("S3 upload error: %s", e)
        return False


def s3_list(bucket: str = "", prefix: str = "",
            endpoint: str = "", access_key: str = "",
            secret_key: str = "", region: str = "") -> list[dict]:
    try:
        import boto3
        client = boto3.client(
            "s3",
            endpoint_url=endpoint or None,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region or "us-east-1",
        )
        resp = client.list_objects_v2(Bucket=bucket, Prefix=prefix)
        files = []
        for obj in resp.get("Contents", []):
            files.append({
                "key": obj["Key"],
                "size_kb": round(obj["Size"] / 1024, 1),
                "last_modified": obj["LastModified"].isoformat(),
            })
        return sorted(files, key=lambda x: x["last_modified"], reverse=True)
    except Exception:
        return []


def s3_download(key: str, local_path: str,
                endpoint: str = "", bucket: str = "",
                access_key: str = "", secret_key: str = "",
                region: str = "") -> bool:
    try:
        import boto3
        client = boto3.client(
            "s3",
            endpoint_url=endpoint or None,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region or "us-east-1",
        )
        client.download_file(bucket, key, local_path)
        return True
    except (OSError, Exception):
        return False


def s3_delete(key: str, bucket: str = "",
              endpoint: str = "", access_key: str = "",
              secret_key: str = "", region: str = "") -> bool:
    try:
        import boto3
        client = boto3.client(
            "s3",
            endpoint_url=endpoint or None,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region or "us-east-1",
        )
        client.delete_object(Bucket=bucket, Key=key)
        return True
    except Exception:
        return False


# ── Google Drive ──

def gdrive_upload(local_path: str, access_token: str = "",
                  folder_id: str = "") -> bool:
    try:
        import requests
        file_name = os.path.basename(local_path)
        with open(local_path, "rb") as f:
            headers = {"Authorization": f"Bearer {access_token}"}
            metadata = {"name": file_name}
            if folder_id:
                metadata["parents"] = [folder_id]

            # Multipart upload
            files = {
                "metadata": ("metadata", json_dumps(metadata), "application/json"),
                "file": (file_name, f),
            }
            r = requests.post(
                "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
                headers=headers, files=files, timeout=30
            )
            return r.ok
    except Exception:
        return False


def gdrive_list(access_token: str = "", folder_id: str = "") -> list[dict]:
    try:
        import requests
        query = f"'{folder_id}' in parents and trashed=false" if folder_id else "trashed=false"
        r = requests.get(
            "https://www.googleapis.com/drive/v3/files",
            params={"q": query, "orderBy": "createdTime desc", "pageSize": 50},
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        if not r.ok:
            return []
        data = r.json()
        return [
            {
                "key": f["id"],
                "name": f["name"],
                "size_kb": round(int(f.get("size", 0)) / 1024, 1) if f.get("size") else 0,
                "last_modified": f.get("modifiedTime", ""),
            }
            for f in data.get("files", [])
        ]
    except Exception:
        return []


def gdrive_download(file_id: str, local_path: str, access_token: str = "") -> bool:
    try:
        import requests
        r = requests.get(
            f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30
        )
        if r.ok:
            with open(local_path, "wb") as f:
                f.write(r.content)
            return True
        return False
    except Exception:
        return False


def gdrive_delete(file_id: str, access_token: str = "") -> bool:
    try:
        import requests
        r = requests.delete(
            f"https://www.googleapis.com/drive/v3/files/{file_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        return r.ok
    except Exception:
        return False


def json_dumps(d: dict) -> str:
    import json
    return json.dumps(d)
