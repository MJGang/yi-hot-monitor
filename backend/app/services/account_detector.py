"""
账号检测服务

检测关键词是否为平台账号（B站、微博等）
"""
import re
from typing import Optional


def detect_account_type(keyword: str) -> dict:
    """
    检测关键词是否为平台账号

    Args:
        keyword: 关键词

    Returns:
        {"is_account": bool, "platform": str | None, "account_id": str | None}
    """
    # B站账号检测 (uid:开头 或 BV号)
    if keyword.startswith("uid:"):
        return {"is_account": True, "platform": "bilibili", "account_id": keyword}

    # 微博账号检测 (@开头)
    if keyword.startswith("@"):
        return {"is_account": True, "platform": "weibo", "account_id": keyword}

    # B站 BV号检测
    if re.match(r'^BV[A-Za-z0-9]{10}$', keyword):
        return {"is_account": True, "platform": "bilibili", "account_id": keyword}

    # B站 AV号检测
    if re.match(r'^av\d+$', keyword, re.IGNORECASE):
        return {"is_account": True, "platform": "bilibili", "account_id": keyword}

    return {"is_account": False, "platform": None, "account_id": None}
