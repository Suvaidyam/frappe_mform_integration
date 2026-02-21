from typing import Any, Dict, Optional

import requests


class Client:
	def __init__(
		self,
		base_url: str,
		headers: Optional[Dict[str, str]] = None,
		params: Optional[Dict[str, Any]] = None,
		timeout: int = 30,
	):
		self.base_url = base_url.rstrip("/")
		self.headers = headers or {}
		self.timeout = timeout

	def _request(
		self,
		method: str,
		endpoint: str,
		params: Optional[Dict[str, Any]] = None,
		data: Optional[Dict[str, Any]] = None,
		json: Optional[Dict[str, Any]] = None,
		headers: Optional[Dict[str, str]] = None,
	):
		url = f"{self.base_url}/{endpoint.lstrip('/')}"
		final_headers = {**self.headers, **(headers or {})}

		try:
			print("------------_request_--------------------\n\n")
			print("URL:", url)
			print("PARAMS:", params)
			print("DATA:", data)
			print("JSON:", json)
			print("HEADERS:", final_headers)
			print("METHOD:", method.upper())
			print("TIMEOUT:", self.timeout)
			print("--------------------------------\n\n")
			response = requests.request(
				method=method.upper(),
				url=url,
				params=params,
				data=data,
				json=json,
				headers=final_headers,
				timeout=self.timeout,
			)
			response.raise_for_status()
			return response.json() if response.content else None

		except requests.exceptions.HTTPError as e:
			raise Exception(f"HTTP {response.status_code} Error: {response.text}") from e
		except requests.exceptions.RequestException as e:
			raise Exception("External API request failed") from e

	def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None, headers=None):
		return self._request("GET", endpoint, params=params, headers=headers)

	def post(
		self,
		endpoint: str,
		params: Optional[Dict[str, Any]] = None,
		json: Optional[Dict[str, Any]] = None,
		data=None,
		headers=None,
	):
		return self._request("POST", endpoint, params=params, json=json, data=data, headers=headers)

	def put(
		self,
		endpoint: str,
		params: Optional[Dict[str, Any]] = None,
		json: Optional[Dict[str, Any]] = None,
		headers=None,
	):
		return self._request("PUT", endpoint, params=params, json=json, headers=headers)

	def delete(self, endpoint: str, params: Optional[Dict[str, Any]] = None, headers=None):
		return self._request("DELETE", endpoint, params=params, headers=headers)
