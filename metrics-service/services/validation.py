from fastapi import Header, HTTPException, status
import os

API_KEY = os.getenv("API_KEY")
API_KEY_NAME = "X-API-KEY"
DEV_API_KEY = "DEV"

def get_api_key(x_api_key: str = Header(...)):
    # If no API_KEY is configured, accept the DEV key
    if API_KEY is None:
        if x_api_key != DEV_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API Key. Use 'DEV' for development."
            )
    # If API_KEY is configured, it must match exactly
    elif x_api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key"
        )
    return x_api_key