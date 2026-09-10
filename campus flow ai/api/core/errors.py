from typing import Any


class AppError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


class ProviderUnavailableError(AppError):
    def __init__(self) -> None:
        super().__init__(503, "AI_PROVIDER_UNAVAILABLE", "The AI service is temporarily unavailable.")


class DataIntegrationError(AppError):
    def __init__(self, message: str = "Academic data integration is not available.") -> None:
        super().__init__(503, "ACADEMIC_DATA_UNAVAILABLE", message)
